"use client";
// Tiny synthesized sound effects. No assets. Mute persists in localStorage.

const KEY = "rr:muted";
let ctx: AudioContext | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
export function setMuted(m: boolean) {
  try {
    localStorage.setItem(KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("rr:mute"));
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18, slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(c: AudioContext, start: number, dur: number, gain = 0.25) {
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(400, start);
  f.frequency.exponentialRampToValueAtTime(3000, start + dur * 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(start);
}

export type SoundName = "tap" | "correct" | "wrong" | "attach" | "bolts" | "launch" | "fanfare" | "count" | "reel" | "stop" | "win" | "jackpot" | "lever";

export function play(name: SoundName) {
  if (isMuted()) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case "tap":
      tone(c, 520, t, 0.06, "triangle", 0.08);
      break;
    case "correct":
      tone(c, 660, t, 0.1, "triangle", 0.16);
      tone(c, 990, t + 0.09, 0.16, "triangle", 0.16);
      break;
    case "wrong":
      tone(c, 220, t, 0.18, "sine", 0.14, 160);
      break;
    case "attach":
      tone(c, 300, t, 0.08, "square", 0.08, 600);
      tone(c, 880, t + 0.1, 0.12, "triangle", 0.14);
      tone(c, 1320, t + 0.18, 0.18, "triangle", 0.12);
      break;
    case "bolts":
      tone(c, 1200, t, 0.07, "square", 0.06);
      tone(c, 1800, t + 0.07, 0.12, "square", 0.06);
      break;
    case "count":
      tone(c, 900 + Math.random() * 300, t, 0.04, "triangle", 0.05);
      break;
    case "fanfare":
      [523, 659, 784, 1046].forEach((f, i) => tone(c, f, t + i * 0.11, 0.22, "triangle", 0.15));
      tone(c, 1318, t + 0.46, 0.5, "triangle", 0.14);
      break;
    case "launch":
      noise(c, t, 2.4, 0.35);
      tone(c, 60, t, 2.2, "sawtooth", 0.12, 180);
      break;
    case "lever":
      tone(c, 180, t, 0.12, "square", 0.08, 90);
      noise(c, t + 0.05, 0.15, 0.12);
      break;
    case "reel":
      tone(c, 700 + Math.random() * 200, t, 0.03, "square", 0.03);
      break;
    case "stop":
      tone(c, 420, t, 0.08, "triangle", 0.12, 300);
      break;
    case "win":
      [660, 880, 1100].forEach((f, i) => tone(c, f, t + i * 0.08, 0.16, "triangle", 0.14));
      break;
    case "jackpot":
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(c, f, t + i * 0.09, 0.3, "triangle", 0.15));
      noise(c, t + 0.5, 1.2, 0.2);
      [1046, 1318, 1568, 2093].forEach((f, i) => tone(c, f, t + 0.7 + i * 0.1, 0.5, "triangle", 0.12));
      break;
  }
}
