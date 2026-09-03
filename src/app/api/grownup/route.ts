import { ACCENT_COLORS } from "@/lib/catalog";
import { deleteAttempt, deleteLedgerAndBadges, getAttempt, getKid, listAttempts, updateAttempt, updateKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";

/** Grown-up corner actions. Not password protected by design (it sits behind a small gear). */
export const POST = route(async (req) => {
  const b = await body(req);
  const action = str(b.action, "action");
  switch (action) {
    case "updateKid": {
      const kid = await getKid(str(b.kidId, "kidId"));
      if (!kid) throw new HttpError(404, "Kid not found");
      const patch: Record<string, unknown> = {};
      if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim().slice(0, 24);
      if (b.grade != null) {
        const g = Number(b.grade);
        if (!Number.isInteger(g) || g < 1 || g > 8) throw new HttpError(400, "Grade must be 1 to 8");
        patch.grade = g;
      }
      if (b.goal != null) {
        const goal = Number(b.goal);
        if (!Number.isFinite(goal) || goal < 1 || goal > 500) throw new HttpError(400, "Goal must be between 1 and 500");
        patch.goal_points = Math.round(goal * 2) / 2;
      }
      if (typeof b.accent === "string" && ACCENT_COLORS.some((c) => c.id === b.accent)) patch.accent = b.accent;
      await updateKid(kid.id, patch);
      return ok({ ok: true });
    }
    case "clearAttempt": {
      // Removes a quiz so the kid can retry. Points, bolts and badges already earned stay earned.
      const attempt = await getAttempt(str(b.attemptId, "attemptId"));
      if (!attempt) throw new HttpError(404, "Quiz not found");
      const kid = await getKid(attempt.kid_id);
      if (kid && attempt.status === "passed") {
        await updateKid(kid.id, { lifetime_points: Math.max(0, Math.round((kid.lifetime_points - attempt.points_earned) * 10) / 10) });
      }
      await deleteAttempt(attempt.id);
      return ok({ ok: true });
    }
    case "resetPeriod": {
      // Start the current rocket over. Books stay in the library but stop counting toward the goal.
      const kid = await getKid(str(b.kidId, "kidId"));
      if (!kid) throw new HttpError(404, "Kid not found");
      const attempts = await listAttempts(kid.id);
      for (const a of attempts) if (a.status === "passed" && !a.planet_id && !a.archived) await updateAttempt(a.id, { archived: true });
      await updateKid(kid.id, { carry_over: 0 });
      return ok({ ok: true });
    }
    case "resetAll": {
      const kid = await getKid(str(b.kidId, "kidId"));
      if (!kid) throw new HttpError(404, "Kid not found");
      await deleteLedgerAndBadges(kid.id);
      await updateKid(kid.id, { bolts: 0, lifetime_points: 0, carry_over: 0, owned: [] });
      return ok({ ok: true });
    }
    default:
      throw new HttpError(400, "Unknown action");
  }
});
