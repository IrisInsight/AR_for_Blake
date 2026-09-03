import { levelLabel, maxFlags } from "@/lib/ar";
import { getAttemptFor, getBook, getKid, insertAttempt } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import { ensurePool, pickQuestions, toClient } from "@/lib/quiz";

export const maxDuration = 300;

export const POST = route(async (req) => {
  const b = await body(req);
  const kid = await getKid(str(b.kidId, "kidId"));
  const book = await getBook(str(b.bookId, "bookId"));
  if (!kid || !book) throw new HttpError(404, "Not found");
  const existing = await getAttemptFor(kid.id, book.id);
  if (existing && existing.status !== "in_progress") throw new HttpError(409, "This quiz was already taken.");
  const pool = await ensurePool(book, "main");
  let attempt = existing;
  if (!attempt) {
    const idxs = await pickQuestions(book, "main", pool);
    if (idxs.length < 3) throw new HttpError(500, "Not enough questions for this book yet.");
    attempt = await insertAttempt({ kid_id: kid.id, book_id: book.id, question_idxs: idxs, level_label: levelLabel(book.atos, kid.grade) });
  }
  return ok({
    attemptId: attempt.id,
    questions: toClient(pool, attempt.question_idxs),
    answers: attempt.answers,
    flagged: attempt.flagged,
    maxFlags: maxFlags(attempt.question_idxs.length),
    showTip: !kid.seen_flag_tip,
  });
});
