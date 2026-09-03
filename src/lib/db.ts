import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Attempt, Book, Kid, KidBadge, LedgerEntry, Mission, Planet, Question, RocketConfig } from "./types";
import { DEFAULT_ROCKET } from "./catalog";
import { createFakeClient } from "./fakedb";

// The Supabase URL and publishable key are not secrets: the publishable key is designed to ship
// in browsers. Here it stays server-side anyway. Both can be overridden with env vars.
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://nuddxbupepsqgiytxbnh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_6ljlsT54S7LjvuknF9hRaQ_QOEBnUXI";

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!client && process.env.RR_FAKE_DB === "1") client = createFakeClient() as SupabaseClient;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

function rowToKid(r: Record<string, unknown>): Kid {
  const rocket = { ...DEFAULT_ROCKET, ...((r.rocket as Partial<RocketConfig>) ?? {}) } as RocketConfig;
  rocket.patch = { ...DEFAULT_ROCKET.patch, ...(rocket.patch ?? {}) };
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
    rocket,
    owned: (r.owned as string[]) ?? [],
    seen_flag_tip: Boolean(r.seen_flag_tip),
    sort_order: num(r.sort_order),
    created_at: String(r.created_at),
  };
}

function rowToBook(r: Record<string, unknown>): Book {
  return {
    ...(r as unknown as Book),
    atos: num(r.atos),
    word_count: num(r.word_count),
    points: num(r.points),
    series_number: r.series_number == null ? null : num(r.series_number),
    page_count: r.page_count == null ? null : num(r.page_count),
    year: r.year == null ? null : num(r.year),
    format: (r.format as string) ?? null,
    cover_url: (r.cover_url as string) ?? null,
    level_source: (r.level_source as string) ?? null,
    word_count_source: (r.word_count_source as string) ?? null,
    resolved_model: (r.resolved_model as string) ?? null,
    resolved_at: (r.resolved_at as string) ?? null,
  };
}

function rowToAttempt(r: Record<string, unknown>): Attempt {
  return {
    ...(r as unknown as Attempt),
    percent: r.percent == null ? null : num(r.percent),
    points_earned: num(r.points_earned),
    bolts_earned: num(r.bolts_earned),
    answers: (r.answers as Record<string, number>) ?? {},
    bonus_answers: (r.bonus_answers as Record<string, number>) ?? {},
    flagged: (r.flagged as number[]) ?? [],
    bonus_idxs: (r.bonus_idxs as number[]) ?? [],
    question_idxs: (r.question_idxs as number[]) ?? [],
    archived: Boolean(r.archived),
  };
}

function rowToPlanet(r: Record<string, unknown>): Planet {
  return { ...(r as unknown as Planet), points: num(r.points), goal_points: num(r.goal_points) };
}

export class DbError extends Error {}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new DbError(res.error.message);
  return res.data as T;
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

export async function getBook(id: string): Promise<Book | null> {
  const res = await db().from("books").select("*").eq("id", id).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? rowToBook(res.data) : null;
}

export async function upsertBook(b: Partial<Omit<Book, "id" | "created_at">> & { norm_key: string; title: string; author: string; atos: number; word_count: number; points: number }): Promise<Book> {
  const existing = await db().from("books").select("*").eq("norm_key", b.norm_key).maybeSingle();
  if (existing.error) throw new DbError(existing.error.message);
  if (existing.data) return rowToBook(existing.data);
  const row = check(await db().from("books").insert(b).select("*").single()) as Record<string, unknown>;
  return rowToBook(row);
}

export async function getPool(bookId: string, kind: "main" | "bonus"): Promise<Question[] | null> {
  const res = await db().from("question_pools").select("questions").eq("book_id", bookId).eq("kind", kind).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? (res.data.questions as Question[]) : null;
}

export async function savePool(bookId: string, kind: "main" | "bonus", questions: Question[], model: string): Promise<void> {
  check(await db().from("question_pools").upsert({ book_id: bookId, kind, questions, model }));
}

/** Question indexes that have collected enough flags to be retired. */
export async function retiredQuestions(bookId: string, kind: "main" | "bonus", threshold = 2): Promise<Set<number>> {
  const rows = check(await db().from("question_flags").select("question_idx").eq("book_id", bookId).eq("kind", kind));
  const counts = new Map<number, number>();
  for (const r of rows as { question_idx: number }[]) counts.set(r.question_idx, (counts.get(r.question_idx) ?? 0) + 1);
  const out = new Set<number>();
  for (const [idx, n] of counts) if (n >= threshold) out.add(idx);
  return out;
}

export async function addFlag(f: { book_id: string; kind: string; question_idx: number; kid_id: string; attempt_id: string }) {
  check(await db().from("question_flags").insert(f));
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  const res = await db().from("attempts").select("*").eq("id", id).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? rowToAttempt(res.data) : null;
}

export async function getAttemptFor(kidId: string, bookId: string): Promise<Attempt | null> {
  const res = await db().from("attempts").select("*").eq("kid_id", kidId).eq("book_id", bookId).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? rowToAttempt(res.data) : null;
}

export async function insertAttempt(a: Partial<Attempt>): Promise<Attempt> {
  const row = check(await db().from("attempts").insert(a).select("*").single()) as Record<string, unknown>;
  return rowToAttempt(row);
}

export async function updateAttempt(id: string, patch: Partial<Record<keyof Attempt, unknown>>): Promise<void> {
  check(await db().from("attempts").update(patch).eq("id", id));
}

export async function deleteAttempt(id: string): Promise<void> {
  check(await db().from("attempts").delete().eq("id", id));
}

export interface AttemptWithBook extends Attempt {
  book: Book;
}

export async function listAttempts(kidId: string): Promise<AttemptWithBook[]> {
  const rows = check(
    await db().from("attempts").select("*, book:books(*)").eq("kid_id", kidId).order("created_at", { ascending: false }),
  );
  return (rows as Record<string, unknown>[]).map((r) => ({
    ...rowToAttempt(r),
    book: rowToBook(r.book as Record<string, unknown>),
  }));
}

export async function listAllAttempts(): Promise<AttemptWithBook[]> {
  const rows = check(await db().from("attempts").select("*, book:books(*)").order("created_at", { ascending: false }));
  return (rows as Record<string, unknown>[]).map((r) => ({
    ...rowToAttempt(r),
    book: rowToBook(r.book as Record<string, unknown>),
  }));
}

export async function listPlanets(kidId: string): Promise<Planet[]> {
  const rows = check(await db().from("planets").select("*").eq("kid_id", kidId).order("seq"));
  return (rows as Record<string, unknown>[]).map(rowToPlanet);
}

export async function insertPlanet(p: Omit<Planet, "id" | "launched_at">): Promise<Planet> {
  const row = check(await db().from("planets").insert(p).select("*").single()) as Record<string, unknown>;
  return rowToPlanet(row);
}

export async function updatePlanet(id: string, patch: Partial<Planet>): Promise<void> {
  check(await db().from("planets").update(patch).eq("id", id));
}

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

export async function addBolts(kidId: string, amount: number, reason: string): Promise<void> {
  if (amount === 0) return;
  const kid = await getKid(kidId);
  if (!kid) return;
  check(await db().from("kids").update({ bolts: Math.max(0, kid.bolts + amount) }).eq("id", kidId));
  check(await db().from("bolt_ledger").insert({ kid_id: kidId, amount, reason }));
}

export async function listLedger(kidId: string, limit = 40): Promise<LedgerEntry[]> {
  return check(
    await db().from("bolt_ledger").select("*").eq("kid_id", kidId).order("created_at", { ascending: false }).limit(limit),
  ) as LedgerEntry[];
}

export async function deleteLedgerAndBadges(kidId: string) {
  check(await db().from("bolt_ledger").delete().eq("kid_id", kidId));
  check(await db().from("kid_badges").delete().eq("kid_id", kidId));
  check(await db().from("missions").delete().eq("kid_id", kidId));
  check(await db().from("planets").delete().eq("kid_id", kidId));
  check(await db().from("attempts").delete().eq("kid_id", kidId));
}

// ---------- Round two: resolved-book cache, settings, search cache, prep queue, usage ----------
import type { PrepItem, PrepStatus } from "./types";

export async function getBookByKey(key: string): Promise<Book | null> {
  const res = await db().from("books").select("*").eq("norm_key", key).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? rowToBook(res.data) : null;
}

export async function updateBook(id: string, patch: Partial<Record<keyof Book, unknown>>): Promise<void> {
  check(await db().from("books").update(patch).eq("id", id));
}

export async function listBooks(): Promise<Book[]> {
  const rows = check(await db().from("books").select("*").order("created_at"));
  return (rows as Record<string, unknown>[]).map(rowToBook);
}

export async function getSetting(key: string): Promise<string | null> {
  const res = await db().from("settings").select("value").eq("key", key).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? String(res.data.value) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  check(await db().from("settings").upsert({ key, value, updated_at: new Date().toISOString() }));
}

export async function getSearchCache(q: string): Promise<{ provider: string; results: unknown } | null> {
  const res = await db().from("search_cache").select("provider, results").eq("q", q).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return res.data ? { provider: String(res.data.provider), results: res.data.results } : null;
}

export async function putSearchCache(q: string, provider: string, results: unknown): Promise<void> {
  check(await db().from("search_cache").upsert({ q, provider, results }));
}

export async function isSeriesWarmed(name: string): Promise<boolean> {
  const res = await db().from("warmed_series").select("name").eq("name", name).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return Boolean(res.data);
}

export async function insertWarmedSeries(name: string): Promise<void> {
  const res = await db().from("warmed_series").insert({ name });
  if (res.error && res.error.code !== "23505") throw new DbError(res.error.message);
}

export async function logUsage(row: { model: string; purpose: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number; searches: number; cost_usd: number; ms: number }): Promise<void> {
  check(await db().from("api_usage").insert(row));
}

export async function usageSince(iso: string): Promise<{ purpose: string; model: string; calls: number; cost: number; searches: number }[]> {
  const rows = check(await db().from("api_usage").select("purpose, model, cost_usd, searches").gte("created_at", iso)) as { purpose: string; model: string; cost_usd: number | string; searches: number }[];
  const agg = new Map<string, { purpose: string; model: string; calls: number; cost: number; searches: number }>();
  for (const r of rows) {
    const k = `${r.purpose}|${r.model}`;
    const a = agg.get(k) ?? { purpose: r.purpose, model: r.model, calls: 0, cost: 0, searches: 0 };
    a.calls++;
    a.cost += Number(r.cost_usd);
    a.searches += r.searches;
    agg.set(k, a);
  }
  return [...agg.values()].map((a) => ({ ...a, cost: Math.round(a.cost * 1000) / 1000 }));
}

export function usageLastDays(days: number) {
  return usageSince(new Date(Date.now() - days * 864e5).toISOString());
}

export async function listPrep(): Promise<PrepItem[]> {
  return check(await db().from("prep_queue").select("*").order("created_at", { ascending: false }).limit(300)) as PrepItem[];
}

export async function findPrepByBook(bookId: string): Promise<PrepItem | null> {
  const res = await db().from("prep_queue").select("*").eq("book_id", bookId).maybeSingle();
  if (res.error) throw new DbError(res.error.message);
  return (res.data as PrepItem) ?? null;
}

export async function insertPrep(row: { title: string; author: string | null; book_id: string | null; source: string }): Promise<PrepItem> {
  return check(await db().from("prep_queue").insert(row).select("*").single()) as PrepItem;
}

export async function updatePrep(id: string, patch: Partial<PrepItem>): Promise<void> {
  check(await db().from("prep_queue").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id));
}

export async function pendingPrep(limit: number): Promise<PrepItem[]> {
  return check(await db().from("prep_queue").select("*").eq("status", "pending").order("created_at").limit(limit)) as PrepItem[];
}

/** Atomically move a pending row to generating. Returns false if someone else claimed it. */
export async function claimPrep(id: string): Promise<boolean> {
  const res = await db().from("prep_queue").update({ status: "generating" satisfies PrepStatus, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("id");
  if (res.error) throw new DbError(res.error.message);
  return Array.isArray(res.data) && res.data.length > 0;
}

export async function countPrep(status: PrepStatus): Promise<number> {
  const rows = check(await db().from("prep_queue").select("id").eq("status", status)) as { id: string }[];
  return rows.length;
}

export async function getAttemptsForBook(bookId: string): Promise<Attempt[]> {
  const rows = check(await db().from("attempts").select("*").eq("book_id", bookId));
  return (rows as Record<string, unknown>[]).map(rowToAttempt);
}

export async function staleGenerating(before: string): Promise<PrepItem[]> {
  return check(await db().from("prep_queue").select("*").eq("status", "generating").lt("updated_at", before)) as PrepItem[];
}

export async function insertPrepMany(rows: { title: string; author: string | null; book_id: string | null; source: string }[]): Promise<void> {
  if (!rows.length) return;
  check(await db().from("prep_queue").insert(rows));
}
