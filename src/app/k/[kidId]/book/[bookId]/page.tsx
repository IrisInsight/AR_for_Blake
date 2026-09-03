import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar, Panel, LevelChip } from "@/components/ui";
import StartQuiz from "@/components/StartQuiz";
import { fmtPts, levelLabel, quizLength, LEVEL_COPY } from "@/lib/ar";
import { getAttemptFor, getBook, getKid, getPool } from "@/lib/db";

export default async function BookPage({ params }: { params: Promise<{ kidId: string; bookId: string }> }) {
  const { kidId, bookId } = await params;
  const [kid, book] = await Promise.all([getKid(kidId), getBook(bookId)]);
  if (!kid || !book) notFound();
  const [attempt, pool] = await Promise.all([getAttemptFor(kid.id, book.id), getPool(book.id, "main")]);
  const level = levelLabel(book.atos, kid.grade);
  const n = quizLength(book.points);
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}/search`} title="Your mission" bolts={kid.bolts} />
      <Panel className="flex flex-col items-center gap-2 text-center">
        <div className="text-7xl" aria-hidden>{book.emoji ?? "📖"}</div>
        <h1 className="text-2xl font-black leading-tight">{book.title}</h1>
        <p className="text-ink-2 font-bold">
          {book.author}
          {book.series ? ` · ${book.series}${book.series_number ? ` #${book.series_number}` : ""}` : ""}
        </p>
        {book.description && <p className="mt-1 text-base font-bold">{book.description}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <LevelChip level={level} />
          <span className="chip bg-panel-2 text-ink-2">Level {book.atos.toFixed(1)}</span>
          <span className="chip bg-panel-2 text-ink-2">{book.word_count.toLocaleString()} words</span>
        </div>
        <p className="text-ink-2 text-sm font-bold">{LEVEL_COPY[level].blurb}</p>
        <div className="mt-2 grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl bg-space p-3">
            <div className="numeral text-4xl text-accent">{fmtPts(book.points)}</div>
            <div className="text-ink-2 text-xs font-bold">points if you get them all</div>
          </div>
          <div className="rounded-2xl bg-space p-3">
            <div className="numeral text-4xl">{n}</div>
            <div className="text-ink-2 text-xs font-bold">questions</div>
          </div>
        </div>
      </Panel>

      <div className="mt-4">
        {attempt && attempt.status !== "in_progress" ? (
          <div className="panel p-4 text-center">
            <p className="font-extrabold">
              {attempt.status === "passed" ? `You already flew this one for ${fmtPts(attempt.points_earned)} points.` : "You took this quiz already."}
            </p>
            <p className="text-ink-2 mt-1 text-sm font-bold">
              {attempt.status === "passed" ? "One quiz per book. Find another book to keep building." : "Read it again and a grown-up can clear it for a retry."}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Link href={`/k/${kidId}/results/${attempt.id}`} className="btn">See results</Link>
              <Link href={`/k/${kidId}/search`} className="btn btn-accent">Find a book</Link>
            </div>
          </div>
        ) : (
          <StartQuiz kidId={kid.id} bookId={book.id} resumeId={attempt?.id ?? null} cached={Boolean(pool)} />
        )}
      </div>
      <p className="text-ink-2 mt-4 px-2 text-center text-sm font-bold">You need 60% right to earn points. Every right answer adds fuel.</p>
    </main>
  );
}
