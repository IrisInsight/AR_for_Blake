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

const KID_SUBJECTS = /juvenile|children|kids|comic|graphic novel|picture book|early reader|chapter book|young adult|middle grade/i;

interface Scored extends Candidate {
  score: number;
}

async function olQuery(params: Record<string, string>): Promise<Record<string, unknown>[]> {
  const url = new URL("https://openlibrary.org/search.json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("language", "eng");
  url.searchParams.set("fields", "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,edition_count,subject");
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as { docs: Record<string, unknown>[] };
  return data.docs ?? [];
}

function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Open Library: a title query and a general query in parallel, then re-ranked for children's books. */
export async function searchOpenLibrary(q: string, limit = 8): Promise<Candidate[]> {
  const [byTitle, general] = await Promise.all([
    olQuery({ title: q, limit: "12" }).catch(() => []),
    olQuery({ q, limit: "12" }).catch(() => []),
  ]);
  if (!byTitle.length && !general.length) throw new Error("Open Library returned nothing");
  const sq = squash(q);
  const out: Scored[] = [];
  const seen = new Set<string>();
  // Series authors show up many times in the results; that's the strongest hint of a kid series.
  const authorCount = new Map<string, number>();
  for (const d of [...byTitle, ...general]) {
    const a = Array.isArray(d.author_name) ? String(d.author_name[0] ?? "") : "";
    if (a) authorCount.set(a, (authorCount.get(a) ?? 0) + 1);
  }
  for (const d of [...byTitle, ...general]) {
    const title = clean(String(d.title ?? ""));
    const author = Array.isArray(d.author_name) ? clean(String(d.author_name[0] ?? "")) : "";
    if (!title || !author) continue;
    const key = normKey(baseTitle(title), author);
    if (seen.has(key)) continue;
    seen.add(key);
    const st = squash(title);
    const subjects = Array.isArray(d.subject) ? (d.subject as string[]).slice(0, 40).join(" | ") : "";
    const year = typeof d.first_publish_year === "number" ? d.first_publish_year : null;
    const editions = typeof d.edition_count === "number" ? d.edition_count : 0;
    let score = 0;
    if (st === sq) score += 6;
    else if (st.startsWith(sq)) score += 4;
    else if (st.includes(sq)) score += 2;
    else if (sq.split(" ").every((w) => st.includes(w))) score += 1;
    if (KID_SUBJECTS.test(subjects)) score += 3;
    if (year && year >= 1995) score += 1;
    if (year && year < 1940) score -= 1;
    if (editions >= 5) score += 0.5;
    const pages = typeof d.number_of_pages_median === "number" ? d.number_of_pages_median : null;
    if (pages) score += 0.5;
    if (pages && pages > 700) score -= 4; // box sets and omnibus editions
    if (/collection|box set|boxed set|omnibus|treasury|winglets|\d+ books/i.test(title)) score -= 4;
    score += Math.min(3, (authorCount.get(author) ?? 1) - 1);
    out.push({
      key,
      title,
      author,
      pages,
      year,
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      provider: "openlibrary",
      score,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit).map(({ score: _s, ...c }) => c);
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
