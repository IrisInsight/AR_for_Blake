import { bookPoints, LENGTH_BUCKETS, normKey, type LengthBucket } from "@/lib/ar";
import { getKid, upsertBook } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const title = str(b.title, "Title", 160);
  const author = str(b.author, "Author", 120);
  let atos = Number(b.atos);
  if (!Number.isFinite(atos)) throw new HttpError(400, "Level is required");
  atos = Math.max(0.5, Math.min(12, Math.round(atos * 10) / 10));
  let wordCount = Number(b.word_count);
  const source = b.source === "manual" ? "manual" : "search";
  if (source === "manual") {
    const bucket = String(b.length ?? "novel") as LengthBucket;
    wordCount = LENGTH_BUCKETS[bucket]?.words ?? LENGTH_BUCKETS.novel.words;
  }
  if (!Number.isFinite(wordCount) || wordCount <= 0) throw new HttpError(400, "Word count is required");
  const fmt = source === "manual" ? ({ picture: "picture", early: "early_chapter", novel: "middle_grade", long: "long_novel" } as Record<string, string>)[String(b.length ?? "novel")] ?? "middle_grade" : null;
  const book = await upsertBook({
    norm_key: normKey(title, author),
    format: fmt,
    level_source: source === "manual" ? "manual" : null,
    word_count_source: source === "manual" ? "estimate" : null,
    resolved_at: source === "manual" ? new Date().toISOString() : null,
    title,
    author,
    series: b.series ? String(b.series).slice(0, 120) : null,
    series_number: b.series_number == null || b.series_number === "" ? null : Number(b.series_number),
    atos,
    word_count: Math.round(wordCount),
    description: b.description ? String(b.description).slice(0, 240) : null,
    emoji: b.emoji ? String(b.emoji).slice(0, 8) : "📖",
    points: bookPoints(atos, wordCount),
    source,
  });
  return ok({ bookId: book.id });
});
