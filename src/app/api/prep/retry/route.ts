import { updatePrep } from "@/lib/db";
import { body, ok, route, str } from "@/lib/http";
import { kick } from "@/lib/prep";

export const POST = route(async (req) => {
  const b = await body(req);
  await updatePrep(str(b.id, "id"), { status: "pending", error: null });
  kick(new URL(req.url).origin);
  return ok({ ok: true });
});
