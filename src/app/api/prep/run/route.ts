import { ok, route } from "@/lib/http";
import { runQueue } from "@/lib/prep";
import { listPrep } from "@/lib/db";

export const maxDuration = 300;

export const POST = route(async (req) => {
  const origin = new URL(req.url).origin;
  return ok(await runQueue(origin));
});

/** Status for the grown-up corner. */
export const GET = route(async () => {
  const items = await listPrep();
  const counts = { pending: 0, generating: 0, ready: 0, failed: 0 };
  for (const i of items) counts[i.status]++;
  return ok({ items, counts });
});
