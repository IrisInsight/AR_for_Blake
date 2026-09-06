import { body, ok, route, str } from "@/lib/http";
import { startReading } from "@/lib/engine";

export const POST = route(async (req) => {
  const b = await body(req);
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 80) : null;
  return ok({ session: await startReading(str(b.kidId, "kidId"), note) });
});
