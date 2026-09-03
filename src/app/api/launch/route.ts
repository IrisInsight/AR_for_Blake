import { launchRocket } from "@/lib/engine";
import { body, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  return ok(await launchRocket(str(b.kidId, "kidId")));
});
