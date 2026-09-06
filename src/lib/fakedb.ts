// In-memory stand-in for the Supabase client, used only when RR_FAKE_DB=1 (local development
// without network access). It implements just the query-builder surface db.ts uses.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
const g = globalThis as unknown as { __rrTables?: Record<string, Row[]> };
const tables: Record<string, Row[]> = g.__rrTables ?? (g.__rrTables = {
  kids: [
    { id: "blake", name: "Blake", grade: 3, goal_points: 250, accent: "#ff7a1a", avatar: "astronaut", bolts: 0, lifetime_points: 0, carry_over: 0, owned: [], sort_order: 0, spins_bank: 0, carry_seconds: 0, level: 0, lifetime_minutes: 0, created_at: new Date().toISOString(), machine: { cabinet: "red", theme: "classic", lever: "red", lights: "gold", name: "Blake's Jackpot" } },
  ],
  reading_sessions: [], spins: [], jackpots: [], kid_badges: [], missions: [], bolt_ledger: [],
  settings: [{ key: "family_code", value: "TESTCODE", updated_at: new Date().toISOString() }],
});
const defaults: Record<string, () => Row> = {
  reading_sessions: () => ({ id: randomUUID(), started_at: new Date().toISOString(), ended_at: null, minutes: 0, source: "timer", note: null, created_at: new Date().toISOString() }),
  spins: () => ({ id: randomUUID(), coins: 0, jackpot_id: null, created_at: new Date().toISOString() }),
  jackpots: () => ({ id: randomUUID(), hit_at: new Date().toISOString() }),
  kid_badges: () => ({ earned_at: new Date().toISOString() }),
  missions: () => ({ id: randomUUID(), progress: 0, completed_at: null, created_at: new Date().toISOString() }),
  bolt_ledger: () => ({ id: Date.now() + Math.random(), created_at: new Date().toISOString() }),
  settings: () => ({ updated_at: new Date().toISOString() }),
  kids: () => ({}),
};
const pks: Record<string, string[]> = { kids: ["id"], reading_sessions: ["id"], spins: ["id"], jackpots: ["id"], kid_badges: ["kid_id", "badge_id"], missions: ["id"], bolt_ledger: ["id"], settings: ["key"] };
const uniques: Record<string, string[][]> = { missions: [["kid_id", "week_start", "kind"]] };

class Builder {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filters: [string, any][] = [];
  private isNull: [string, boolean][] = [];
  private orders: [string, boolean][] = [];
  private lim: number | null = null;
  private payload: any = null;
  private wantSingle: "single" | "maybe" | null = null;
  private returning = false;
  constructor(private table: string) {}
  select() { if (this.op !== "select") this.returning = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push([c, v]); return this; }
  is(c: string, v: any) { this.isNull.push([c, v === null]); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orders.push([c, o?.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.wantSingle = "single"; return this; }
  maybeSingle() { this.wantSingle = "maybe"; return this; }
  private match(r: Row) { return this.filters.every(([c, v]) => r[c] === v) && this.isNull.every(([c, n]) => (r[c] == null) === n); }
  then(res: (v: any) => void, rej?: (e: any) => void) {
    try { res(this.run()); } catch (e) { if (rej) rej(e); else throw e; }
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
          if (this.op === "insert") return { data: null, error: { message: "duplicate key", code: "23505" } };
          Object.assign(existing, r); out.push(existing); continue;
        }
        for (const u of uniques[this.table] ?? []) if (t.some((x) => u.every((k) => x[k] === r[k]))) return { data: null, error: { message: "duplicate key", code: "23505" } };
        t.push(r); out.push(r);
      }
      return this.finish(out);
    }
    if (this.op === "update") {
      const out: Row[] = [];
      for (const r of t) if (this.match(r)) { Object.assign(r, this.payload); out.push(r); }
      return this.finish(out);
    }
    if (this.op === "delete") {
      tables[this.table] = t.filter((r) => !this.match(r));
      return { data: null, error: null };
    }
    let rows = t.filter((r) => this.match(r));
    for (const [c, asc] of [...this.orders].reverse()) rows = rows.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
    if (this.lim != null) rows = rows.slice(0, this.lim);
    return this.finish(rows);
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
