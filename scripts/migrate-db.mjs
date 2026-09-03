#!/usr/bin/env node
// Copy every Reader Rocket table from one Supabase project to another through PostgREST.
// Run the migrations on the target first (supabase/migrations/*.sql), then:
//   SRC_URL=https://xxx.supabase.co SRC_KEY=sb_publishable_... DST_URL=https://yyy.supabase.co DST_KEY=sb_publishable_... node scripts/migrate-db.mjs
// Order matters for foreign keys. Re-running is safe: rows are upserted on their primary keys.
const TABLES = [
  ["kids", "id"],
  ["books", "id"],
  ["question_pools", "book_id,kind"],
  ["planets", "id"],
  ["attempts", "id"],
  ["question_flags", "id"],
  ["kid_badges", "kid_id,badge_id"],
  ["missions", "id"],
  ["bolt_ledger", "id"],
  ["search_cache", "q"],
  ["prep_queue", "id"],
  ["warmed_series", "name"],
  ["settings", "key"],
  ["api_usage", "id"],
];
const { SRC_URL, SRC_KEY, DST_URL, DST_KEY } = process.env;
if (!SRC_URL || !SRC_KEY || !DST_URL || !DST_KEY) {
  console.error("Set SRC_URL, SRC_KEY, DST_URL, DST_KEY");
  process.exit(1);
}
const h = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
async function readAll(table) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SRC_URL}/rest/v1/${table}?select=*&order=${TABLES.find((t) => t[0] === table)[1].split(",")[0]}`, { headers: { ...h(SRC_KEY), Range: `${from}-${from + 999}` } });
    if (!res.ok && res.status !== 206) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}
for (const [table, pk] of TABLES) {
  const rows = await readAll(table);
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${DST_URL}/rest/v1/${table}?on_conflict=${pk}`, { method: "POST", headers: { ...h(DST_KEY), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(chunk) });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
  console.log(`${table}: ${rows.length} rows`);
}
console.log("done. Now set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on Vercel (and in src/lib/db.ts + src/proxy.ts defaults) and redeploy.");
