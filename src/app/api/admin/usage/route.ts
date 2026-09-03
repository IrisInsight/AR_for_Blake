import { ok, route } from "@/lib/http";
import { usageSince } from "@/lib/db";

export const GET = route(async (req) => {
  const since = new URL(req.url).searchParams.get("since") ?? new Date(Date.now() - 7 * 864e5).toISOString();
  const rows = await usageSince(since);
  const total = Math.round(rows.reduce((s, r) => s + r.cost, 0) * 1000) / 1000;
  return ok({ since, total_usd: total, rows });
});
