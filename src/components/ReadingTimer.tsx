"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, post } from "@/lib/client";
import { play } from "@/lib/sound";
import { ErrorNote } from "./ui";
import type { ReadingSession } from "@/lib/types";
import type { StopResult } from "@/lib/engine";
import { MAX_SESSION_MINUTES } from "@/lib/slots";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ReadingTimer({ kidId, active, spins, carrySeconds }: { kidId: string; active: ReadingSession | null; spins: number; carrySeconds: number }) {
  const router = useRouter();
  const [session, setSession] = useState<ReadingSession | null>(active);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<StopResult | null>(null);

  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  const elapsed = session ? Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000)) : 0;
  const capped = elapsed >= MAX_SESSION_MINUTES * 60;
  const earnedSoFar = Math.floor((elapsed + carrySeconds) / 60);
  const untilNext = 60 - ((elapsed + carrySeconds) % 60);

  async function start() {
    setBusy(true);
    setErr(null);
    play("tap");
    try {
      const r = await post<{ session: ReadingSession }>("/api/reading/start", { kidId, note });
      setSession(r.session);
      setNow(Date.now());
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't start the timer.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setErr(null);
    play("tap");
    try {
      const r = await post<StopResult>("/api/reading/stop", { kidId });
      setSession(null);
      setDone(r);
      play(r.spinsEarned > 0 ? "fanfare" : "wrong");
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't stop the timer.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel anim-pop flex flex-col items-center gap-2 p-5 text-center">
        <div className="text-5xl" aria-hidden>{done.spinsEarned > 0 ? "🎟️" : "⏱️"}</div>
        <div className="text-2xl font-black">{done.minutes} minute{done.minutes === 1 ? "" : "s"} read</div>
        <div className="numeral text-5xl text-accent">+{done.spinsEarned} spin{done.spinsEarned === 1 ? "" : "s"}</div>
        {done.capped && <p className="text-ink-2 text-sm font-bold">The timer maxes out at {MAX_SESSION_MINUTES} minutes per sitting.</p>}
        {done.spinsEarned === 0 && <p className="text-ink-2 text-sm font-bold">Not a full minute yet. The seconds are saved for next time.</p>}
        {done.rewards.map((r) => (
          <span key={r.id} className="chip bg-panel-2 text-bolt">{r.emoji} {r.label}{r.coins ? ` · +${r.coins} 🪙` : ""}</span>
        ))}
        <div className="mt-2 flex w-full flex-col gap-2">
          {done.spinsBank > 0 && (
            <Link href={`/k/${kidId}/spin`} className="btn btn-accent btn-big">
              🎰 Spin {done.spinsBank} time{done.spinsBank === 1 ? "" : "s"}
            </Link>
          )}
          <button type="button" className="btn btn-big" onClick={() => setDone(null)}>
            Read some more
          </button>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="panel flex flex-col items-center gap-2 p-5 text-center">
        <div className="text-ink-2 font-bold">{session.note ? `Reading ${session.note}` : "Reading…"}</div>
        <div className="numeral text-7xl tabular-nums text-accent" aria-live="off">{fmt(elapsed)}</div>
        <div className="font-extrabold">
          {earnedSoFar} spin{earnedSoFar === 1 ? "" : "s"} earned so far
          <span className="text-ink-2"> · next one in {untilNext}s</span>
        </div>
        <div className="gauge w-full">
          <div style={{ width: `${((60 - untilNext) / 60) * 100}%` }} />
        </div>
        {capped && <p className="text-ink-2 text-sm font-bold">You hit the {MAX_SESSION_MINUTES}-minute max. Stop to collect your spins.</p>}
        {err && <ErrorNote message={err} />}
        <button type="button" onClick={stop} disabled={busy} className="btn btn-accent btn-big mt-2">
          Stop and collect spins
        </button>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col items-center gap-3 p-5 text-center">
      <div className="text-5xl" aria-hidden>📖</div>
      <div className="text-2xl font-black">Every minute you read is a spin</div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What are you reading? (optional)"
        maxLength={80}
        className="min-h-[48px] w-full rounded-2xl bg-space px-4 text-center text-base font-bold placeholder:text-ink-2/70"
      />
      {err && <ErrorNote message={err} />}
      <button type="button" onClick={start} disabled={busy} className="btn btn-accent btn-big">
        ▶ Start reading
      </button>
      {spins > 0 && (
        <Link href={`/k/${kidId}/spin`} className="btn btn-big">
          🎰 You have {spins} spin{spins === 1 ? "" : "s"} waiting
        </Link>
      )}
    </div>
  );
}
