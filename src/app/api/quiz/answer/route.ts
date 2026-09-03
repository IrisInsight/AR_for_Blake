import { getAttempt, getPool, updateAttempt } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const attempt = await getAttempt(str(b.attemptId, "attemptId"));
  if (!attempt) throw new HttpError(404, "Quiz not found");
  const kind = b.kind === "bonus" ? "bonus" : "main";
  const idx = Number(b.idx);
  const choice = Number(b.choice);
  if (!Number.isInteger(idx) || !Number.isInteger(choice) || choice < 0 || choice > 3) throw new HttpError(400, "Bad answer");
  const idxs = kind === "bonus" ? attempt.bonus_idxs : attempt.question_idxs;
  if (!idxs.includes(idx)) throw new HttpError(400, "That question is not in this quiz");
  if (kind === "main" && attempt.status !== "in_progress") throw new HttpError(409, "Quiz already finished");
  if (kind === "bonus" && attempt.bonus_status !== "in_progress") throw new HttpError(409, "Bonus round not in progress");
  const pool = await getPool(attempt.book_id, kind);
  if (!pool) throw new HttpError(404, "Questions missing");
  const answers = { ...(kind === "bonus" ? attempt.bonus_answers : attempt.answers) };
  if (answers[String(idx)] == null) {
    answers[String(idx)] = choice;
    await updateAttempt(attempt.id, kind === "bonus" ? { bonus_answers: answers } : { answers });
  }
  const correctIdx = pool[idx].answer;
  return ok({ correct: answers[String(idx)] === correctIdx, answer: correctIdx });
});
