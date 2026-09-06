"use client";
import { useEffect, useRef, useState } from "react";
import { CABINETS, LEVERS, LIGHTS } from "@/lib/catalog";
import { REEL_LEN, glyphsFor, type Roll } from "@/lib/slots";
import type { Machine } from "@/lib/types";
import { play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/client";

const REPEATS = 10; // strip repeats; reels rest in the second repeat so a spin of up to 4 turns never runs off the end
const HOME = REEL_LEN * 2;
const SYMBOL_H = 96; // px per symbol row in the window

export interface SlotMachineProps {
  machine: Machine;
  spins: number;
  onSpin: () => Promise<Roll | null>; // server roll; null when it fails
  onSettled?: (roll: Roll) => void;
  disabled?: boolean;
  compact?: boolean; // preview without controls
}

/** Three reels in a cabinet with a lever. Animation is CSS transforms; the outcome comes from the server. */
export default function SlotMachine({ machine, spins, onSpin, onSettled, disabled, compact }: SlotMachineProps) {
  const reduced = useReducedMotion();
  const paint = CABINETS.find((c) => c.id === machine.cabinet) ?? CABINETS[0];
  const lights = LIGHTS[machine.lights] ?? LIGHTS.gold;
  const lever = LEVERS[machine.lever] ?? LEVERS.red;
  const glyphs = glyphsFor(machine.theme);
  const [pos, setPos] = useState<number[]>([HOME, HOME + 3, HOME + 6]); // absolute symbol offsets on the strip
  const [spinning, setSpinning] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [hot, setHot] = useState<number[]>([]);
  const [durations, setDurations] = useState<number[]>([0, 0, 0]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function pull() {
    if (spinning || disabled || spins <= 0) return;
    setSpinning(true);
    setHot([]);
    setPulled(true);
    play("lever");
    timers.current.push(window.setTimeout(() => setPulled(false), 500));
    const roll = await onSpin();
    if (!roll) {
      setSpinning(false);
      return;
    }
    const stopAt = reduced ? [0, 0, 0] : [1300, 1900, 2500];
    setDurations(stopAt);
    // Land each reel on the target symbol several full turns ahead of its current position.
    setPos((prev) =>
      prev.map((p, i) => {
        const cur = ((p % REEL_LEN) + REEL_LEN) % REEL_LEN;
        const turns = 2 + i;
        const delta = ((roll.reels[i] - cur) % REEL_LEN + REEL_LEN) % REEL_LEN;
        return p + turns * REEL_LEN + delta;
      }),
    );
    if (!reduced) {
      const tick = window.setInterval(() => play("reel"), 90);
      timers.current.push(window.setTimeout(() => clearInterval(tick), stopAt[2]));
      stopAt.forEach((t) => timers.current.push(window.setTimeout(() => play("stop"), t)));
    }
    timers.current.push(
      window.setTimeout(() => {
        setHot(roll.matched);
        setSpinning(false);
        // Snap back (no transition) to the same symbols in the resting repeat so the next spin has room.
        setDurations([0, 0, 0]);
        setPos((prev) => prev.map((p) => HOME + (((p % REEL_LEN) + REEL_LEN) % REEL_LEN)));
        if (roll.kind === "jackpot") play("jackpot");
        else if (roll.kind === "triple") play("jackpot");
        else if (roll.kind === "pair") play("win");
        else play("bolts");
        onSettled?.(roll);
      }, stopAt[2] + 80),
    );
  }

  // The strip: symbols repeated, so translateY can always move downward.
  const strip = Array.from({ length: REEL_LEN * REPEATS }, (_, i) => glyphs[i % REEL_LEN]);

  return (
    <div className="relative mx-auto w-full max-w-[360px] select-none">
      {/* Cabinet */}
      <div className="rounded-[28px] p-3 shadow-[0_18px_40px_rgba(0,0,0,.45)]" style={{ background: `linear-gradient(180deg, ${paint.color}, ${shade(paint.color, -0.25)})`, border: `4px solid ${shade(paint.color, -0.4)}` }}>
        {/* Marquee */}
        <div className="relative rounded-2xl px-3 py-2 text-center" style={{ background: shade(paint.color, -0.45) }}>
          <div className="pointer-events-none absolute inset-x-2 top-1 flex justify-between" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="marquee-bulb h-2.5 w-2.5 rounded-full" style={{ background: lights.colors[i % lights.colors.length], animationDelay: `${(i % 3) * 0.25}s`, animationPlayState: spinning || hot.length ? "running" : "paused", opacity: spinning || hot.length ? 1 : 0.55 }} />
            ))}
          </div>
          <div className="mt-2 truncate text-xl font-black tracking-wide" style={{ color: paint.trim }}>{machine.name}</div>
        </div>

        {/* Window */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl p-2" style={{ background: shade(paint.color, -0.55) }}>
          {pos.map((p, i) => (
            <div key={i} className={`relative overflow-hidden rounded-xl bg-[#f7f4ea] ${hot.includes(i) ? "ring-4 ring-[#ffd23f]" : ""}`} style={{ height: SYMBOL_H * 1.6 }}>
              <div
                className="absolute inset-x-0"
                style={{
                  top: SYMBOL_H * 0.3,
                  transform: `translateY(${-p * SYMBOL_H}px)`,
                  transition: durations[i] ? `transform ${durations[i]}ms cubic-bezier(.15,.85,.25,1.02)` : "none",
                }}
              >
                {strip.map((g, k) => (
                  <div key={k} className="flex items-center justify-center text-[56px] leading-none" style={{ height: SYMBOL_H }}>
                    {g}
                  </div>
                ))}
              </div>
              {/* window shading */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={pull}
              disabled={spinning || disabled || spins <= 0}
              className="btn min-h-[64px] flex-1 text-2xl font-black text-[#0b1230] disabled:opacity-60"
              style={{ background: paint.trim, boxShadow: "0 6px 0 rgba(0,0,0,.3)" }}
            >
              {spins > 0 ? (spinning ? "…" : "SPIN") : "Read to spin"}
            </button>
            {/* Lever */}
            <button type="button" onClick={pull} disabled={spinning || disabled || spins <= 0} aria-label="Pull the lever" className="tap relative h-[88px] w-14 shrink-0">
              <svg viewBox="0 0 56 88" className="h-full w-full" aria-hidden>
                <rect x="20" y="66" width="16" height="18" rx="4" fill={shade(paint.color, -0.5)} />
                <g style={{ transformOrigin: "28px 70px", transform: pulled ? "rotate(28deg)" : "rotate(-18deg)", transition: "transform 220ms cubic-bezier(.2,.8,.2,1)" }}>
                  <rect x="25" y="14" width="6" height="58" rx="3" fill="#c9d1de" />
                  <circle cx="28" cy="14" r="12" fill={lever.color} stroke="rgba(0,0,0,.35)" strokeWidth="2" />
                  {machine.lever === "skull" && <text x="28" y="19" textAnchor="middle" fontSize="14">💀</text>}
                </g>
              </svg>
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        .marquee-bulb { animation: bulb 0.75s steps(2) infinite; }
        @keyframes bulb { 0% { filter: brightness(1.4); } 100% { filter: brightness(.6); } }
        @media (prefers-reduced-motion: reduce) { .marquee-bulb { animation: none; } }
      `}</style>
    </div>
  );
}

export function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
