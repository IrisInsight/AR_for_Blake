import { ACCENT_COLORS } from "@/lib/catalog";
import { activeSession, getKid, updateKid, updateSession, wipeKid } from "@/lib/db";
import { addMinutes, removeSession, stopReading } from "@/lib/engine";
import { body, HttpError, ok, route, str } from "@/lib/http";

/** Grown-up corner actions. Not password protected by design (the family code gates the whole app). */
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
        if (!Number.isFinite(goal) || goal < 25 || goal > 5000) throw new HttpError(400, "Goal must be between 25 and 5000 points");
        patch.goal_points = Math.round(goal);
      }
      if (typeof b.accent === "string" && ACCENT_COLORS.some((c) => c.id === b.accent)) patch.accent = b.accent;
      await updateKid(kid.id, patch);
      return ok({ ok: true });
    }
    case "addMinutes": {
      const minutes = Number(b.minutes);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 300) throw new HttpError(400, "Minutes must be 1 to 300");
      const when = typeof b.when === "string" && !Number.isNaN(Date.parse(b.when)) ? new Date(b.when) : new Date();
      const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 80) : null;
      return ok(await addMinutes(str(b.kidId, "kidId"), minutes, note, when));
    }
    case "stopTimer": {
      const kidId = str(b.kidId, "kidId");
      if (!(await activeSession(kidId))) return ok({ ok: true });
      return ok(await stopReading(kidId));
    }
    case "cancelTimer": {
      // Ends the running timer without crediting any minutes.
      const s = await activeSession(str(b.kidId, "kidId"));
      if (s) await updateSession(s.id, { ended_at: new Date().toISOString(), minutes: 0, note: "cancelled by a grown-up" });
      return ok({ ok: true });
    }
    case "deleteSession": {
      await removeSession(str(b.sessionId, "sessionId"));
      return ok({ ok: true });
    }
    case "addSpins": {
      // A one-off bonus, e.g. a reward for a library visit.
      const kid = await getKid(str(b.kidId, "kidId"));
      if (!kid) throw new HttpError(404, "Kid not found");
      const n = Number(b.spins);
      if (!Number.isInteger(n) || n < 1 || n > 100) throw new HttpError(400, "Spins must be 1 to 100");
      await updateKid(kid.id, { spins_bank: kid.spins_bank + n });
      return ok({ ok: true });
    }
    case "resetAll": {
      const kid = await getKid(str(b.kidId, "kidId"));
      if (!kid) throw new HttpError(404, "Kid not found");
      await wipeKid(kid.id);
      await updateKid(kid.id, { bolts: 0, lifetime_points: 0, carry_over: 0, owned: [], spins_bank: 0, carry_seconds: 0, level: 0, lifetime_minutes: 0 });
      return ok({ ok: true });
    }
    default:
      throw new HttpError(400, "Unknown action");
  }
});
