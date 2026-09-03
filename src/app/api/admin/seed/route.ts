import { ok, route } from "@/lib/http";
import { SEED_TITLES } from "@/lib/seedlist";
import { enqueue, kick } from "@/lib/prep";
import { listPrep } from "@/lib/db";
import { normKey } from "@/lib/ar";

export const maxDuration = 60;

/** Queue every seed title (idempotent) and start the worker. */
export const GET = route(async (req) => {
  const existing = await listPrep();
  const have = new Set(existing.map((p) => normKey(p.title, p.author ?? "")));
  let added = 0;
  for (const t of SEED_TITLES) {
    if (have.has(normKey(t.title, t.author))) continue;
    await enqueue(t.title, t.author, "seed", null);
    added++;
  }
  kick(new URL(req.url).origin);
  return ok({ added, total: SEED_TITLES.length });
});
