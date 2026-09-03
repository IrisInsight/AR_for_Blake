import { CATALOG, DEFAULT_ROCKET, PATCH_COLORS, ownsItem, type Category } from "@/lib/catalog";
import { getKid, updateKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import type { RocketConfig } from "@/lib/types";

/** Save a rocket config. Every chosen part must be free or owned. */
export const POST = route(async (req) => {
  const b = await body(req);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const r = (b.rocket ?? {}) as Partial<RocketConfig>;
  const pick = (cat: Category, v: unknown, fallback: string) => {
    const val = String(v ?? fallback);
    const item = CATALOG.find((i) => i.category === cat && i.value === val);
    return item && ownsItem(kid.owned, item) ? val : fallback;
  };
  const cur = kid.rocket;
  const patch = r.patch ?? cur.patch;
  const color = (c: unknown, fb: string) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) && PATCH_COLORS.includes(c.toLowerCase()) ? c.toLowerCase() : fb);
  const rocket: RocketConfig = {
    hull: pick("hull", r.hull, cur.hull),
    nose: pick("nose", r.nose, cur.nose) as RocketConfig["nose"],
    fins: pick("fins", r.fins, cur.fins) as RocketConfig["fins"],
    decal: pick("decal", r.decal, cur.decal) as RocketConfig["decal"],
    booster: pick("booster", r.booster, cur.booster) as RocketConfig["booster"],
    engine: pick("engine", r.engine, cur.engine) as RocketConfig["engine"],
    exhaust: pick("exhaust", r.exhaust, cur.exhaust) as RocketConfig["exhaust"],
    name: String(r.name ?? cur.name ?? DEFAULT_ROCKET.name).replace(/[^\w\s'!\-]/g, "").trim().slice(0, 14) || cur.name,
    patch: {
      shape: pick("patch_shape", patch.shape, cur.patch.shape) as RocketConfig["patch"]["shape"],
      icon: pick("patch_icon", patch.icon, cur.patch.icon),
      c1: color(patch.c1, cur.patch.c1),
      c2: color(patch.c2, cur.patch.c2),
    },
  };
  await updateKid(kid.id, { rocket });
  return ok({ rocket });
});
