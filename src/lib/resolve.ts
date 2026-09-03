// Turn a catalog candidate (title, author, pages) into a fully resolved book with level, format and word count.
// Haiku does the lookup; Sonnet steps in when Haiku is unsure. Results are cached forever in `books`.
import { HAIKU, SONNET, extractJson, firstEmoji, mockMode, runWithSearch } from "./ai";
import { bookPoints, FORMAT_IDS, finalWordCount, isFormat, normKey, type BookFormat } from "./ar";
import { getBookByKey, insertWarmedSeries, isSeriesWarmed, upsertBook, updateBook } from "./db";
import { searchCatalog, type Candidate, type Provider } from "./bookapis";
import type { Book } from "./types";
import { knownBook } from "./known";

export interface ResolveInput {
  title: string;
  author: string;
  pages?: number | null;
  year?: number | null;
  cover?: string | null;
}

interface Looked {
  atos: number | null;
  word_count: number | null;
  word_count_source: "ar" | "estimate" | "unknown";
  format: BookFormat | null;
  series: string | null;
  series_number: number | null;
  description: string;
  emoji: string;
  confidence: number;
  level_source?: "ar" | "estimate";
  title?: string;
  author?: string;
  pages?: number | null;
}

const LEVEL_SYSTEM = `You look up reading data for children's books for a family reading app. You are given a title, author, and sometimes a page count and year.

Do this, in order:
1. Search for "<title> <author> AR BookFinder". AR BookFinder (arbookfind.com) lists "ATOS Book Level", "AR Points", "Word Count" and sometimes "Series". Use those numbers when you find them.
   If the first search does not show the word count, search again for "<title> word count" and read the number from a reliable page (arbookfind.com, renaissance.com, readinglength.com, wordsrated.com, a publisher or school library page). A count from one of those pages counts as source "other".
2. Decide the format from what you learn about the book. One of: picture (picture book), graphic_novel (comics, graphic novels, Dog Man, InvestiGators, Amulet, Bone, Narwhal and Jelly), early_reader (leveled readers like Fly Guy, Elephant and Piggie), early_chapter (short chapter books like Magic Tree House, Junie B. Jones, Mercy Watson, Dragon Masters, Press Start), illustrated_novel (notebook-style novels with a drawing on most pages like Diary of a Wimpy Kid, Big Nate, Last Kids on Earth, Captain Underpants, Diary of an 8-Bit Warrior), middle_grade (regular novels for ages 8-12), long_novel (300+ page novels and YA).
3. Return the word count with word_count_source "ar" (AR BookFinder or Renaissance) or "other" (another published count). If you find nothing, set word_count to null and word_count_source "unknown". Never guess or compute a word count yourself.
5. Set level_source to "ar" when the ATOS level came from AR BookFinder or Renaissance, otherwise "estimate".
4. If AR lists no level, estimate the ATOS level from the publisher's age range or a Lexile if found (Lexile 400 ≈ 2.5, 600 ≈ 3.5, 800 ≈ 5.0, 1000 ≈ 7.0) and lower your confidence.

Return only JSON: {"atos": 2.6, "level_source": "ar", "word_count": 4346, "word_count_source": "ar", "format": "graphic_novel", "series": "Dog Man", "series_number": 1, "description": "one spoiler-free sentence for a kid", "emoji": "🐶", "confidence": 0.9}
confidence is 0 to 1: how sure you are that atos and format are right for this exact book.`;

const SERIES_SYSTEM = `You look up children's book series for a family reading app. Given a series name, an author, and a book number, list the NEXT five books in that series (numbers n+1 through n+5), in order. For each, search AR BookFinder for the ATOS book level and word count. Use the same format rules as a librarian would: picture, graphic_novel, early_reader, early_chapter, illustrated_novel, middle_grade, long_novel.

Return only JSON, a list: [{"title": "...", "author": "...", "series_number": 2, "pages": 240, "year": 2017, "atos": 2.6, "word_count": 4900, "word_count_source": "ar", "format": "graphic_novel", "description": "one spoiler-free sentence for a kid", "emoji": "🐶", "confidence": 0.9}]
If the series has no more books after that number, return [].`;

function parseLooked(raw: unknown): Looked | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const atos = Number(r.atos);
  const wc = r.word_count == null ? null : Number(r.word_count);
  const src = r.word_count_source === "ar" || r.word_count_source === "other" ? "ar" : "unknown";
  return {
    atos: Number.isFinite(atos) && atos > 0 ? Math.max(0.5, Math.min(12, Math.round(atos * 10) / 10)) : null,
    word_count: wc != null && Number.isFinite(wc) && wc > 0 ? Math.round(wc) : null,
    word_count_source: src,
    format: isFormat(r.format) ? r.format : null,
    series: r.series ? String(r.series).slice(0, 120) : null,
    series_number: r.series_number == null || r.series_number === "" ? null : Number(r.series_number) || null,
    description: String(r.description ?? "").slice(0, 200),
    emoji: firstEmoji(String(r.emoji ?? "")) ?? "📖",
    confidence: Number.isFinite(Number(r.confidence)) ? Math.max(0, Math.min(1, Number(r.confidence))) : 0.5,
    level_source: r.level_source === "ar" ? "ar" : "estimate",
    title: r.title ? String(r.title).slice(0, 160) : undefined,
    author: r.author ? String(r.author).slice(0, 120) : undefined,
    pages: r.pages == null ? null : Number(r.pages) || null,
  };
}

function describe(input: ResolveInput): string {
  return `Title: ${input.title}\nAuthor: ${input.author}${input.pages ? `\nPages: ${input.pages}` : ""}${input.year ? `\nFirst published: ${input.year}` : ""}`;
}

async function lookup(model: string, input: ResolveInput): Promise<Looked | null> {
  const { text } = await runWithSearch({
    model,
    purpose: model === HAIKU ? "level_haiku" : "level_sonnet",
    system: LEVEL_SYSTEM,
    user: describe(input),
    maxSearches: model === HAIKU ? 4 : 6,
    effort: "medium",
    maxTokens: 1500,
  });
  try {
    return parseLooked(extractJson<unknown>(text));
  } catch {
    return null;
  }
}

export interface ResolveOpts {
  force?: boolean; // bypass the cache
  model?: "haiku" | "sonnet"; // pin a model (verification)
  source?: string;
}

/** Resolve one book. Cached forever by normalized title + author. */
export async function resolveBook(input: ResolveInput, opts: ResolveOpts = {}): Promise<{ book: Book; cached: boolean; model: string; ms: number }> {
  const key = normKey(input.title, input.author);
  if (!opts.force) {
    const cached = await getBookByKey(key);
    if (cached && cached.resolved_at) return { book: cached, cached: true, model: cached.resolved_model ?? "cache", ms: 0 };
  }
  const t0 = Date.now();
  let looked: Looked | null = null;
  let model = mockMode() ? "mock" : HAIKU;
  const known = knownBook(input.title, input.author);
  if (known) {
    model = "known";
    looked = { atos: known.atos, word_count: known.words, word_count_source: "ar", format: known.format, series: known.series ?? null, series_number: known.n ?? null, description: "", emoji: known.emoji ?? "📖", confidence: 1, level_source: "ar" };
  } else if (mockMode()) {
    looked = mockLooked(input);
  } else if (opts.model === "sonnet") {
    model = SONNET;
    looked = await lookup(SONNET, input);
  } else {
    looked = await lookup(HAIKU, input);
    // Haiku is fast but drifts when it has to estimate. Anything not backed by an AR page goes to Sonnet.
    const shaky = !looked || looked.atos == null || looked.format == null || looked.confidence < 0.6 || looked.word_count_source === "unknown" || looked.level_source !== "ar";
    if (shaky && opts.model !== "haiku") {
      model = SONNET;
      const better = await lookup(SONNET, input);
      if (better && better.atos != null) looked = better;
    }
  }
  if (!looked || looked.atos == null) throw new Error("Couldn't find a reading level for that book.");
  const format: BookFormat = looked.format ?? guessFormat(input.pages ?? null);
  const pages = input.pages ?? looked.pages ?? null;
  const wc = finalWordCount(format, pages, looked.word_count, looked.word_count_source);
  const row = {
    norm_key: key,
    title: input.title,
    author: input.author,
    series: looked.series,
    series_number: looked.series_number,
    atos: looked.atos,
    word_count: wc.words,
    description: looked.description || null,
    emoji: looked.emoji,
    points: bookPoints(looked.atos, wc.words),
    source: opts.source ?? "search",
    format,
    page_count: pages,
    year: input.year ?? null,
    cover_url: input.cover ?? null,
    level_source: looked.level_source ?? (looked.confidence >= 0.6 ? "ar" : "estimate"),
    word_count_source: wc.source,
    resolved_model: model,
    resolved_at: new Date().toISOString(),
  };
  const existing = await getBookByKey(key);
  if (existing && !row.description) row.description = existing.description;
  let book: Book;
  if (existing) {
    await updateBook(existing.id, row);
    book = { ...existing, ...row };
  } else {
    book = await upsertBook(row);
  }
  return { book, cached: false, model, ms: Date.now() - t0 };
}

function guessFormat(pages: number | null): BookFormat {
  if (!pages) return "middle_grade";
  if (pages <= 40) return "picture";
  if (pages <= 110) return "early_chapter";
  if (pages <= 260) return "middle_grade";
  return "long_novel";
}

/** Find a book by free text (grown-up prep queue, seeding): catalog search, then resolve the best match. */
export async function resolveByTitle(title: string, author: string | null, provider: Provider, opts: ResolveOpts = {}): Promise<Book> {
  if (author) {
    const direct = await getBookByKey(normKey(title, author));
    if (direct?.resolved_at && !opts.force) return direct;
  }
  const q = author ? `${title} ${author}` : title;
  const res = await searchCatalog(q, provider);
  let pick: Candidate | undefined = res.candidates[0];
  if (author) {
    const last = author.toLowerCase().split(" ").pop() ?? "";
    pick = res.candidates.find((c) => c.author.toLowerCase().includes(last)) ?? pick;
  }
  // When the caller named the author and the catalog agrees, keep the caller's title: it was typed or
  // seeded on purpose, and catalog titles carry noise like "#3 : a Graphic Novel".
  const authorMatched = Boolean(pick && author && pick.author.toLowerCase().includes((author.toLowerCase().split(" ").pop() ?? "")));
  const input: ResolveInput = pick
    ? { title: authorMatched ? title : pick.title, author: authorMatched ? author! : pick.author, pages: pick.pages, year: pick.year, cover: pick.cover }
    : { title, author: author ?? "Unknown" };
  return (await resolveBook(input, opts)).book;
}

/** Warm the next five books of a series in the background. One Haiku call, cached per series. */
export async function warmSeries(series: string, author: string, fromNumber: number): Promise<number> {
  const name = `${series.toLowerCase().trim()}#${fromNumber}`;
  if (await isSeriesWarmed(name)) return 0;
  await insertWarmedSeries(name);
  if (mockMode()) return 0;
  const { text } = await runWithSearch({
    model: HAIKU,
    purpose: "series_warm",
    system: SERIES_SYSTEM,
    user: `Series: ${series}\nAuthor: ${author}\nBook number just read: ${fromNumber}`,
    maxSearches: 6,
    maxTokens: 3000,
  });
  let arr: unknown;
  try {
    arr = extractJson<unknown>(text);
  } catch {
    return 0;
  }
  if (!Array.isArray(arr)) return 0;
  let n = 0;
  for (const raw of arr.slice(0, 5)) {
    const l = parseLooked(raw);
    if (!l || !l.title || l.atos == null) continue;
    const key = normKey(l.title, l.author ?? author);
    if (await getBookByKey(key)) continue;
    const format = l.format ?? "middle_grade";
    const wc = finalWordCount(format, l.pages ?? null, l.word_count, l.word_count_source);
    await upsertBook({
      norm_key: key, title: l.title, author: l.author ?? author, series, series_number: l.series_number,
      atos: l.atos, word_count: wc.words, description: l.description || null, emoji: l.emoji,
      points: bookPoints(l.atos, wc.words), source: "series", format, page_count: l.pages ?? null, year: null,
      cover_url: null, level_source: l.confidence >= 0.6 ? "ar" : "estimate", word_count_source: wc.source,
      resolved_model: HAIKU, resolved_at: new Date().toISOString(),
    });
    n++;
  }
  return n;
}

function mockLooked(input: ResolveInput): Looked {
  const t = input.title.toLowerCase();
  const table: Record<string, Partial<Looked>> = {
    "charlotte's web": { atos: 4.4, word_count: 31938, word_count_source: "ar", format: "middle_grade", emoji: "🕷️" },
    "diary of a wimpy kid": { atos: 5.2, word_count: 19784, word_count_source: "ar", format: "illustrated_novel", series: "Diary of a Wimpy Kid", series_number: 1, emoji: "📓" },
    "dog man": { atos: 2.6, word_count: 4346, word_count_source: "ar", format: "graphic_novel", series: "Dog Man", series_number: 1, emoji: "🐶" },
    investigators: { atos: 2.8, word_count: null, word_count_source: "unknown", format: "graphic_novel", series: "InvestiGators", series_number: 1, emoji: "🐊" },
  };
  const hit = Object.entries(table).find(([k]) => t.includes(k))?.[1] ?? { atos: 3.5, word_count: null, word_count_source: "unknown" as const, format: "middle_grade" as const };
  return { atos: 3.5, word_count: null, word_count_source: "unknown", format: "middle_grade", series: null, series_number: null, description: "A mock description.", emoji: "📖", confidence: 0.9, ...hit } as Looked;
}
export { FORMAT_IDS };
