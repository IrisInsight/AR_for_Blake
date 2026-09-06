import { CATALOG, DEFAULT_MACHINE, ownsItem, type Category } from "@/lib/catalog";
import { getKid, updateKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import type { Machine } from "@/lib/types";
import { cleanName, isClean } from "@/lib/wordfilter";

/** Save the machine's look. Every part must be free or owned. */
export const POST = route(async (req) => {
  const b = await body(req);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const m = (b.machine ?? {}) as Partial<Machine>;
  const cur = kid.machine;
  const pick = (cat: Category, v: unknown, fallback: string) => {
    const val = String(v ?? fallback);
    const it = CATALOG.find((i) => i.category === cat && i.value === val);
    return it && ownsItem(kid.owned, it) ? val : fallback;
  };
  const wanted = cleanName(String(m.name ?? cur.name ?? DEFAULT_MACHINE.name));
  if (wanted && !isClean(wanted)) throw new HttpError(400, "That name isn't allowed on the machine. Pick another.");
  const machine: Machine = {
    cabinet: pick("cabinet", m.cabinet, cur.cabinet),
    theme: pick("theme", m.theme, cur.theme),
    lever: pick("lever", m.lever, cur.lever),
    lights: pick("lights", m.lights, cur.lights),
    name: wanted || cur.name,
  };
  await updateKid(kid.id, { machine });
  return ok({ machine });
});
