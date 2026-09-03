// Fast candidate lookup from public book catalogs. No AI here; Claude only adds level and word count later.
import { normKey } from "./ar";

export interface Candidate {
  key: string; // norm_key
  title: string;
  author: string;
  pages: number | null;
  year: number | null;
  cover: string | null;
  provider: "openlibrary" | "google";
}

export type Provider = "openlibrary" | "google";

const UA = "ReaderRocket/1.0 (family reading app)";

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Strip subtitle noise like "(Dog Man #1)" or ": A Graphic Novel" for the dedupe key. */
function baseTitle(t: string): string {
  return clean(t.replace(/\s*[\(\[].*?[\)\]]\s*/g, " ").split(":")[0]);
}

export async function searchOpenLibrary(q: string, limit = 8): Promise<Candidate[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit * 2));
  url.searchParams.set("language", "eng");
  url.searchParams.set("fields", "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,edition_count");
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as { docs: Record<string, unknown>[] };
  const out: Candidate[] = [];
  for (const d of data.docs ?? []) {
    const title = clean(String(d.title ?? ""));
    const author = Array.isArray(d.author_name) ? clean(String(d.author_name[0] ?? "")) : "";
    if (!title || !author) continue;
    out.push({
      key: normKey(baseTitle(title), author),
      title,
      author,
      pages: typeof d.number_of_pages_median === "number" ? d.number_of_pages_median : null,
      year: typeof d.first_publish_year === "number" ? d.first_publish_year : null,
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      provider: "openlibrary",
    });
  }
  return dedupe(out).slice(0, limit);
}

export async function searchGoogleBooks(q: string, limit = 8): Promise<Candidate[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(Math.min(20, limit * 2)));
  url.searchParams.set("printType", "books");
  url.searchParams.set("langRestrict", "en");
  if (process.env.GOOGLE_BOOKS_KEY) url.searchParams.set("key", process.env.GOOGLE_BOOKS_KEY);
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const data = (await res.json()) as { items?: { volumeInfo: Record<string, unknown> }[] };
  const out: Candidate[] = [];
  for (const it of data.items ?? []) {
    const v = it.volumeInfo ?? {};
    const title = clean(String(v.title ?? ""));
    const author = Array.isArray(v.authors) ? clean(String(v.authors[0] ?? "")) : "";
    if (!title || !author) continue;
    const links = (v.imageLinks as Record<string, string>) ?? {};
    const yr = String(v.publishedDate ?? "").slice(0, 4);
    out.push({
      key: normKey(baseTitle(title), author),
      title,
      author,
      pages: typeof v.pageCount === "number" && v.pageCount > 0 ? v.pageCount : null,
      year: /^\d{4}$/.test(yr) ? Number(yr) : null,
      cover: (links.thumbnail ?? links.smallThumbnail ?? null)?.replace(/^http:/, "https:") ?? null,
      provider: "google",
    });
  }
  return dedupe(out).slice(0, limit);
}

function dedupe(list: Candidate[]): Candidate[] {
  const seen = new Map<string, Candidate>();
  for (const c of list) {
    const prev = seen.get(c.key);
    if (!prev) seen.set(c.key, c);
    else if (!prev.pages && c.pages) seen.set(c.key, { ...c, cover: prev.cover ?? c.cover });
  }
  return [...seen.values()];
}

export interface ProviderResult {
  provider: Provider;
  ms: number;
  candidates: Candidate[];
  error?: string;
}

export async function timed(provider: Provider, q: string): Promise<ProviderResult> {
  const t0 = Date.now();
  try {
    const candidates = provider === "openlibrary" ? await searchOpenLibrary(q) : await searchGoogleBooks(q);
    return { provider, ms: Date.now() - t0, candidates };
  } catch (e) {
    return { provider, ms: Date.now() - t0, candidates: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Primary provider with fallback to the other on error or empty results. */
export async function searchCatalog(q: string, primary: Provider): Promise<ProviderResult> {
  const first = await timed(primary, q);
  if (first.candidates.length) return first;
  const second = await timed(primary === "openlibrary" ? "google" : "openlibrary", q);
  return second.candidates.length ? second : first;
}
