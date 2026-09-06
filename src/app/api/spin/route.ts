import { body, ok, route, str } from "@/lib/http";
import { doSpin } from "@/lib/engine";

export const POST = route(async (req) => {
  const b = await body(req);
  return ok(await doSpin(str(b.kidId, "kidId")));
});
