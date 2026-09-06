"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SlotMachine from "@/components/SlotMachine";
import { ErrorNote } from "@/components/ui";
import { ApiError, post, useReducedMotion } from "@/lib/client";
import { SYMBOLS, glyphsFor, type Roll } from "@/lib/slots";
import type { Machine } from "@/lib/types";
import type { Reward, SpinResult } from "@/lib/engine";

interface Props {
  kidId: string;
  machine: Machine;
  spins: number;
  meter: number;
  goal: number;
  coins: number;
  lifetime: number;
}

export default function SpinClient({ kidId, machine, spins: spins0, meter: meter0, goal: goal0, coins: coins0 }: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [spins, setSpins] = useState(spins0);
  const [meter, setMeter] = useState(meter0);
  const [goal, setGoal] = useState(goal0);
  const [coins, setCoins] = useState(coins0);
  const [err, setErr] = useState<string | null>(null);
  const [last, setLast] = useState<{ roll: Roll; res: SpinResult } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [jackpot, setJackpot] = useState<SpinResult["jackpot"]>(null);
  const [auto, setAuto] = useState(false);
  const [burst, setBurst] = useState(false);
  const pending = useRef<SpinResult | null>(null);
  const machineRef = useRef<{ pull: () => void } | null>(null);
  const [tick, setTick] = useState(0); // bumps to trigger the next auto spin

  async function onSpin(): Promise<Roll | null> {
    setErr(null);
    setBanner(null);
    setJackpot(null);
    try {
      const r = await post<SpinResult>("/api/spin", { kidId });
      pending.current = r;
      setSpins(r.spinsBank);
      return r.roll;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "The lever stuck. Try again.");
      setAuto(false);
      return null;
    }
  }

  function onSettled(roll: Roll) {
    const r = pending.current;
    if (!r) return;
    setLast({ roll, res: r });
    setCoins((c) => c + roll.coins + r.rewards.reduce((n, x) => n + x.coins, 0));
    setMeter(r.meterAfter);
    setGoal(r.goal);
    setRewards(r.rewards);
    if (r.jackpot) {
      setJackpot(r.jackpot);
      setAuto(false);
    }
    const glyph = glyphsFor(machine.theme)[roll.reels[0]];
    const label = SYMBOLS[roll.reels[0]].label;
    setBanner(
      roll.kind === "jackpot" ? `💎💎💎 GEM TRIPLE! +${roll.points} points`
        : roll.kind === "triple" ? `${glyph}${glyph}${glyph} Three ${label}! +${roll.points} points`
        : roll.kind === "pair" ? `Pair! +${roll.points} points`
        : `+${roll.points} points`,
    );
    if (roll.kind !== "none") {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }
    router.refresh();
    setTick((t) => t + 1);
  }

  // Auto spin: keep pulling while spins remain.
  useEffect(() => {
    if (!auto || spins <= 0 || jackpot) return;
    const t = setTimeout(() => machineRef.current?.pull(), reduced ? 400 : 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, tick, spins, jackpot]);

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-4">
      <div className="relative">
        {burst && !reduced && <Burst />}
        <MachineWithRef ref={machineRef} machine={machine} spins={spins} onSpin={onSpin} onSettled={onSettled} disabled={Boolean(jackpot)} />
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="font-extrabold">
            <span className="numeral text-2xl text-accent">{spins}</span> <span className="text-ink-2">spin{spins === 1 ? "" : "s"} left</span>
          </div>
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-6 w-6 accent-[var(--accent)]" />
            Auto spin
          </label>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {jackpot ? (
          <div className="panel anim-pop border-2 border-[#ffd23f] p-5 text-center">
            <div className="text-6xl" aria-hidden>🏆</div>
            <h2 className="mt-2 text-3xl font-black">JACKPOT!</h2>
            <p className="mt-1 font-bold">You filled the meter and won the <span style={{ color: jackpot.color }}>{jackpot.name}</span> trophy.</p>
            <p className="text-ink-2 mt-1 text-sm font-bold">+30 coins. The meter starts again at {last?.res.carryOver ?? 0}.</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href={`/k/${kidId}/trophies`} className="btn btn-accent btn-big">See the trophy shelf</Link>
              <button type="button" className="btn btn-big" onClick={() => setJackpot(null)}>Keep spinning</button>
            </div>
          </div>
        ) : (
          <div className={`panel p-4 text-center ${banner ? "anim-pop" : ""}`} aria-live="polite">
            <div className="text-2xl font-black">{banner ?? (spins > 0 ? "Pull the lever!" : "No spins left")}</div>
            {!banner && spins === 0 && (
              <Link href={`/k/${kidId}`} className="btn btn-accent mt-3">Read to earn more</Link>
            )}
          </div>
        )}

        <div className="panel p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-ink-2 text-sm font-bold">Jackpot meter</div>
              <div className="numeral text-4xl text-accent">{meter}<span className="text-ink-2 text-lg font-extrabold"> / {goal}</span></div>
            </div>
            <div className="text-ink-2 pb-1 text-sm font-bold">🪙 {coins}</div>
          </div>
          <div className="gauge mt-2"><div style={{ width: `${Math.min(100, (meter / goal) * 100)}%` }} /></div>
        </div>

        {rewards.length > 0 && (
          <ul className="flex flex-col gap-2">
            {rewards.map((r) => (
              <li key={r.id} className="panel-soft anim-rise flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden>{r.emoji}</span>
                <span className="flex-1 font-extrabold">{r.label}</span>
                {r.coins > 0 && <span className="chip bg-panel-2 text-bolt">+{r.coins} 🪙</span>}
              </li>
            ))}
          </ul>
        )}
        {err && <ErrorNote message={err} />}

        <details className="panel-soft p-3 text-sm font-bold">
          <summary className="tap cursor-pointer font-extrabold">What pays what</summary>
          <ul className="text-ink-2 mt-2 grid grid-cols-2 gap-1">
            <li>Any spin: +2</li>
            <li>Any pair: +6</li>
            {SYMBOLS.map((s, i) => (
              <li key={s.id}>{glyphsFor(machine.theme)[i].repeat(3)}: +{s.triple}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

import { forwardRef, useImperativeHandle } from "react";
const MachineWithRef = forwardRef<{ pull: () => void }, { machine: Machine; spins: number; onSpin: () => Promise<Roll | null>; onSettled: (r: Roll) => void; disabled: boolean }>(function MachineWithRef(props, ref) {
  const btn = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({
    pull: () => {
      const b = btn.current?.querySelector<HTMLButtonElement>("button[aria-label='Pull the lever']");
      if (b && !b.disabled) b.click();
    },
  }));
  return (
    <div ref={btn}>
      <SlotMachine {...props} />
    </div>
  );
});

function Burst() {
  const stars = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const d = 100 + (i % 3) * 40;
    return { bx: `${Math.cos(a) * d}px`, by: `${Math.sin(a) * d}px`, delay: `${(i % 4) * 40}ms`, c: ["#ffd23f", "#fff", "#7dd3fc", "#ff8a1f"][i % 4] };
  });
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden>
      {stars.map((s, i) => (
        <span key={i} className="absolute text-3xl" style={{ ["--bx" as string]: s.bx, ["--by" as string]: s.by, animation: `burst 800ms ease-out ${s.delay} both`, color: s.c }}>✦</span>
      ))}
    </div>
  );
}
