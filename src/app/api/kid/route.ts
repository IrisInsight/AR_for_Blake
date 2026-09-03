import { ACCENT_COLORS, AVATARS } from "@/lib/catalog";
import { getKid, updateKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";

/** Things a kid may change about themselves: accent color, avatar, seen the flag tip. */
export const POST = route(async (req) => {
  const b = await body(req);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const patch: Record<string, unknown> = {};
  if (typeof b.accent === "string" && ACCENT_COLORS.some((c) => c.id === b.accent)) patch.accent = b.accent;
  if (typeof b.avatar === "string" && AVATARS.some((a) => a.id === b.avatar)) patch.avatar = b.avatar;
  if (b.seenFlagTip === true) patch.seen_flag_tip = true;
  if (Object.keys(patch).length) await updateKid(kid.id, patch);
  return ok({ ok: true });
});
