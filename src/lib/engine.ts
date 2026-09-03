import {
  addBolts, getAttempt, getBook, getKid, insertBadge, insertMissions, insertPlanet, listAttempts, listBadges, listKids,
  listMissions, listPlanets, updateAttempt, updateKid, updateMission, type AttemptWithBook,
} from "./db";
import { BADGES, BOLTS, MISSION_DEFS, hadBookLastWeek, milestonesFor, missionProgressFor, newPlanetLook, periodPoints, pickMissions, stationFor, weekStart, computeStreak, stageFor, rankFor } from "./game";
import { BONUS_POINTS, earnedPoints } from "./ar";
import type { Attempt, Kid, Mission, Planet, Question } from "./types";

export interface Reward {
  id: string;
  kind: "bolts" | "badge" | "mission" | "streak" | "rank";
  label: string;
  emoji: string;
  bolts: number;
}

export interface FinishResult {
  attempt: Attempt;
  passed: boolean;
  correct: number;
  total: number;
  percent: number;
  pointsEarned: number;
  bolts: number;
  rewards: Reward[];
  periodBefore: number;
  periodAfter: number;
  goal: number;
  stageBefore: number;
  stageAfter: number;
  readyToLaunch: boolean;
  bonusAvailable: boolean;
}

/** Ensure this week's missions exist for a kid. Returns them. */
export async function ensureMissions(kid: Kid, history?: AttemptWithBook[]): Promise<Mission[]> {
  const ws = weekStart();
  const existing = await listMissions(kid.id, ws);
  if (existing.length) return existing;
  const hist = history ?? (await listAttempts(kid.id));
  const defs = pickMissions(hist, kid.grade);
  await insertMissions(defs.map((d) => ({ kid_id: kid.id, week_start: ws, kind: d.kind, target: d.target, progress: 0, reward_bolts: d.reward })));
  return listMissions(kid.id, ws);
}

async function advanceMissions(kid: Kid, attempt: AttemptWithBook, history: AttemptWithBook[], extra: { bonusTried?: boolean; bonusWon?: boolean }, rewards: Reward[]) {
  const missions = await ensureMissions(kid, history);
  for (const m of missions) {
    if (m.completed_at) continue;
    const p = Math.min(m.target, missionProgressFor(m, { attempt, history, ...extra }));
    if (p === m.progress) continue;
    const done = p >= m.target;
    await updateMission(m.id, { progress: p, completed_at: done ? new Date().toISOString() : null });
    if (done) {
      await addBolts(kid.id, m.reward_bolts, `Mission: ${MISSION_DEFS[m.kind]?.title ?? m.kind}`);
      rewards.push({ id: `mission:${m.id}`, kind: "mission", label: `Mission done: ${MISSION_DEFS[m.kind]?.title ?? m.kind}`, emoji: MISSION_DEFS[m.kind]?.emoji ?? "🎯", bolts: m.reward_bolts });
    }
  }
}

async function awardBadge(kid: Kid, badgeId: string, rewards: Reward[]) {
  const fresh = await insertBadge(kid.id, badgeId);
  if (!fresh) return;
  const def = BADGES.find((b) => b.id === badgeId);
  await addBolts(kid.id, BOLTS.badge, `Badge: ${def?.name ?? badgeId}`);
  rewards.push({ id: `badge:${badgeId}`, kind: "badge", label: `New badge: ${def?.name ?? badgeId}`, emoji: def?.emoji ?? "🏅", bolts: BOLTS.badge });
}

export async function finishAttempt(attemptId: string, pool: Question[]): Promise<FinishResult> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) throw new Error("Attempt not found");
  const kid = await getKid(attempt.kid_id);
  const book = await getBook(attempt.book_id);
  if (!kid || !book) throw new Error("Missing kid or book");
  const historyBefore = await listAttempts(kid.id);
  const periodBefore = periodPoints(kid, historyBefore.filter((a) => a.id !== attempt.id));
  const goal = kid.goal_points;
  const stageBefore = stageFor(periodBefore, goal);

  if (attempt.status !== "in_progress") {
    // Already finished: recompute a summary without re-awarding.
    const periodAfter = periodPoints(kid, historyBefore);
    return {
      attempt, passed: attempt.status === "passed", correct: attempt.correct ?? 0, total: attempt.total ?? 0,
      percent: attempt.percent ?? 0, pointsEarned: attempt.points_earned, bolts: attempt.bolts_earned, rewards: [],
      periodBefore: periodAfter, periodAfter, goal, stageBefore: stageFor(periodAfter, goal), stageAfter: stageFor(periodAfter, goal),
      readyToLaunch: periodAfter >= goal, bonusAvailable: attempt.bonus_status === "available",
    };
  }

  const flagged = new Set(attempt.flagged);
  const live = attempt.question_idxs.filter((i) => !flagged.has(i));
  const total = live.length;
  let correct = 0;
  for (const i of live) {
    const a = attempt.answers[String(i)];
    if (a != null && pool[i] && pool[i].answer === a) correct++;
  }
  const percent = total ? correct / total : 0;
  const pointsEarned = earnedPoints(book.points, correct, total);
  const passed = total > 0 && percent >= 0.6;
  const rewards: Reward[] = [];
  let bolts = 0;

  if (passed) {
    bolts += BOLTS.pass;
    rewards.push({ id: "bolts:pass", kind: "bolts", label: "Quiz passed", emoji: "🔩", bolts: BOLTS.pass });
    if (percent >= 1) {
      bolts += BOLTS.perfectExtra;
      rewards.push({ id: "bolts:perfect", kind: "bolts", label: "Perfect score", emoji: "💯", bolts: BOLTS.perfectExtra });
    }
    // Weekly streak bonus: first book this week, and there was one last week.
    const thisWeekBefore = computeStreak(historyBefore.filter((a) => a.id !== attempt.id)).thisWeek;
    if (thisWeekBefore === 0 && hadBookLastWeek(historyBefore)) {
      bolts += BOLTS.streak;
      rewards.push({ id: "bolts:streak", kind: "streak", label: "Streak kept alive", emoji: "🔥", bolts: BOLTS.streak });
    }
  }

  const now = new Date().toISOString();
  await updateAttempt(attempt.id, {
    status: passed ? "passed" : "failed",
    correct, total, percent: Math.round(percent * 1000) / 1000,
    points_earned: pointsEarned, bolts_earned: bolts,
    bonus_status: passed ? "available" : null,
    completed_at: now,
  });
  if (bolts) await addBolts(kid.id, bolts, `Quiz: ${book.title}`);

  const rankBefore = rankFor(kid.lifetime_points);
  if (passed) await updateKid(kid.id, { lifetime_points: Math.round((kid.lifetime_points + pointsEarned) * 10) / 10 });
  const kidAfter = (await getKid(kid.id)) as Kid;
  const rankAfter = rankFor(kidAfter.lifetime_points);
  if (rankAfter.name !== rankBefore.name) rewards.push({ id: "rank", kind: "rank", label: `Promoted to ${rankAfter.name}`, emoji: rankAfter.emoji, bolts: 0 });

  const history = await listAttempts(kid.id);
  const me = history.find((a) => a.id === attempt.id) as AttemptWithBook;

  if (passed) {
    const passedAll = history.filter((a) => a.status === "passed");
    const n = passedAll.length;
    if (n >= 1) await awardBadge(kid, "first_book", rewards);
    if (n >= 5) await awardBadge(kid, "five_books", rewards);
    if (n >= 10) await awardBadge(kid, "ten_books", rewards);
    if (n >= 25) await awardBadge(kid, "twenty_five_books", rewards);
    if (percent >= 1) await awardBadge(kid, "perfect", rewards);
    if (computeStreak(history).thisWeek >= 3) await awardBadge(kid, "three_week", rewards);
    if (me.level_label === "challenge") await awardBadge(kid, "first_challenge", rewards);
  }
  await advanceMissions(kid, me, history, {}, rewards);

  const rewardBolts = rewards.reduce((s, r) => s + r.bolts, 0);
  const periodAfter = periodPoints(kidAfter, history);
  const finalAttempt = (await getAttempt(attempt.id)) as Attempt;
  return {
    attempt: finalAttempt, passed, correct, total, percent, pointsEarned, bolts: rewardBolts, rewards,
    periodBefore, periodAfter, goal, stageBefore, stageAfter: stageFor(periodAfter, goal),
    readyToLaunch: periodAfter >= goal, bonusAvailable: passed,
  };
}

export interface BonusResult {
  won: boolean;
  correct: number;
  total: number;
  pointsEarned: number;
  rewards: Reward[];
  bolts: number;
  periodAfter: number;
  goal: number;
  readyToLaunch: boolean;
}

export async function finishBonus(attemptId: string, pool: Question[]): Promise<BonusResult> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) throw new Error("Attempt not found");
  const kid = await getKid(attempt.kid_id);
  const book = await getBook(attempt.book_id);
  if (!kid || !book) throw new Error("Missing kid or book");
  if (attempt.bonus_status !== "in_progress") throw new Error("Bonus round is not in progress");
  const total = attempt.bonus_idxs.length;
  let correct = 0;
  for (const i of attempt.bonus_idxs) {
    const a = attempt.bonus_answers[String(i)];
    if (a != null && pool[i] && pool[i].answer === a) correct++;
  }
  const won = total > 0 && correct === total;
  const rewards: Reward[] = [];
  let bolts = 0;
  let pointsEarned = 0;
  if (won) {
    pointsEarned = BONUS_POINTS;
    bolts = BOLTS.bonus;
    rewards.push({ id: "bolts:bonus", kind: "bolts", label: "Bonus round cleared", emoji: "🎯", bolts: BOLTS.bonus });
  }
  await updateAttempt(attempt.id, {
    bonus_status: won ? "passed" : "failed",
    points_earned: Math.round((attempt.points_earned + pointsEarned) * 10) / 10,
    bolts_earned: attempt.bolts_earned + bolts,
  });
  if (bolts) await addBolts(kid.id, bolts, `Bonus: ${book.title}`);
  if (won) await updateKid(kid.id, { lifetime_points: Math.round((kid.lifetime_points + pointsEarned) * 10) / 10 });
  const history = await listAttempts(kid.id);
  const me = history.find((a) => a.id === attempt.id) as AttemptWithBook;
  if (won) await awardBadge(kid, "first_bonus", rewards);
  await advanceMissions(kid, me, history, { bonusTried: true, bonusWon: won }, rewards);
  const kidAfter = (await getKid(kid.id)) as Kid;
  const periodAfter = periodPoints(kidAfter, history);
  return {
    won, correct, total, pointsEarned, rewards, bolts: rewards.reduce((s, r) => s + r.bolts, 0),
    periodAfter, goal: kidAfter.goal_points, readyToLaunch: periodAfter >= kidAfter.goal_points,
  };
}

export interface LaunchResult {
  planet: Planet;
  carryOver: number;
  nextGoal: number;
  rewards: Reward[];
}

/** Turn the current period into a planet. Surplus points carry into the next rocket. */
export async function launchRocket(kidId: string): Promise<LaunchResult> {
  const kid = await getKid(kidId);
  if (!kid) throw new Error("Kid not found");
  const attempts = await listAttempts(kidId);
  const points = periodPoints(kid, attempts);
  if (points < kid.goal_points) throw new Error("Not enough points to launch yet");
  const planets = await listPlanets(kidId);
  const look = newPlanetLook(planets.length + 1, planets);
  const planet = await insertPlanet({
    kid_id: kidId, seq: planets.length + 1, name: look.name, color: look.color, style: look.style,
    points: Math.round(points * 10) / 10, goal_points: kid.goal_points,
  });
  for (const a of attempts) if (a.status === "passed" && !a.planet_id && !a.archived) await updateAttempt(a.id, { planet_id: planet.id });
  const carry = Math.round((points - kid.goal_points) * 10) / 10;
  await updateKid(kidId, { carry_over: Math.max(0, carry) });
  const rewards: Reward[] = [];
  await awardBadge(kid, "first_launch", rewards);
  return { planet, carryOver: Math.max(0, carry), nextGoal: kid.goal_points, rewards };
}

/** Everything the dashboard and customizer need in one shape. */
export async function kidState(kidId: string) {
  const kid = await getKid(kidId);
  if (!kid) return null;
  const [attempts, planets, badges, kids] = await Promise.all([listAttempts(kidId), listPlanets(kidId), listBadges(kidId), listKids()]);
  const missions = await ensureMissions(kid, attempts);
  const combined = kids.reduce((s, k) => s + k.lifetime_points, 0);
  const station = stationFor(combined);
  const period = periodPoints(kid, attempts);
  return {
    kid,
    attempts,
    planets,
    badges,
    missions,
    station,
    period,
    stage: stageFor(period, kid.goal_points),
    streak: computeStreak(attempts),
    rank: rankFor(kid.lifetime_points),
    milestones: milestonesFor(kid, attempts, planets, station.current.level),
  };
}
export type KidState = NonNullable<Awaited<ReturnType<typeof kidState>>>;
