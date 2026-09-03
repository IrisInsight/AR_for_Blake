"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Rocket from "@/components/Rocket";
import { ApiError, post, useReducedMotion } from "@/lib/client";
import { fmtPts } from "@/lib/ar";
import { play } from "@/lib/sound";
import type { RocketConfig } from "@/lib/types";
import type { LaunchResult } from "@/lib/engine";
import { ErrorNote } from "@/components/ui";

interface Props {
  kidId: string;
  rocket: RocketConfig;
  points: number;
  goal: number;
  books: { title: string; emoji: string; points: number }[];
  planetCount: number;
}

export default function LaunchClient({ kidId, rocket, points, goal, books, planetCount }: Props) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"ready" | "count" | "lift" | "landed">("ready");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function go() {
    play("tap");
    setErr(null);
    try {
      const res = await post<LaunchResult>("/api/launch", { kidId });
      setResult(res);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Launch didn't work. Try again.");
      return;
    }
    if (reduced) {
      setPhase("landed");
      return;
    }
    setPhase("count");
    const t = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    [3, 2, 1].forEach((n, i) => t(() => { setCount(n); play("count"); }, i * 900));
    t(() => {
      setPhase("lift");
      play("launch");
    }, 2700);
    t(() => {
      setPhase("landed");
      play("fanfare");
    }, 2700 + 3000);
  }

  if (phase === "landed" && result) {
    const p = result.planet;
    return (
      <main className="safe-x safe-top safe-bottom mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <div className="anim-pop relative">
          <svg viewBox="0 0 200 200" className="h-52 w-52">
            {p.style === 1 && <ellipse cx="100" cy="100" rx="96" ry="22" fill="none" stroke="#c9d1de" strokeWidth="8" transform="rotate(-18 100 100)" />}
            <circle cx="100" cy="100" r="66" fill={p.color} />
            <circle cx="100" cy="100" r="66" fill="url(#pl)" />
            {p.style === 2 && (
              <g fill="#000" opacity=".2">
                <circle cx="76" cy="84" r="13" />
                <circle cx="120" cy="112" r="9" />
                <circle cx="92" cy="130" r="7" />
              </g>
            )}
            {p.style === 3 && (
              <g fill="#fff" opacity=".25">
                <rect x="34" y="78" width="132" height="10" />
                <rect x="34" y="106" width="132" height="14" />
              </g>
            )}
            <defs>
              <radialGradient id="pl" cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#fff" stopOpacity=".5" />
                <stop offset="1" stopColor="#000" stopOpacity=".6" />
              </radialGradient>
            </defs>
          </svg>
          <div className="absolute -right-2 -top-2 w-16 rotate-[30deg]">
            <Rocket config={rocket} stage={7} pad={false} ghost={false} idPrefix="land" className="h-auto w-full" />
          </div>
        </div>
        <p className="text-ink-2 font-bold">Planet #{p.seq} discovered</p>
        <h1 className="text-4xl font-black">Welcome to {p.name}!</h1>
        <p className="font-bold">Fueled by {fmtPts(p.points)} points from {books.length} book{books.length === 1 ? "" : "s"}.</p>
        <ul className="flex w-full flex-col gap-1">
          {books.slice(0, 8).map((b, i) => (
            <li key={i} className="panel-soft flex items-center gap-2 px-3 py-2 text-left font-bold">
              <span aria-hidden>{b.emoji}</span>
              <span className="min-w-0 flex-1 truncate">{b.title}</span>
              <span className="text-ink-2 text-sm">{fmtPts(b.points)}</span>
            </li>
          ))}
        </ul>
        {result.rewards.map((r) => (
          <div key={r.id} className="chip bg-panel text-bolt">
            {r.emoji} {r.label} · +{r.bolts} 🔩
          </div>
        ))}
        <div className="panel w-full p-4">
          <div className="font-extrabold">Next mission</div>
          <p className="text-ink-2 text-sm font-bold">
            Build a brand new rocket to {fmtPts(result.nextGoal)} points.
            {result.carryOver > 0 && ` You had ${fmtPts(result.carryOver)} extra points of fuel, so it starts with a head start.`}
          </p>
        </div>
        <Link href={`/k/${kidId}`} className="btn btn-accent btn-big">
          Start the next mission
        </Link>
        <Link href={`/k/${kidId}/planets`} className="btn btn-ghost tap">
          See the planet map
        </Link>
      </main>
    );
  }

  return (
    <main className="safe-x safe-top safe-bottom relative mx-auto flex min-h-screen max-w-2xl flex-col items-center overflow-hidden">
      {phase === "lift" && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 w-0.5 rounded-full bg-white"
              style={{ left: `${(i * 37) % 100}%`, height: `${40 + (i % 5) * 30}px`, opacity: 0.5 + (i % 3) * 0.2, animation: `streak ${0.5 + (i % 4) * 0.2}s linear ${(i % 6) * 0.1}s infinite` }}
            />
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col items-center justify-center">
        {phase === "count" && (
          <div key={count} className="numeral anim-pop absolute top-[18%] text-8xl text-accent">
            {count}
          </div>
        )}
        <div className={`w-full max-w-[300px] ${phase === "lift" ? "anim-liftoff" : ""}`}>
          <Rocket config={rocket} stage={7} flame={phase !== "ready"} idPrefix="launch" className="h-auto w-full" />
        </div>
      </div>
      {phase === "ready" && (
        <div className="anim-rise flex w-full flex-col items-center gap-3 pb-4 text-center">
          <h1 className="text-3xl font-black">{rocket.name} is fueled up</h1>
          <p className="font-bold">
            {fmtPts(points)} of {fmtPts(goal)} points. Every part is on. {planetCount === 0 ? "This is your first launch." : `Planet number ${planetCount + 1} is out there.`}
          </p>
          {err && <ErrorNote message={err} />}
          <button type="button" onClick={go} className="btn btn-accent btn-big">
            🚀 Launch!
          </button>
          <Link href={`/k/${kidId}`} className="btn btn-ghost tap">
            Not yet
          </Link>
        </div>
      )}
    </main>
  );
}
