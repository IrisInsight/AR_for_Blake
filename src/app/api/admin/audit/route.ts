import { ok, route } from "@/lib/http";
import { getAttemptsForBook, getKid, listBooks, updateAttempt, updateKid } from "@/lib/db";
import { resolveBook } from "@/lib/resolve";
import { earnedPoints, FORMATS, isFormat } from "@/lib/ar";
import { jobResult, startJob } from "@/lib/jobs";

export const maxDuration = 300;

/** Re-resolve every cached book that has no format or looks inflated for its format; fix earned points. */
export const GET = route(async (req) => {
  const u = new URL(req.url);
  const all = u.searchParams.get("all") === "1";
  if (u.searchParams.get("start") === "1") {
    await startJob("audit", () => run(all));
    return ok({ started: "audit" });
  }
  if (u.searchParams.get("result") === "1") return ok(await jobResult("audit"));
  return ok(await run(all));
});

async function run(all: boolean) {
  const books = await listBooks();
  const changes = [];
  for (const b of books) {
    const inflated = isFormat(b.format) && b.page_count ? b.word_count > b.page_count * FORMATS[b.format].max : false;
    const unsourced = b.word_count_source !== "ar" || b.level_source !== "ar";
    if (!all && b.format && !inflated && !unsourced && b.source !== "manual") continue;
    if (b.source === "manual") continue;
    const before = { atos: b.atos, words: b.word_count, points: b.points, format: b.format };
    try {
      const { book } = await resolveBook({ title: b.title, author: b.author, pages: b.page_count, year: b.year, cover: b.cover_url }, { force: true, source: b.source });
      const attempts = await getAttemptsForBook(book.id);
      const rescored = [];
      for (const a of attempts) {
        if (a.status !== "passed" || a.total == null) continue;
        const bonus = a.bonus_status === "passed" ? 0.5 : 0;
        const next = Math.round((earnedPoints(book.points, a.correct ?? 0, a.total) + bonus) * 10) / 10;
        if (next !== a.points_earned) {
          const kid = await getKid(a.kid_id);
          if (kid) await updateKid(kid.id, { lifetime_points: Math.max(0, Math.round((kid.lifetime_points - a.points_earned + next) * 10) / 10) });
          await updateAttempt(a.id, { points_earned: next });
          rescored.push({ attempt: a.id, from: a.points_earned, to: next });
        }
      }
      changes.push({ title: book.title, before, after: { atos: book.atos, words: book.word_count, points: book.points, format: book.format, source: book.word_count_source }, rescored });
    } catch (e) {
      changes.push({ title: b.title, before, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { checked: books.length, changes };
}
