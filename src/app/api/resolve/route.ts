import { after } from "next/server";
import { levelLabel } from "@/lib/ar";
import { getKid } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import { resolveBook, warmSeries } from "@/lib/resolve";

export const maxDuration = 120;

/** Level, format, word count and points for one candidate. Cached forever; warms the series behind it. */
export const POST = route(async (req) => {
  const b = await body(req);
  return resolve(b);
});

export const GET = route(async (req) => {
  const u = new URL(req.url);
  return resolve(Object.fromEntries(u.searchParams.entries()));
});

async function resolve(b: Record<string, unknown>) {
  const kid = await getKid(str(b.kidId ?? "blake", "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const input = {
    title: str(b.title, "Title", 160),
    author: str(b.author, "Author", 120),
    pages: b.pages == null ? null : Number(b.pages) || null,
    year: b.year == null ? null : Number(b.year) || null,
    cover: typeof b.cover === "string" ? b.cover.slice(0, 300) : null,
  };
  const { book, cached, model, ms } = await resolveBook(input);
  if (!cached && book.series && book.series_number) {
    const series = book.series;
    const n = book.series_number;
    const author = book.author;
    after(async () => {
      try {
        await warmSeries(series, author, n);
      } catch (e) {
        console.error("series warm failed", e);
      }
    });
  }
  return ok({ book: { ...book, level: levelLabel(book.atos, kid.grade) }, cached, model, ms });
}
