import { getAttempt, getBook, updateAttempt } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import { ensurePool, pickQuestions, toClient } from "@/lib/quiz";

export const maxDuration = 300;

export const POST = route(async (req) => {
  const b = await body(req);
  const attempt = await getAttempt(str(b.attemptId, "attemptId"));
  if (!attempt) throw new HttpError(404, "Quiz not found");
  if (attempt.status !== "passed") throw new HttpError(409, "Bonus rounds are for passed quizzes");
  const book = await getBook(attempt.book_id);
  if (!book) throw new HttpError(404, "Book not found");
  if (attempt.bonus_status !== "available" && attempt.bonus_status !== "in_progress") throw new HttpError(409, "Bonus round already used");
  const pool = await ensurePool(book, "bonus");
  let idxs = attempt.bonus_idxs;
  if (attempt.bonus_status === "available" || !idxs.length) {
    idxs = await pickQuestions(book, "bonus", pool);
    await updateAttempt(attempt.id, { bonus_status: "in_progress", bonus_idxs: idxs, bonus_answers: {} });
  }
  return ok({ attemptId: attempt.id, questions: toClient(pool, idxs), answers: attempt.bonus_status === "in_progress" ? attempt.bonus_answers : {} });
});
