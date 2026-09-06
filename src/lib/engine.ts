import {
  activeSession, addCoins, assignSpinsToJackpot, getKid, getSession, insertBadge, insertJackpot, insertMissions, insertSession, insertSpin,
  listBadges, listJackpots, listMissions, listSessions, listSpins, updateKid, updateMission, updateSession,
} from "./db";
import { BADGES, MISSION_DEFS, computeStreak, meterPoints, milestonesFor, minutesToday, missionProgress, newTrophyLook, pickMissions, rankFor, weekStart, minutesThisWeek } from "./game";
import { MAX_SESSION_MINUTES, roll, type Roll } from "./slots";
import type { Jackpot, Kid, Mission, ReadingSession, Spin } from "./types";

export interface Reward {
  id: string;
  kind: "coins" | "badge" | "mission" | "rank";
  label: string;
  emoji: string;
  coins: number;
}

async function awardBadge(kid: Kid, badgeId: string, rewards: Reward[]) {
  if (!(await insertBadge(kid.id, badgeId))) return;
  const def = BADGES.find((b) => b.id === badgeId);
  await addCoins(kid.id, 5, `Badge: ${def?.name ?? badgeId}`);
  rewards.push({ id: `badge:${badgeId}`, kind: "badge", label: `New badge: ${def?.name ?? badgeId}`, emoji: def?.emoji ?? "🏅", coins: 5 });
}

export async function ensureMissions(kid: Kid, sessions: ReadingSession[], spins: Spin[]): Promise<Mission[]> {
  const ws = weekStart();
  const existing = await listMissions(kid.id, ws);
  if (existing.length) return existing;
  const defs = pickMissions(sessions, spins);
  await insertMissions(defs.map((d) => ({ kid_id: kid.id, week_start: ws, kind: d.kind, target: d.target, progress: 0, reward_bolts: d.reward })));
  return listMissions(kid.id, ws);
}

async function advanceMissions(kid: Kid, sessions: ReadingSession[], spins: Spin[], rewards: Reward[]) {
  const missions = await ensureMissions(kid, sessions, spins);
  for (const m of missions) {
    if (m.completed_at) continue;
    const p = Math.min(m.target, missionProgress(m, sessions, spins));
    if (p === m.progress) continue;
    const done = p >= m.target;
    await updateMission(m.id, { progress: p, completed_at: done ? new Date().toISOString() : null });
    if (done) {
      await addCoins(kid.id, m.reward_bolts, `Mission: ${MISSION_DEFS[m.kind]?.title ?? m.kind}`);
      rewards.push({ id: `mission:${m.id}`, kind: "mission", label: `Mission done: ${MISSION_DEFS[m.kind]?.title ?? m.kind}`, emoji: MISSION_DEFS[m.kind]?.emoji ?? "🎯", coins: m.reward_bolts });
    }
  }
}

// ---------- Reading timer ----------
export async function startReading(kidId: string, note: string | null): Promise<ReadingSession> {
  const current = await activeSession(kidId);
  if (current) return current;
  return insertSession({ kid_id: kidId, note, source: "timer" });
}

export interface StopResult {
  session: ReadingSession;
  minutes: number;
  spinsEarned: number;
  spinsBank: number;
  rewards: Reward[];
  capped: boolean;
}

/** Credit minutes as spins. Leftover seconds carry to the next session so nothing is wasted. */
async function creditMinutes(kid: Kid, seconds: number, rewards: Reward[]): Promise<{ minutes: number; spins: number }> {
  const total = kid.carry_seconds + seconds;
  const minutes = Math.floor(total / 60);
  const carry = total % 60;
  await updateKid(kid.id, { spins_bank: kid.spins_bank + minutes, carry_seconds: carry, lifetime_minutes: kid.lifetime_minutes + minutes });
  const after = kid.lifetime_minutes + minutes;
  if (after >= 100) await awardBadge(kid, "minutes_100", rewards);
  if (after >= 500) await awardBadge(kid, "minutes_500", rewards);
  if (after >= 1000) await awardBadge(kid, "minutes_1000", rewards);
  return { minutes, spins: minutes };
}

export async function stopReading(kidId: string): Promise<StopResult> {
  const kid = await getKid(kidId);
  const session = await activeSession(kidId);
  if (!kid || !session) throw new Error("No reading timer is running.");
  const now = new Date();
  let seconds = Math.max(0, Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000));
  const capped = seconds > MAX_SESSION_MINUTES * 60;
  if (capped) seconds = MAX_SESSION_MINUTES * 60;
  const rewards: Reward[] = [];
  const credit = await creditMinutes(kid, seconds, rewards);
  await updateSession(session.id, { ended_at: now.toISOString(), minutes: credit.minutes });
  const sessions = await listSessions(kidId);
  const spins = await listSpins(kidId);
  if (minutesToday(sessions) >= 60) await awardBadge(kid, "big_day", rewards);
  if (computeStreak(sessions).days >= 7) await awardBadge(kid, "streak_7", rewards);
  await advanceMissions(kid, sessions, spins, rewards);
  const fresh = (await getKid(kidId)) as Kid;
  return { session: { ...session, ended_at: now.toISOString(), minutes: credit.minutes }, minutes: credit.minutes, spinsEarned: credit.spins, spinsBank: fresh.spins_bank, rewards, capped };
}

/** Grown-up adds minutes read away from the timer (school, car, bedtime). */
export async function addMinutes(kidId: string, minutes: number, note: string | null, when: Date): Promise<StopResult> {
  const kid = await getKid(kidId);
  if (!kid) throw new Error("Kid not found");
  const rewards: Reward[] = [];
  const credit = await creditMinutes(kid, minutes * 60, rewards);
  const session = await insertSession({ kid_id: kidId, started_at: new Date(when.getTime() - minutes * 60000).toISOString(), ended_at: when.toISOString(), minutes, source: "manual", note });
  const sessions = await listSessions(kidId);
  const spins = await listSpins(kidId);
  if (minutesToday(sessions) >= 60) await awardBadge(kid, "big_day", rewards);
  if (computeStreak(sessions).days >= 7) await awardBadge(kid, "streak_7", rewards);
  await advanceMissions(kid, sessions, spins, rewards);
  const fresh = (await getKid(kidId)) as Kid;
  return { session, minutes, spinsEarned: credit.spins, spinsBank: fresh.spins_bank, rewards, capped: false };
}

/** Remove a logged session and take back its unspent spins (never below zero). */
export async function removeSession(sessionId: string): Promise<void> {
  const s = await getSession(sessionId);
  if (!s) return;
  const kid = await getKid(s.kid_id);
  if (kid) await updateKid(kid.id, { spins_bank: Math.max(0, kid.spins_bank - s.minutes), lifetime_minutes: Math.max(0, kid.lifetime_minutes - s.minutes) });
  const { deleteSession } = await import("./db");
  await deleteSession(sessionId);
}

// ---------- Spinning ----------
export interface SpinResult {
  spin: Spin;
  roll: Roll;
  spinsBank: number;
  meterBefore: number;
  meterAfter: number;
  goal: number;
  jackpot: Jackpot | null; // filled when this spin fills the meter
  carryOver: number;
  rewards: Reward[];
  lifetimePoints: number;
}

export async function doSpin(kidId: string): Promise<SpinResult> {
  const kid = await getKid(kidId);
  if (!kid) throw new Error("Kid not found");
  if (kid.spins_bank <= 0) throw new Error("No spins left. Read to earn more.");
  const spinsBefore = await listSpins(kidId);
  const meterBefore = meterPoints(kid, spinsBefore);
  const r = roll();
  await updateKid(kid.id, { spins_bank: kid.spins_bank - 1, lifetime_points: kid.lifetime_points + r.points });
  const spin = await insertSpin({ kid_id: kid.id, reels: r.reels, symbols: r.reels.map(String), points: r.points, coins: r.coins, kind: r.kind });
  await addCoins(kid.id, r.coins, r.kind === "none" ? "Spin" : r.kind === "pair" ? "Pair" : r.kind === "triple" ? "Triple!" : "JACKPOT SYMBOLS");
  const rewards: Reward[] = [];
  const spins = [spin, ...spinsBefore];
  await awardBadge(kid, "first_spin", rewards);
  if (r.kind === "triple" || r.kind === "jackpot") await awardBadge(kid, "first_triple", rewards);
  if (r.kind === "jackpot") await awardBadge(kid, "gem_triple", rewards);
  if (spins.length >= 100) await awardBadge(kid, "spins_100", rewards);
  const rankBefore = rankFor(kid.lifetime_points);
  const rankAfter = rankFor(kid.lifetime_points + r.points);
  if (rankAfter.name !== rankBefore.name) rewards.push({ id: "rank", kind: "rank", label: `Promoted to ${rankAfter.name}`, emoji: rankAfter.emoji, coins: 0 });
  const sessions = await listSessions(kidId);
  await advanceMissions(kid, sessions, spins, rewards);

  // Jackpot meter
  let meterAfter = meterBefore + r.points;
  let jackpot: Jackpot | null = null;
  let carryOver = 0;
  if (meterAfter >= kid.goal_points) {
    const existing = await listJackpots(kidId);
    const look = newTrophyLook(existing.length + 1, existing);
    const minutes = sessions.filter((s) => s.ended_at && s.ended_at >= (existing[existing.length - 1]?.hit_at ?? "")).reduce((n, s) => n + s.minutes, 0);
    jackpot = await insertJackpot({ kid_id: kid.id, seq: existing.length + 1, name: look.name, color: look.color, points: meterAfter, minutes, goal_points: kid.goal_points });
    await assignSpinsToJackpot(kid.id, jackpot.id);
    carryOver = meterAfter - kid.goal_points;
    await updateKid(kid.id, { carry_over: carryOver, level: kid.level + 1 });
    await addCoins(kid.id, 30, `Jackpot: ${look.name}`);
    rewards.push({ id: `jackpot:${jackpot.id}`, kind: "coins", label: "Jackpot bonus", emoji: "💰", coins: 30 });
    await awardBadge(kid, "first_jackpot", rewards);
    meterAfter = carryOver;
  }
  const fresh = (await getKid(kidId)) as Kid;
  return { spin, roll: r, spinsBank: fresh.spins_bank, meterBefore, meterAfter, goal: fresh.goal_points, jackpot, carryOver, rewards, lifetimePoints: fresh.lifetime_points };
}

// ---------- State ----------
export async function kidState(kidId: string) {
  const kid = await getKid(kidId);
  if (!kid) return null;
  const [sessions, spins, jackpots, badges, active] = await Promise.all([listSessions(kidId), listSpins(kidId), listJackpots(kidId), listBadges(kidId), activeSession(kidId)]);
  const missions = await ensureMissions(kid, sessions, spins);
  const meter = meterPoints(kid, spins);
  return {
    kid, sessions, spins, jackpots, badges, missions, active,
    meter,
    streak: computeStreak(sessions),
    rank: rankFor(kid.lifetime_points),
    milestones: milestonesFor(kid, spins, jackpots),
    today: minutesToday(sessions),
    week: minutesThisWeek(sessions),
  };
}
export type KidState = NonNullable<Awaited<ReturnType<typeof kidState>>>;
