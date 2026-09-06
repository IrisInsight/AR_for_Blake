import { CATALOG, unlockMet } from "@/lib/catalog";
import { addCoins, getKid, updateKid } from "@/lib/db";
import { kidState } from "@/lib/engine";
import { body, HttpError, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const item = CATALOG.find((i) => i.id === b.itemId);
  if (!item) throw new HttpError(404, "Item not found");
  if (item.price === 0 || kid.owned.includes(item.id)) return ok({ coins: kid.bolts, owned: kid.owned });
  const state = await kidState(kid.id);
  if (!state || !unlockMet(item.unlock, state.milestones)) throw new HttpError(403, "That one is still locked.");
  if (kid.bolts < item.price) throw new HttpError(402, "Not enough coins yet.");
  const owned = [...kid.owned, item.id];
  await updateKid(kid.id, { owned });
  await addCoins(kid.id, -item.price, `Bought ${item.label}`);
  return ok({ coins: kid.bolts - item.price, owned });
});
