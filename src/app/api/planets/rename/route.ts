import { updatePlanet } from "@/lib/db";
import { body, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const name = str(b.name, "Name", 24).replace(/[^\w\s'!\-]/g, "").trim() || "Planet";
  await updatePlanet(str(b.planetId, "planetId"), { name });
  return ok({ name });
});
