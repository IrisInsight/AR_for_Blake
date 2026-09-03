import { lookupBooks } from "@/lib/ai";
import { bookPoints, levelLabel } from "@/lib/ar";
import { getKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import type { BookCandidate } from "@/lib/types";

export const maxDuration = 120;

export const POST = route(async (req) => {
  const b = await body(req);
  const q = str(b.q, "Search", 120);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const raw = await lookupBooks(q);
  const results: BookCandidate[] = raw.map((r) => {
    const points = bookPoints(r.atos, r.word_count);
    return { ...r, points, level: levelLabel(r.atos, kid.grade) };
  });
  return ok({ results });
});
