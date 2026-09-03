import { levelLabel } from "@/lib/ar";
import { db, getKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import type { Book } from "@/lib/types";

async function local(qRaw: string, kidId: string) {
  const q = qRaw.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim();
  const kid = await getKid(kidId);
  if (!kid) throw new HttpError(404, "Kid not found");
  if (q.length < 2) return { cards: [] };
  const words = q.split(/\s+/).filter(Boolean);
  const res = await db().from("books").select("*").not("resolved_at", "is", null).ilike("title", `%${words[0]}%`).limit(40);
  if (res.error) throw new HttpError(500, res.error.message);
  const rows = (res.data as Book[]).filter((bk) => {
    const hay = `${bk.title} ${bk.series ?? ""} ${bk.author}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  rows.sort((a, c) => (a.series ?? "").localeCompare(c.series ?? "") || (a.series_number ?? 0) - (c.series_number ?? 0) || a.title.localeCompare(c.title));
  const cards = rows.slice(0, 8).map((bk) => ({
    key: bk.norm_key, title: bk.title, author: bk.author, pages: bk.page_count, year: bk.year, cover: bk.cover_url, provider: "local",
    book: { ...bk, atos: Number(bk.atos), points: Number(bk.points), level: levelLabel(Number(bk.atos), kid.grade) },
  }));
  return { cards };
}

/** Instant matches from books already resolved (seeded series, past reads). Runs before the catalog answers. */
export const POST = route(async (req) => {
  const b = await body(req);
  return ok(await local(str(b.q, "Search", 120), str(b.kidId, "kidId")));
});

export const GET = route(async (req) => {
  const u = new URL(req.url);
  return ok(await local(str(u.searchParams.get("q"), "Search", 120), u.searchParams.get("kidId") ?? "blake"));
});
