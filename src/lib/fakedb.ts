// In-memory stand-in for the Supabase client, used only when RR_FAKE_DB=1 (local development
// without network access). It implements just the query-builder surface db.ts uses.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
const g = globalThis as unknown as { __rrTables?: Record<string, Row[]> };
const tables: Record<string, Row[]> = g.__rrTables ?? (g.__rrTables = {
  kids: [
    { id: "blake", name: "Blake", grade: 3, goal_points: 20, accent: "#ff7a1a", avatar: "astronaut", bolts: 0, lifetime_points: 0, carry_over: 0, owned: [], seen_flag_tip: false, sort_order: 0, created_at: new Date().toISOString(), rocket: { hull: "red", nose: "cone", fins: "swept", decal: "none", booster: "none", engine: "standard", exhaust: "orange", name: "Blake 1", patch: { shape: "circle", icon: "rocket", c1: "#ff7a1a", c2: "#1b2a4a" } } },
  ],
  books: [], question_pools: [], planets: [], attempts: [], question_flags: [], kid_badges: [], missions: [], bolt_ledger: [],
  search_cache: [], prep_queue: [], warmed_series: [], api_usage: [],
  settings: [{ key: "family_code", value: "TESTCODE", updated_at: new Date().toISOString() }, { key: "books_provider", value: "openlibrary", updated_at: new Date().toISOString() }],
});
const defaults: Record<string, () => Row> = {
  books: () => ({ id: randomUUID(), created_at: new Date().toISOString(), series: null, series_number: null, description: null, emoji: "📖", source: "search", format: null, page_count: null, year: null, cover_url: null, level_source: null, word_count_source: null, resolved_model: null, resolved_at: null }),
  planets: () => ({ id: randomUUID(), launched_at: new Date().toISOString() }),
  attempts: () => ({ id: randomUUID(), status: "in_progress", answers: {}, flagged: [], points_earned: 0, bolts_earned: 0, bonus_status: null, bonus_idxs: [], bonus_answers: {}, planet_id: null, archived: false, created_at: new Date().toISOString(), completed_at: null }),
  question_flags: () => ({ id: Math.floor(Math.random() * 1e9), created_at: new Date().toISOString() }),
  kid_badges: () => ({ earned_at: new Date().toISOString() }),
  missions: () => ({ id: randomUUID(), progress: 0, completed_at: null, created_at: new Date().toISOString() }),
  bolt_ledger: () => ({ id: Date.now() + Math.random(), created_at: new Date().toISOString() }),
  question_pools: () => ({ created_at: new Date().toISOString() }),
  kids: () => ({}),
  search_cache: () => ({ created_at: new Date().toISOString() }),
  prep_queue: () => ({ id: randomUUID(), status: "pending", book_id: null, error: null, tries: 0, source: "grownup", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  warmed_series: () => ({ created_at: new Date().toISOString() }),
  api_usage: () => ({ id: Date.now() + Math.random(), created_at: new Date().toISOString() }),
  settings: () => ({ updated_at: new Date().toISOString() }),
};
const pks: Record<string, string[]> = { kids: ["id"], books: ["id"], question_pools: ["book_id", "kind"], planets: ["id"], attempts: ["id"], question_flags: ["id"], kid_badges: ["kid_id", "badge_id"], missions: ["id"], bolt_ledger: ["id"], search_cache: ["q"], prep_queue: ["id"], warmed_series: ["name"], api_usage: ["id"], settings: ["key"] };
const uniques: Record<string, string[][]> = { books: [["norm_key"]], attempts: [["kid_id", "book_id"]], missions: [["kid_id", "week_start", "kind"]] };

class Builder {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filters: [string, any][] = [];
  private orders: [string, boolean][] = [];
  private lim: number | null = null;
  private payload: any = null;
  private wantSingle: "single" | "maybe" | null = null;
  private cols = "*";
  private returning = false;
  constructor(private table: string) {}
  select(cols = "*") {
    if (this.op === "select") this.cols = cols;
    else this.returning = true;
    return this;
  }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push([c, v]); return this; }
  gte(c: string, v: any) { this.gtes.push([c, v]); return this; }
  lt(c: string, v: any) { this.lts.push([c, v]); return this; }
  not(c: string, op: string, v: any) { if (op === "is" && v === null) this.notNull.push(c); return this; }
  ilike(c: string, pat: string) { this.ilikes.push([c, pat.replace(/%/g, "").toLowerCase()]); return this; }
  private gtes: [string, any][] = [];
  private lts: [string, any][] = [];
  private notNull: string[] = [];
  private ilikes: [string, string][] = [];
  order(c: string, o?: { ascending?: boolean }) { this.orders.push([c, o?.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.wantSingle = "single"; return this; }
  maybeSingle() { this.wantSingle = "maybe"; return this; }
  private match(r: Row) {
    return this.filters.every(([c, v]) => r[c] === v) && this.gtes.every(([c, v]) => r[c] >= v) && this.lts.every(([c, v]) => r[c] < v)
      && this.notNull.every((c) => r[c] != null) && this.ilikes.every(([c, p]) => String(r[c] ?? "").toLowerCase().includes(p));
  }
  private project(r: Row): Row {
    const out = { ...r };
    const m = this.cols.match(/(\w+):(\w+)\(\*\)/);
    if (m) {
      const [, alias, tbl] = m;
      out[alias] = tables[tbl].find((x) => x.id === r[`${alias}_id`]) ?? null;
    }
    return out;
  }
  then(res: (v: any) => void, rej?: (e: any) => void) {
    try {
      res(this.run());
    } catch (e) {
      if (rej) rej(e); else throw e;
    }
  }
  private run() {
    const t = tables[this.table];
    if (!t) return { data: null, error: { message: `no table ${this.table}` } };
    if (this.op === "insert" || this.op === "upsert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p: Row) => ({ ...defaults[this.table]?.(), ...p }));
      const out: Row[] = [];
      for (const r of rows) {
        const pk = pks[this.table];
        const existing = t.find((x) => pk.every((k) => x[k] === r[k]));
        if (existing) {
          if (this.op === "insert") return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
          Object.assign(existing, r);
          out.push(existing);
          continue;
        }
        for (const u of uniques[this.table] ?? []) {
          if (t.some((x) => u.every((k) => x[k] === r[k]))) return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
        }
        t.push(r);
        out.push(r);
      }
      return this.finish(out.map((r) => this.project(r)));
    }
    if (this.op === "update") {
      const out: Row[] = [];
      for (const r of t) if (this.match(r)) { Object.assign(r, this.payload); out.push(r); }
      return this.finish(out);
    }
    if (this.op === "delete") {
      const keep = t.filter((r) => !this.match(r));
      const removed = t.length - keep.length;
      tables[this.table] = keep;
      return { data: null, error: null, count: removed };
    }
    let rows = t.filter((r) => this.match(r));
    for (const [c, asc] of [...this.orders].reverse()) rows = rows.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
    if (this.lim != null) rows = rows.slice(0, this.lim);
    return this.finish(rows.map((r) => this.project(r)));
  }
  private finish(rows: Row[]) {
    const clone = JSON.parse(JSON.stringify(rows));
    if (this.wantSingle === "single") return rows.length === 1 ? { data: clone[0], error: null } : { data: null, error: { message: `expected one row, got ${rows.length}` } };
    if (this.wantSingle === "maybe") return { data: clone[0] ?? null, error: null };
    return { data: clone, error: null };
  }
}

export function createFakeClient(): any {
  return { from: (table: string) => new Builder(table) };
}
