import { body, ok, route, str } from "@/lib/http";
import { stopReading } from "@/lib/engine";

export const POST = route(async (req) => {
  const b = await body(req);
  return ok(await stopReading(str(b.kidId, "kidId")));
});
