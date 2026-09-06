import type { Jackpot, Kid, Mission, ReadingSession, Spin } from "./types";
import type { Milestones } from "./catalog";

export const MIN_STREAK_MINUTES = 10; // a reading day needs at least this much

// ---------- Ranks (lifetime points) ----------
export const RANKS: { name: string; min: number; emoji: string }[] = [
  { name: "Rookie", min: 0, emoji: "🎟️" },
  { name: "Page Turner", min: 100, emoji: "📖" },
  { name: "Bookworm", min: 300, emoji: "🐛" },
  { name: "Chapter Champ", min: 700, emoji: "🏅" },
  { name: "Story Master", min: 1500, emoji: "⭐" },
  { name: "High Roller", min: 3000, emoji: "🎰" },
  { name: "Reading Legend", min: 6000, emoji: "👑" },
];
export function rankFor(points: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (points >= x.min) r = x;
  const next = RANKS.find((x) => x.min > points) ?? null;
  return { ...r, next };
}

// ---------- Badges ----------
export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  how: string;
}
export const BADGES: BadgeDef[] = [
  { id: "first_spin", name: "First spin", emoji: "🎰", how: "Pull the lever once" },
  { id: "first_triple", name: "Triple!", emoji: "🎉", how: "Land three of a kind" },
  { id: "first_jackpot", name: "Jackpot", emoji: "💎", how: "Fill the jackpot meter" },
  { id: "minutes_100", name: "100 minutes", emoji: "⏱️", how: "Read 100 minutes in total" },
  { id: "minutes_500", name: "500 minutes", emoji: "🕰️", how: "Read 500 minutes in total" },
  { id: "minutes_1000", name: "1,000 minutes", emoji: "🏆", how: "Read 1,000 minutes in total" },
  { id: "streak_7", name: "Week streak", emoji: "🔥", how: "Read 7 days in a row" },
  { id: "big_day", name: "Big day", emoji: "☀️", how: "Read 60 minutes in one day" },
  { id: "gem_triple", name: "Diamond hands", emoji: "💠", how: "Spin three gems" },
  { id: "spins_100", name: "100 spins", emoji: "🔁", how: "Spin 100 times" },
];

// ---------- Dates ----------
export function toDateKey(x: Date): string {
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
export function dayKey(iso: string): string {
  return toDateKey(new Date(iso));
}
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  x.setDate(x.getDate() + n);
  return toDateKey(x);
}
export function weekStart(d = new Date()): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return toDateKey(x);
}

// ---------- Minutes ----------
export function minutesByDay(sessions: ReadingSession[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) {
    if (!s.ended_at) continue;
    const k = dayKey(s.ended_at);
    m.set(k, (m.get(k) ?? 0) + s.minutes);
  }
  return m;
}
export function minutesToday(sessions: ReadingSession[], now = new Date()): number {
  return minutesByDay(sessions).get(toDateKey(now)) ?? 0;
}
export function minutesThisWeek(sessions: ReadingSession[], now = new Date()): number {
  const ws = weekStart(now);
  let n = 0;
  for (const [k, v] of minutesByDay(sessions)) if (k >= ws) n += v;
  return n;
}

// ---------- Streak (reading days in a row; today counts if it has minutes) ----------
export interface Streak {
  days: number;
  today: number;
  fuel: number; // 0..100 gauge that fades over missed days instead of snapping to zero
}
export function computeStreak(sessions: ReadingSession[], now = new Date()): Streak {
  const byDay = minutesByDay(sessions);
  const today = toDateKey(now);
  const has = (k: string) => (byDay.get(k) ?? 0) >= MIN_STREAK_MINUTES;
  let days = 0;
  let k = has(today) ? today : addDays(today, -1);
  while (has(k)) {
    days++;
    k = addDays(k, -1);
  }
  let fuel = 0;
  for (let i = 14; i >= 1; i--) {
    const key = addDays(today, -i);
    fuel = has(key) ? Math.min(100, fuel + 35) : Math.max(0, fuel - 25);
  }
  if (has(today)) fuel = Math.min(100, fuel + 35);
  return { days, today: byDay.get(today) ?? 0, fuel: Math.round(fuel) };
}

// ---------- Trophies (one per jackpot) ----------
const TROPHY_NAMES = ["Golden Cherry", "Diamond Page", "Lucky Clover Cup", "Rocket Ribbon", "Silver Bell", "Starburst", "Big Seven", "Bookworm Bowl", "Comet Crown", "Dragon Dish", "Thunder Trophy", "Moonstone", "Neon Nova", "Emerald Egg", "Galaxy Goblet"];
const TROPHY_COLORS = ["#ffd23f", "#7dd3fc", "#3ecf6a", "#ff8a1f", "#c9d1de", "#ff6fae", "#e5484d", "#9b5cf6", "#14b8a6", "#f5b700"];
export function newTrophyLook(seq: number, used: Jackpot[]) {
  const usedNames = new Set(used.map((j) => j.name));
  const name = TROPHY_NAMES.find((n) => !usedNames.has(n)) ?? `Trophy ${seq}`;
  return { name, color: TROPHY_COLORS[(seq * 3) % TROPHY_COLORS.length] };
}

// ---------- Missions (weekly, coins) ----------
export interface MissionDef {
  kind: string;
  title: string;
  target: number;
  reward: number;
  emoji: string;
}
export const MISSION_DEFS: Record<string, MissionDef> = {
  minutes_60: { kind: "minutes_60", title: "Read 60 minutes this week", target: 60, reward: 10, emoji: "⏱️" },
  minutes_120: { kind: "minutes_120", title: "Read 120 minutes this week", target: 120, reward: 18, emoji: "⏳" },
  days_3: { kind: "days_3", title: "Read on 3 different days", target: 3, reward: 10, emoji: "📅" },
  days_5: { kind: "days_5", title: "Read on 5 different days", target: 5, reward: 16, emoji: "🗓️" },
  big_day_30: { kind: "big_day_30", title: "Read 30 minutes in one day", target: 1, reward: 8, emoji: "☀️" },
  spins_25: { kind: "spins_25", title: "Spin 25 times", target: 25, reward: 8, emoji: "🎰" },
  triple: { kind: "triple", title: "Land a triple", target: 1, reward: 12, emoji: "🎉" },
  pairs_10: { kind: "pairs_10", title: "Spin 10 pairs", target: 10, reward: 8, emoji: "👯" },
};

export function pickMissions(sessions: ReadingSession[], spins: Spin[]): MissionDef[] {
  const weeks = new Set(sessions.filter((s) => s.ended_at).map((s) => weekStart(new Date(s.ended_at as string))));
  const veteran = weeks.size >= 2;
  const picks = [veteran ? "minutes_120" : "minutes_60", veteran ? "days_5" : "days_3"];
  const hadTriple = spins.some((s) => s.kind === "triple" || s.kind === "jackpot");
  picks.push(!hadTriple && spins.length > 10 ? "triple" : spins.length < 20 ? "spins_25" : "big_day_30");
  return picks.map((k) => MISSION_DEFS[k]);
}

/** Recompute a mission's progress from this week's activity. */
export function missionProgress(m: Mission, sessions: ReadingSession[], spins: Spin[], now = new Date()): number {
  const ws = weekStart(now);
  const week = sessions.filter((s) => s.ended_at && dayKey(s.ended_at) >= ws);
  const byDay = minutesByDay(week);
  const weekSpins = spins.filter((s) => dayKey(s.created_at) >= ws);
  switch (m.kind) {
    case "minutes_60":
    case "minutes_120":
      return week.reduce((n, s) => n + s.minutes, 0);
    case "days_3":
    case "days_5":
      return [...byDay.values()].filter((v) => v >= MIN_STREAK_MINUTES).length;
    case "big_day_30":
      return [...byDay.values()].some((v) => v >= 30) ? 1 : 0;
    case "spins_25":
      return weekSpins.length;
    case "triple":
      return weekSpins.some((s) => s.kind === "triple" || s.kind === "jackpot") ? 1 : 0;
    case "pairs_10":
      return weekSpins.filter((s) => s.kind === "pair").length;
  }
  return m.progress;
}

export function milestonesFor(kid: Kid, spins: Spin[], jackpots: Jackpot[]): Milestones {
  return {
    minutes: kid.lifetime_minutes,
    jackpots: jackpots.length,
    triples: spins.filter((s) => s.kind === "triple" || s.kind === "jackpot").length,
    spins: spins.length,
  };
}

/** Points toward the current jackpot = carry-over + points from spins since the last jackpot. */
export function meterPoints(kid: Kid, spins: Spin[]): number {
  return kid.carry_over + spins.filter((s) => !s.jackpot_id).reduce((n, s) => n + s.points, 0);
}
