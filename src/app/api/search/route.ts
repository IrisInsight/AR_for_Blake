import { levelLabel, normKey } from "@/lib/ar";
import { getBookByKey, getKid, getSearchCache, putSearchCache } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import { searchCatalog, type Candidate } from "@/lib/bookapis";
import { provider } from "@/lib/prep";
import type { Book } from "@/lib/types";
import { mockMode } from "@/lib/ai";

export const maxDuration = 30;

export interface SearchCard extends Candidate {
  book: (Book & { level: string }) | null; // filled when already resolved
}

function normQ(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Sub-second candidate list from a public catalog, with cached resolutions attached. No AI here. */
export const POST = route(async (req) => {
  const b = await body(req);
  const q = str(b.q, "Search", 120);
  const kid = await getKid(str(b.kidId, "kidId"));
  if (!kid) throw new HttpError(404, "Kid not found");
  const nq = normQ(q);
  let candidates: Candidate[] = [];
  let prov = "cache";
  let ms = 0;
  const cached = await getSearchCache(nq);
  if (cached) {
    candidates = cached.results as Candidate[];
    prov = `cache:${cached.provider}`;
  } else if (mockMode()) {
    candidates = mockCandidates(nq);
    prov = "mock";
  } else {
    const res = await searchCatalog(q, await provider());
    candidates = res.candidates;
    prov = res.provider;
    ms = res.ms;
    if (candidates.length) await putSearchCache(nq, res.provider, candidates);
  }
  const cards: SearchCard[] = await Promise.all(
    candidates.slice(0, 6).map(async (c) => {
      const book = await getBookByKey(c.key);
      return { ...c, book: book && book.resolved_at ? { ...book, level: levelLabel(book.atos, kid.grade) } : null };
    }),
  );
  return ok({ cards, provider: prov, ms });
});

function mockCandidates(q: string): Candidate[] {
  const all: Candidate[] = [
    { key: normKey("Charlotte's Web", "E. B. White"), title: "Charlotte's Web", author: "E. B. White", pages: 192, year: 1952, cover: null, provider: "openlibrary" },
    { key: normKey("Diary of a Wimpy Kid", "Jeff Kinney"), title: "Diary of a Wimpy Kid", author: "Jeff Kinney", pages: 217, year: 2007, cover: null, provider: "openlibrary" },
    { key: normKey("Dog Man", "Dav Pilkey"), title: "Dog Man", author: "Dav Pilkey", pages: 240, year: 2016, cover: null, provider: "openlibrary" },
    { key: normKey("InvestiGators", "John Patrick Green"), title: "InvestiGators", author: "John Patrick Green", pages: 208, year: 2020, cover: null, provider: "openlibrary" },
  ];
  if (q.includes("nothing")) return [];
  return all.filter((c) => c.title.toLowerCase().includes(q.split(" ")[0])).concat(all.filter((c) => !c.title.toLowerCase().includes(q.split(" ")[0])));
}
