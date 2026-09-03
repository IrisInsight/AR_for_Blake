"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Rocket from "@/components/Rocket";
import { useReducedMotion } from "@/lib/client";
import { fmtPts } from "@/lib/ar";
import { STAGE_NAMES } from "@/lib/game";
import { play } from "@/lib/sound";
import type { RocketConfig } from "@/lib/types";
import type { BonusResult, FinishResult, Reward } from "@/lib/engine";

interface Props {
  kidId: string;
  attempt: { id: string; status: string; correct: number; total: number; percent: number; points: number; bonusStatus: string | null; flagged: number };
  rocket: RocketConfig;
  goal: number;
  period: number;
  stage: number;
  bookPoints: number;
}

function readSession<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export default function ResultsClient({ kidId, attempt, rocket, goal, period, stage, bookPoints }: Props) {
  const params = useSearchParams();
  const reduced = useReducedMotion();
  const [fresh, setFresh] = useState<FinishResult | null>(null);
  const [bonus, setBonus] = useState<BonusResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFresh(readSession<FinishResult>(`rr:result:${attempt.id}`));
    if (params.get("bonus")) setBonus(readSession<BonusResult>(`rr:bonus:${attempt.id}`));
    setLoaded(true);
  }, [attempt.id, params]);

  const passed = attempt.status === "passed";
  const animate = loaded && !reduced && Boolean(fresh || bonus);

  // Where the animation starts and ends.
  const stageFrom = useMemo(() => {
    if (bonus) return Math.max(0, Math.min(stage, stageForPoints(bonus.periodAfter - bonus.pointsEarned, goal)));
    return fresh ? fresh.stageBefore : stage;
  }, [fresh, bonus, stage, goal]);
  const pointsFrom = bonus ? bonus.periodAfter - bonus.pointsEarned : fresh ? fresh.periodBefore : period;
  const earnedNow = bonus ? bonus.pointsEarned : fresh ? fresh.pointsEarned : attempt.points;
  const rewards: Reward[] = bonus ? bonus.rewards : fresh ? fresh.rewards : [];

  const [shownStage, setShownStage] = useState<number>(stage);
  const [snap, setSnap] = useState<number | null>(null);
  const [countedPts, setCountedPts] = useState<number>(earnedNow);
  const [gauge, setGauge] = useState<number>(period);
  const [step, setStep] = useState<number>(4); // 0 score, 1 points, 2 parts, 3 rewards, 4 done
  const [burst, setBurst] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!loaded) return;
    if (!animate) {
      setShownStage(stage);
      setCountedPts(earnedNow);
      setGauge(period);
      setStep(4);
      return;
    }
    // Orchestrated celebration.
    setShownStage(stageFrom);
    setCountedPts(0);
    setGauge(pointsFrom);
    setStep(0);
    const t = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    let clock = 500;
    if (passed || bonus?.won) play("fanfare");
    // 1: points count up
    t(() => setStep(1), clock);
    const ticks = 18;
    for (let i = 1; i <= ticks; i++) {
      t(() => {
        setCountedPts(Math.round(((earnedNow * i) / ticks) * 10) / 10);
        if (i % 3 === 0) play("count");
      }, clock + 200 + i * 50);
    }
    clock += 200 + ticks * 50 + 300;
    // 2: parts snap in one by one
    const parts = Math.max(0, stage - stageFrom);
    if (parts > 0) {
      t(() => setStep(2), clock);
      for (let s = stageFrom + 1; s <= stage; s++) {
        const at = clock + (s - stageFrom - 1) * 950;
        t(() => {
          setShownStage(s);
          setSnap(s);
          setBurst(true);
          play("attach");
        }, at);
        t(() => setBurst(false), at + 700);
      }
      clock += parts * 950 + 300;
    }
    // gauge fill
    t(() => setGauge(period), clock);
    clock += 600;
    // 3: rewards
    t(() => {
      setStep(3);
      if (rewards.length) play("bolts");
    }, clock);
    clock += 400 + rewards.length * 250;
    t(() => setStep(4), clock);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, animate]);

  const pct = Math.round(attempt.percent * 100);
  const ready = period >= goal;
  const newParts = Math.max(0, stage - stageFrom);

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {/* Rocket with celebration overlay */}
      <div className="panel relative flex min-w-0 flex-col items-center overflow-hidden p-3">
        {burst && !reduced && <StarBurst />}
        <div className="w-full max-w-[260px] lg:max-w-[340px]">
          <Rocket config={rocket} stage={shownStage} animateStage={snap} idPrefix="res" className="h-auto w-full" />
        </div>
        <div className="w-full">
          <div className="flex items-end justify-between">
            <div className="numeral text-4xl text-accent">
              {fmtPts(gauge)}
              <span className="text-ink-2 text-lg font-extrabold"> / {fmtPts(goal)}</span>
            </div>
            <div className="text-ink-2 pb-1 text-sm font-bold">{shownStage} of 7 parts</div>
          </div>
          <div className="gauge mt-2">
            <div style={{ width: `${Math.min(100, (gauge / goal) * 100)}%` }} />
          </div>
          {step >= 2 && newParts > 0 && (
            <p className="anim-rise mt-2 text-center font-extrabold">
              {newParts === 1 ? `New part: the ${STAGE_NAMES[stage - 1]}!` : `${newParts} new parts bolted on!`}
            </p>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {bonus ? (
          <div className={`panel anim-pop p-5 text-center ${bonus.won ? "border-2 border-[#ffd23f]/70" : ""}`}>
            <div className="text-6xl" aria-hidden>{bonus.won ? "🎯" : "🛡️"}</div>
            <h1 className="mt-2 text-2xl font-black">{bonus.won ? "Bonus cleared!" : "Not this time."}</h1>
            <p className="mt-1 font-bold">
              {bonus.won ? `All ${bonus.total} right. +${fmtPts(bonus.pointsEarned)} points.` : `${bonus.correct} of ${bonus.total}. You kept every point you earned.`}
            </p>
          </div>
        ) : passed ? (
          <div className="panel anim-pop p-5 text-center">
            <div className="text-6xl" aria-hidden>{pct === 100 ? "💯" : "🎉"}</div>
            <h1 className="mt-2 text-2xl font-black">{pct === 100 ? "Perfect!" : "Mission complete!"}</h1>
            <p className="mt-1 font-bold">
              {attempt.correct} of {attempt.total} right · {pct}%
              {attempt.flagged > 0 && <span className="text-ink-2"> · {attempt.flagged} skipped</span>}
            </p>
            <div className="mt-3">
              <div className="numeral text-6xl text-accent">{step >= 1 ? fmtPts(countedPts) : "0.0"}</div>
              <div className="text-ink-2 font-bold">points of fuel{pct < 100 && ` (of ${fmtPts(bookPoints)} possible)`}</div>
            </div>
          </div>
        ) : (
          <div className="panel p-5 text-center">
            <div className="text-6xl" aria-hidden>🌧️</div>
            <h1 className="mt-2 text-2xl font-black">Not enough fuel this time.</h1>
            <p className="mt-1 font-bold">
              {attempt.correct} of {attempt.total} right. You need 60%.
            </p>
            <p className="text-ink-2 mt-2 font-bold">Read it again and come back tomorrow. The rocket is waiting.</p>
          </div>
        )}

        {step >= 3 && rewards.length > 0 && (
          <ul className="flex flex-col gap-2">
            {rewards.map((r, i) => (
              <li key={r.id} className="panel-soft anim-rise flex items-center gap-3 p-3" style={{ animationDelay: reduced ? "0ms" : `${i * 200}ms` }}>
                <span className="text-2xl" aria-hidden>{r.emoji}</span>
                <span className="flex-1 font-extrabold">{r.label}</span>
                {r.bolts > 0 && <span className="chip bg-panel-2 text-bolt">+{r.bolts} 🔩</span>}
              </li>
            ))}
          </ul>
        )}

        {step >= 4 && (
          <div className="anim-rise flex flex-col gap-2">
            {ready && (
              <Link href={`/k/${kidId}/launch`} className="btn btn-accent btn-big">
                🚀 Launch the rocket!
              </Link>
            )}
            {passed && attempt.bonusStatus === "available" && !bonus && (
              <Link href={`/k/${kidId}/bonus/${attempt.id}`} className={`btn btn-big ${ready ? "" : "btn-accent"}`}>
                ⚡ Take the bonus mission
              </Link>
            )}
            {!passed && (
              <Link href={`/k/${kidId}/search`} className="btn btn-accent btn-big">
                Find another book
              </Link>
            )}
            <Link href={`/k/${kidId}`} className="btn btn-big">
              Back to base
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function stageForPoints(points: number, goal: number) {
  return Math.max(0, Math.min(7, Math.floor((points / goal) * 7)));
}

function StarBurst() {
  const stars = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const d = 90 + (i % 3) * 40;
    return { bx: `${Math.cos(a) * d}px`, by: `${Math.sin(a) * d}px`, delay: `${(i % 4) * 40}ms`, c: ["#ffd23f", "#fff", "#7dd3fc", "#ff8a1f"][i % 4] };
  });
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute text-2xl"
          style={{ ["--bx" as string]: s.bx, ["--by" as string]: s.by, animation: `burst 700ms ease-out ${s.delay} both`, color: s.c }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
