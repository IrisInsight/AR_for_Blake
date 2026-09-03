import { after } from "next/server";
import { getAttempt, getBook, getPool } from "@/lib/db";
import { finishAttempt } from "@/lib/engine";
import { body, HttpError, ok, route, str } from "@/lib/http";
import { ensurePool } from "@/lib/quiz";
import { hasApiKey, mockMode } from "@/lib/ai";

export const maxDuration = 300;

export const POST = route(async (req) => {
  const b = await body(req);
  const attempt = await getAttempt(str(b.attemptId, "attemptId"));
  if (!attempt) throw new HttpError(404, "Quiz not found");
  const pool = await getPool(attempt.book_id, "main");
  if (!pool) throw new HttpError(404, "Questions missing");
  const result = await finishAttempt(attempt.id, pool);
  if (result.passed && result.bonusAvailable && (hasApiKey() || mockMode())) {
    // Warm the bonus pool while the celebration plays.
    after(async () => {
      try {
        const book = await getBook(attempt.book_id);
        if (book) await ensurePool(book, "bonus");
      } catch (e) {
        console.error("bonus warm failed", e);
      }
    });
  }
  return ok(result);
});
