import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Jackpot, Kid, KidBadge, LedgerEntry, Machine, Mission, ReadingSession, Spin } from "./types";
import { DEFAULT_MACHINE } from "./catalog";
import { createFakeClient } from "./fakedb";

// The Supabase URL and publishable key are not secrets (publishable keys ship in browsers). They stay
// server-side here anyway, and both can be overridden with env vars.
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://nuddxbupepsqgiytxbnh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_6ljlsT54S7LjvuknF9hRaQ_QOEBnUXI";

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!client && process.env.RR_FAKE_DB === "1") client = createFakeClient() as SupabaseClient;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export class DbError extends Error {}
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new DbError(res.error.message);
  return res.data as T;
}
const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

function rowToKid(r: Record<string, unknown>): Kid {
  return {
    id: String(r.id),
    name: String(r.name),
    grade: num(r.grade),
    goal_points: num(r.goal_points),
    accent: String(r.accent),
    avatar: String(r.avatar),
    bolts: num(r.bolts),
    lifetime_points: num(r.lifetime_points),
    carry_over: num(r.carry_over),
    owned: (r.owned as string[]) ?? [],
    sort_order: num(r.sort_order),
    spins_bank: num(r.spins_bank),
    carry_seconds: num(r.carry_seconds),
    level: num(r.level),
    lifetime_minutes: num(r.lifetime_minutes),
    machine: { ...DEFAULT_MACHINE, ...((r.machine as Partial<Machine>) ?? {}) },
    created_at: String(r.created_at),
  };
}

export async function listKids(): Promise<Kid[]> {
  const rows = check(await db().from("kids").select("*").order("sort_order"));
  return (rows as Record<string, unknown>[]).map(rowToKid);
}
export async function getKid(id: string): Promise<Kid | null> {
  const res = await db().from("kids").select("*").eq("id", id).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? rowToKid(res.data) : null;
}
export async function updateKid(id: string, patch: Partial<Record<keyof Kid, unknown>>): Promise<void> {
  check(await db().from("kids").update(patch).eq("id", id));
}

// ---------- Reading sessions ----------
export async function listSessions(kidId: string, limit = 500): Promise<ReadingSession[]> {
  return check(await db().from("reading_sessions").select("*").eq("kid_id", kidId).order("started_at", { ascending: false }).limit(limit)) as ReadingSession[];
}
export async function activeSession(kidId: string): Promise<ReadingSession | null> {
  const res = await db().from("reading_sessions").select("*").eq("kid_id", kidId).is("ended_at", null).order("started_at", { ascending: false }).limit(1);
  if (res.error) throw new DbError(res.error.message);
  return (res.data?.[0] as ReadingSession) ?? null;
}
export async function insertSession(row: Partial<ReadingSession>): Promise<ReadingSession> {
  return check(await db().from("reading_sessions").insert(row).select("*").single()) as ReadingSession;
}
export async function updateSession(id: string, patch: Partial<ReadingSession>): Promise<void> {
  check(await db().from("reading_sessions").update(patch).eq("id", id));
}
export async function getSession(id: string): Promise<ReadingSession | null> {
  const res = await db().from("reading_sessions").select("*").eq("id", id).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return (res.data as ReadingSession) ?? null;
}
export async function deleteSession(id: string): Promise<void> {
  check(await db().from("reading_sessions").delete().eq("id", id));
}

// ---------- Spins and jackpots ----------
export async function listSpins(kidId: string, limit = 2000): Promise<Spin[]> {
  return check(await db().from("spins").select("*").eq("kid_id", kidId).order("created_at", { ascending: false }).limit(limit)) as Spin[];
}
export async function insertSpin(row: Partial<Spin>): Promise<Spin> {
  return check(await db().from("spins").insert(row).select("*").single()) as Spin;
}
export async function assignSpinsToJackpot(kidId: string, jackpotId: string): Promise<void> {
  check(await db().from("spins").update({ jackpot_id: jackpotId }).eq("kid_id", kidId).is("jackpot_id", null));
}
export async function listJackpots(kidId: string): Promise<Jackpot[]> {
  return check(await db().from("jackpots").select("*").eq("kid_id", kidId).order("seq")) as Jackpot[];
}
export async function insertJackpot(row: Omit<Jackpot, "id" | "hit_at">): Promise<Jackpot> {
  return check(await db().from("jackpots").insert(row).select("*").single()) as Jackpot;
}
export async function updateJackpot(id: string, patch: Partial<Jackpot>): Promise<void> {
  check(await db().from("jackpots").update(patch).eq("id", id));
}

// ---------- Badges, missions, coins ----------
export async function listBadges(kidId: string): Promise<KidBadge[]> {
  return check(await db().from("kid_badges").select("*").eq("kid_id", kidId)) as KidBadge[];
}
export async function insertBadge(kidId: string, badgeId: string): Promise<boolean> {
  const res = await db().from("kid_badges").insert({ kid_id: kidId, badge_id: badgeId });
  if (res.error) {
    if (res.error.code === "23505") return false;
    throw new DbError(res.error.message);
  }
  return true;
}
export async function listMissions(kidId: string, weekStart: string): Promise<Mission[]> {
  return check(await db().from("missions").select("*").eq("kid_id", kidId).eq("week_start", weekStart).order("created_at")) as Mission[];
}
export async function insertMissions(rows: Omit<Mission, "id" | "created_at" | "completed_at">[]): Promise<void> {
  check(await db().from("missions").insert(rows));
}
export async function updateMission(id: string, patch: Partial<Mission>): Promise<void> {
  check(await db().from("missions").update(patch).eq("id", id));
}
export async function addCoins(kidId: string, amount: number, reason: string): Promise<void> {
  if (amount === 0) return;
  const kid = await getKid(kidId);
  if (!kid) return;
  check(await db().from("kids").update({ bolts: Math.max(0, kid.bolts + amount) }).eq("id", kidId));
  check(await db().from("bolt_ledger").insert({ kid_id: kidId, amount, reason }));
}
export async function listLedger(kidId: string, limit = 40): Promise<LedgerEntry[]> {
  return check(await db().from("bolt_ledger").select("*").eq("kid_id", kidId).order("created_at", { ascending: false }).limit(limit)) as LedgerEntry[];
}
export async function wipeKid(kidId: string): Promise<void> {
  for (const t of ["bolt_ledger", "kid_badges", "missions", "spins", "jackpots", "reading_sessions"]) check(await db().from(t).delete().eq("kid_id", kidId));
}

// ---------- Settings ----------
export async function getSetting(key: string): Promise<string | null> {
  const res = await db().from("settings").select("value").eq("key", key).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? String(res.data.value) : null;
}
export async function setSetting(key: string, value: string): Promise<void> {
  check(await db().from("settings").upsert({ key, value, updated_at: new Date().toISOString() }));
}
