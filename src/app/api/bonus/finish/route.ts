import { getAttempt, getPool } from "@/lib/db";
import { finishBonus } from "@/lib/engine";
import { body, HttpError, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const attempt = await getAttempt(str(b.attemptId, "attemptId"));
  if (!attempt) throw new HttpError(404, "Quiz not found");
  const pool = await getPool(attempt.book_id, "bonus");
  if (!pool) throw new HttpError(404, "Questions missing");
  return ok(await finishBonus(attempt.id, pool));
});
