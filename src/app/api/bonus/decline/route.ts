import { getAttempt, updateAttempt } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const attempt = await getAttempt(str(b.attemptId, "attemptId"));
  if (!attempt) throw new HttpError(404, "Quiz not found");
  if (attempt.bonus_status === "available") await updateAttempt(attempt.id, { bonus_status: "declined" });
  return ok({ ok: true });
});
