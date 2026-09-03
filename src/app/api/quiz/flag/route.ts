import { maxFlags } from "@/lib/ar";
import { addFlag, getAttempt, updateAttempt, updateKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const attempt = await getAttempt(str(b.attemptId, "attemptId"));
  if (!attempt) throw new HttpError(404, "Quiz not found");
  if (attempt.status !== "in_progress") throw new HttpError(409, "Quiz already finished");
  const idx = Number(b.idx);
  if (!attempt.question_idxs.includes(idx)) throw new HttpError(400, "Not in this quiz");
  const limit = maxFlags(attempt.question_idxs.length);
  if (attempt.flagged.includes(idx)) return ok({ flagged: attempt.flagged, limit });
  if (attempt.flagged.length >= limit) throw new HttpError(429, `You can only flag ${limit} questions on one quiz.`);
  const flagged = [...attempt.flagged, idx];
  await updateAttempt(attempt.id, { flagged });
  await addFlag({ book_id: attempt.book_id, kind: "main", question_idx: idx, kid_id: attempt.kid_id, attempt_id: attempt.id });
  await updateKid(attempt.kid_id, { seen_flag_tip: true });
  return ok({ flagged, limit });
});
