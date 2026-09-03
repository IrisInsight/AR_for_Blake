import { ok, route } from "@/lib/http";
import { SEED_TITLES } from "@/lib/seedlist";
import { kick } from "@/lib/prep";
import { insertPrepMany } from "@/lib/db";
import { listPrep } from "@/lib/db";
import { normKey } from "@/lib/ar";

export const maxDuration = 60;

/** Queue every seed title (idempotent) and start the worker. */
export const GET = route(async (req) => {
  const existing = await listPrep();
  const have = new Set(existing.map((p) => normKey(p.title, p.author ?? "")));
  const rows = SEED_TITLES.filter((t) => !have.has(normKey(t.title, t.author))).map((t) => ({ title: t.title, author: t.author, book_id: null, source: "seed" }));
  await insertPrepMany(rows);
  kick(new URL(req.url).origin);
  return ok({ added: rows.length, total: SEED_TITLES.length });
});
