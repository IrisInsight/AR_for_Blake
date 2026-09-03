import type { Attempt, Kid, Mission, Planet } from "./types";
import type { AttemptWithBook } from "./db";
import type { Milestones } from "./catalog";

// ---------- Bolts (spendable) ----------
export const BOLTS = {
  pass: 3,
  perfectExtra: 3,
  bonus: 5,
  streak: 4,
  badge: 5,
};

// ---------- Ranks (lifetime points) ----------
export const RANKS: { name: string; min: number; emoji: string }[] = [
  { name: "Cadet", min: 0, emoji: "🎖️" },
  { name: "Pilot", min: 5, emoji: "🛩️" },
  { name: "Navigator", min: 15, emoji: "🧭" },
  { name: "Commander", min: 30, emoji: "⭐" },
  { name: "Captain", min: 50, emoji: "🌟" },
  { name: "Admiral", min: 80, emoji: "🏅" },
  { name: "Star Marshal", min: 120, emoji: "💫" },
  { name: "Galactic Legend", min: 200, emoji: "🌌" },
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
  { id: "first_book", name: "First book", emoji: "📕", how: "Pass your first quiz" },
  { id: "five_books", name: "Five books", emoji: "📚", how: "Pass 5 quizzes" },
  { id: "ten_books", name: "Ten books", emoji: "🏆", how: "Pass 10 quizzes" },
  { id: "twenty_five_books", name: "Twenty-five books", emoji: "👑", how: "Pass 25 quizzes" },
  { id: "perfect", name: "Perfect score", emoji: "💯", how: "Get every question right" },
  { id: "three_week", name: "Three in a week", emoji: "🔥", how: "Pass 3 quizzes in one week" },
  { id: "first_challenge", name: "Brave reader", emoji: "🦁", how: "Pass a Challenge book" },
  { id: "first_bonus", name: "Bonus ace", emoji: "🎯", how: "Clear a bonus round" },
  { id: "first_launch", name: "Liftoff", emoji: "🚀", how: "Launch your first rocket" },
];

// ---------- Weeks ----------
/** Monday-start week key as YYYY-MM-DD, in local time of the server (close enough for a family app). */
export function weekStart(d = new Date()): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return toDateKey(x);
}
export function toDateKey(x: Date): string {
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  x.setDate(x.getDate() + n);
  return toDateKey(x);
}
function weekOf(iso: string): string {
  return weekStart(new Date(iso));
}

// ---------- Streak (fuel gauge that decays) ----------
export interface Streak {
  fuel: number; // 0..100
  weeks: number; // consecutive weeks with a book, counting this week if it has one
  thisWeek: number;
}
export function computeStreak(attempts: Attempt[], now = new Date()): Streak {
  const passed = attempts.filter((a) => a.status === "passed" && a.completed_at);
  const byWeek = new Map<string, number>();
  for (const a of passed) {
    const w = weekOf(a.completed_at as string);
    byWeek.set(w, (byWeek.get(w) ?? 0) + 1);
  }
  const current = weekStart(now);
  // Walk the last 12 completed weeks, then the current week.
  let fuel = 0;
  const keys: string[] = [];
  for (let i = 12; i >= 1; i--) keys.push(addDays(current, -7 * i));
  for (const k of keys) {
    const n = byWeek.get(k) ?? 0;
    fuel = n > 0 ? Math.min(100, fuel + 40 + 15 * (n - 1)) : Math.max(0, fuel - 30);
  }
  const thisWeek = byWeek.get(current) ?? 0;
  if (thisWeek > 0) fuel = Math.min(100, fuel + 40 + 15 * (thisWeek - 1));
  let weeks = 0;
  let k = thisWeek > 0 ? current : addDays(current, -7);
  while ((byWeek.get(k) ?? 0) > 0) {
    weeks++;
    k = addDays(k, -7);
  }
  return { fuel: Math.round(fuel), weeks, thisWeek };
}

export function hadBookLastWeek(attempts: Attempt[], now = new Date()): boolean {
  const last = addDays(weekStart(now), -7);
  return attempts.some((a) => a.status === "passed" && a.completed_at && weekOf(a.completed_at) === last);
}

// ---------- Space station (co-op) ----------
export interface StationLevel {
  level: number;
  min: number;
  name: string;
  blurb: string;
  unlock: string; // human description of what both kids get
}
export const STATION_LEVELS: StationLevel[] = [
  { level: 0, min: 0, name: "Launch pad", blurb: "Just a platform in orbit. Read to build it up.", unlock: "" },
  { level: 1, min: 10, name: "Core module", blurb: "The first room. Somebody has to sleep somewhere.", unlock: "Station patch icon for both rockets" },
  { level: 2, min: 25, name: "Solar wings", blurb: "Big shiny panels. Now there's power.", unlock: "Chrome paint for both rockets" },
  { level: 3, min: 50, name: "Docking ring", blurb: "Room for two rockets to park at once.", unlock: "Comet trail exhaust for both" },
  { level: 4, min: 90, name: "Greenhouse dome", blurb: "Space tomatoes. Space strawberries.", unlock: "Alien two-tone paint for both" },
  { level: 5, min: 140, name: "Observatory", blurb: "A giant telescope pointed at the next planet.", unlock: "Quad boosters for both" },
  { level: 6, min: 200, name: "Robot arm", blurb: "It waves at rockets as they fly by.", unlock: "Crown patch icon for both" },
  { level: 7, min: 300, name: "Warp core", blurb: "The whole station hums. Anywhere is reachable now.", unlock: "Galaxy paint for both" },
];
export function stationFor(combined: number) {
  let cur = STATION_LEVELS[0];
  for (const l of STATION_LEVELS) if (combined >= l.min) cur = l;
  const next = STATION_LEVELS.find((l) => l.min > combined) ?? null;
  const progress = next ? (combined - cur.min) / (next.min - cur.min) : 1;
  return { current: cur, next, progress, combined };
}

// ---------- Rocket build stages ----------
export const STAGE_NAMES = ["engine bell", "fuel tank", "fins", "upper stage", "detail band", "window", "nose cone"];
export function stageFor(points: number, goal: number): number {
  if (goal <= 0) return 7;
  const s = Math.floor((points / goal) * 7);
  return Math.max(0, Math.min(7, s));
}

// ---------- Planets ----------
const PLANET_NAMES = [
  "Zorbo", "Kepler Blue", "Marshmallow", "Grumbletron", "Nebulon", "Pip", "Vortexa", "Crumb", "Sizzle", "Moonpie",
  "Bloop", "Tangerine", "Frostbite", "Wobbly", "Quasar Nine", "Snickerdoodle", "Glimmer", "Thunderhead", "Pudding",
  "Sparkfall", "Rumbletop", "Nimbus", "Jellyworld", "Boulder", "Fizz",
];
const PLANET_COLORS = ["#ff8a1f", "#3b82f6", "#3ecf6a", "#9b5cf6", "#ff6fae", "#14b8a6", "#ffd23f", "#e5484d", "#c9d1de", "#f5b700"];
export function newPlanetLook(seq: number, used: Planet[]) {
  const usedNames = new Set(used.map((p) => p.name));
  const name = PLANET_NAMES.find((n) => !usedNames.has(n)) ?? `Planet ${seq}`;
  const color = PLANET_COLORS[(seq * 3) % PLANET_COLORS.length];
  const style = seq % 4; // 0 plain, 1 ring, 2 spots, 3 stripes
  return { name, color, style };
}

// ---------- Missions ----------
export interface MissionDef {
  kind: string;
  title: string;
  target: number;
  reward: number;
  emoji: string;
}
export const MISSION_DEFS: Record<string, MissionDef> = {
  finish_one: { kind: "finish_one", title: "Finish 1 book this week", target: 1, reward: 5, emoji: "📖" },
  finish_two: { kind: "finish_two", title: "Finish 2 books this week", target: 2, reward: 9, emoji: "📚" },
  perfect: { kind: "perfect", title: "Score 100% on a quiz", target: 1, reward: 8, emoji: "💯" },
  challenge: { kind: "challenge", title: "Read a Challenge book", target: 1, reward: 10, emoji: "🦁" },
  bonus_try: { kind: "bonus_try", title: "Try a bonus round", target: 1, reward: 6, emoji: "🎯" },
  bonus_win: { kind: "bonus_win", title: "Clear a bonus round", target: 1, reward: 10, emoji: "🏹" },
  big_book: { kind: "big_book", title: "Finish a book worth 3+ points", target: 1, reward: 8, emoji: "🐘" },
  new_author: { kind: "new_author", title: "Read a book by a new author", target: 1, reward: 6, emoji: "✍️" },
  series: { kind: "series", title: "Read the next book in a series", target: 1, reward: 6, emoji: "🔗" },
};

/** Pick three missions from what the kid has actually been doing. */
export function pickMissions(history: AttemptWithBook[], grade: number): MissionDef[] {
  const passed = history.filter((a) => a.status === "passed");
  const picks: string[] = [];
  const recent = passed.slice(0, 6);
  const avgPts = recent.length ? recent.reduce((s, a) => s + a.book.points, 0) / recent.length : 0;

  // Volume mission: beginners get 1, regulars get 2.
  picks.push(passed.length < 2 ? "finish_one" : "finish_two");

  const candidates: string[] = [];
  if (!passed.some((a) => a.level_label === "challenge")) candidates.push("challenge");
  if (!history.some((a) => a.bonus_status && a.bonus_status !== "available" && a.bonus_status !== "declined")) candidates.push("bonus_try");
  else if (!history.some((a) => a.bonus_status === "passed")) candidates.push("bonus_win");
  if (!passed.some((a) => (a.percent ?? 0) >= 1)) candidates.push("perfect");
  if (avgPts < 3 && grade >= 3) candidates.push("big_book");
  if (passed.some((a) => a.book.series)) candidates.push("series");
  if (passed.length >= 2) candidates.push("new_author");
  // Always something to do for a kid who's done everything.
  candidates.push("perfect", "challenge", "big_book", "bonus_win");

  for (const c of candidates) {
    if (picks.length >= 3) break;
    if (!picks.includes(c)) picks.push(c);
  }
  return picks.map((k) => MISSION_DEFS[k]);
}

/** Given a fresh attempt outcome, advance the week's missions. Returns bolts newly earned. */
export interface MissionEvent {
  attempt: AttemptWithBook;
  history: AttemptWithBook[]; // includes the attempt, most recent first
  bonusTried?: boolean;
  bonusWon?: boolean;
}
export function missionProgressFor(m: Mission, ev: MissionEvent): number {
  const a = ev.attempt;
  const passed = a.status === "passed";
  switch (m.kind) {
    case "finish_one":
    case "finish_two":
      return passed ? m.progress + 1 : m.progress;
    case "perfect":
      return passed && (a.percent ?? 0) >= 1 ? 1 : m.progress;
    case "challenge":
      return passed && a.level_label === "challenge" ? 1 : m.progress;
    case "bonus_try":
      return ev.bonusTried ? 1 : m.progress;
    case "bonus_win":
      return ev.bonusWon ? 1 : m.progress;
    case "big_book":
      return passed && a.book.points >= 3 ? 1 : m.progress;
    case "new_author": {
      if (!passed) return m.progress;
      const others = ev.history.filter((h) => h.id !== a.id && h.status === "passed");
      const seen = others.some((h) => h.book.author.toLowerCase() === a.book.author.toLowerCase());
      return seen ? m.progress : 1;
    }
    case "series": {
      if (!passed || !a.book.series) return m.progress;
      const others = ev.history.filter((h) => h.id !== a.id && h.status === "passed" && h.book.series === a.book.series);
      return others.length ? 1 : m.progress;
    }
  }
  return m.progress;
}

// ---------- Milestones for shop unlocks ----------
export function milestonesFor(kid: Kid, attempts: Attempt[], planets: Planet[], stationLevel: number): Milestones {
  const passed = attempts.filter((a) => a.status === "passed");
  return {
    points: kid.lifetime_points,
    books: passed.length,
    launches: planets.length,
    perfects: passed.filter((a) => (a.percent ?? 0) >= 1).length,
    bonus: attempts.filter((a) => a.bonus_status === "passed").length,
    station: stationLevel,
  };
}

/** Points toward the current rocket = carry-over + points from books not yet flown to a planet. */
export function periodPoints(kid: Kid, attempts: Attempt[]): number {
  const sum = attempts.filter((a) => a.status === "passed" && !a.planet_id && !a.archived).reduce((s, a) => s + a.points_earned, 0);
  return Math.round((kid.carry_over + sum) * 10) / 10;
}
