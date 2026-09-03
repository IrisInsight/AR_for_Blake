import { maxFlags } from "@/lib/ar";
import { getAttempt, getBook, getKid, getPool } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { toClient } from "@/lib/quiz";

/** Resume an in-progress quiz or bonus round. */
export const GET = route(async (req, { params }) => {
  const { id } = await params;
  const kind = new URL(req.url).searchParams.get("kind") === "bonus" ? "bonus" : "main";
  const attempt = await getAttempt(id);
  if (!attempt) throw new HttpError(404, "Quiz not found");
  const [pool, kid, book] = await Promise.all([getPool(attempt.book_id, kind), getKid(attempt.kid_id), getBook(attempt.book_id)]);
  if (!pool || !kid || !book) throw new HttpError(404, "Quiz not found");
  const idxs = kind === "bonus" ? attempt.bonus_idxs : attempt.question_idxs;
  return ok({
    attemptId: attempt.id,
    status: attempt.status,
    bonusStatus: attempt.bonus_status,
    book: { id: book.id, title: book.title, emoji: book.emoji, points: book.points },
    questions: toClient(pool, idxs),
    answers: kind === "bonus" ? attempt.bonus_answers : attempt.answers,
    flagged: attempt.flagged,
    maxFlags: maxFlags(attempt.question_idxs.length),
    showTip: !kid.seen_flag_tip,
  });
});
