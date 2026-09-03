import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import ResultsClient from "./ResultsClient";
import { getAttempt, getBook } from "@/lib/db";
import { kidState } from "@/lib/engine";

export default async function ResultsPage({ params }: { params: Promise<{ kidId: string; attemptId: string }> }) {
  const { kidId, attemptId } = await params;
  const [s, attempt] = await Promise.all([kidState(kidId), getAttempt(attemptId)]);
  if (!s || !attempt || attempt.kid_id !== kidId) notFound();
  const book = await getBook(attempt.book_id);
  if (!book) notFound();
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title={`${book.emoji ?? "📖"} ${book.title}`} bolts={s.kid.bolts} />
      <ResultsClient
        kidId={kidId}
        attempt={{
          id: attempt.id,
          status: attempt.status,
          correct: attempt.correct ?? 0,
          total: attempt.total ?? 0,
          percent: attempt.percent ?? 0,
          points: attempt.points_earned,
          bonusStatus: attempt.bonus_status,
          flagged: attempt.flagged.length,
        }}
        rocket={s.kid.rocket}
        goal={s.kid.goal_points}
        period={s.period}
        stage={s.stage}
        bookPoints={book.points}
      />
    </main>
  );
}
