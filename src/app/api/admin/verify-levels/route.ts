import { ok, route } from "@/lib/http";
import { resolveBook } from "@/lib/resolve";
import { bookPoints } from "@/lib/ar";
import { jobResult, startJob } from "@/lib/jobs";

export const maxDuration = 300;

// Known AR values (AR BookFinder). Points column is what the formula must yield from the AR numbers.
const KNOWN = [
  { title: "Diary of a Wimpy Kid", author: "Jeff Kinney", pages: 217, atos: 5.2, words: 19784, points: 3.0 },
  { title: "Charlotte's Web", author: "E. B. White", pages: 192, atos: 4.4, words: 31938, points: 4.5 },
  { title: "Harry Potter and the Sorcerer's Stone", author: "J. K. Rowling", pages: 309, atos: 5.5, words: 77325, points: 12.0 },
  { title: "Dog Man", author: "Dav Pilkey", pages: 240, atos: 2.6, words: null, points: null, range: [0.5, 1.5] },
  { title: "InvestiGators", author: "John Patrick Green", pages: 208, atos: 2.8, words: null, points: null, range: [0.5, 1.0] },
  { title: "Dinosaurs Before Dark", author: "Mary Pope Osborne", pages: 68, atos: 2.6, words: null, points: null, range: [0.5, 1.0] },
];

/** Resolve each known book fresh with the requested model and report drift. ?model=haiku|sonnet */
export const GET = route(async (req) => {
  const u = new URL(req.url);
  const m = u.searchParams.get("model");
  const model = m === "sonnet" ? "sonnet" : m === "haiku" ? "haiku" : undefined; // undefined = production path (Haiku, Sonnet fallback)
  const name = `verify:${model ?? "auto"}`;
  if (u.searchParams.get("start") === "1") {
    await startJob(name, () => run(model));
    return ok({ started: name });
  }
  if (u.searchParams.get("result") === "1") return ok(await jobResult(name));
  return ok(await run(model));
});

async function run(model: "haiku" | "sonnet" | undefined) {
  const results = await Promise.all(
    KNOWN.map(async (k) => {
      try {
        const { book, ms, model: used } = await resolveBook({ title: k.title, author: k.author, pages: k.pages }, { force: true, model });
        const expectedPts = k.points ?? null;
        const okLevel = Math.abs(book.atos - k.atos) <= 0.3;
        const okPts = expectedPts != null ? book.points === expectedPts : k.range ? book.points >= k.range[0] && book.points <= k.range[1] : true;
        return { title: k.title, model: used, ms, got: { atos: book.atos, words: book.word_count, source: book.word_count_source, format: book.format, points: book.points }, expected: { atos: k.atos, words: k.words, points: expectedPts ?? k.range, fromAr: k.words ? bookPoints(k.atos, k.words) : null }, okLevel, okPts };
      } catch (e) {
        return { title: k.title, error: e instanceof Error ? e.message : String(e), okLevel: false, okPts: false };
      }
    }),
  );
  return { model: model ?? "auto", pass: results.filter((r) => r.okLevel && r.okPts).length, total: results.length, results };
}
