import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/ui";
import QuizClient from "./QuizClient";
import { getAttempt, getBook, getKid } from "@/lib/db";

export default async function QuizPage({ params }: { params: Promise<{ kidId: string; attemptId: string }> }) {
  const { kidId, attemptId } = await params;
  const [kid, attempt] = await Promise.all([getKid(kidId), getAttempt(attemptId)]);
  if (!kid || !attempt || attempt.kid_id !== kid.id) notFound();
  if (attempt.status !== "in_progress") redirect(`/k/${kidId}/results/${attemptId}`);
  const book = await getBook(attempt.book_id);
  return (
    <main className="safe-x safe-bottom mx-auto max-w-2xl">
      <TopBar back={`/k/${kidId}/book/${attempt.book_id}`} title={`${book?.emoji ?? "📖"} ${book?.title ?? "Quiz"}`} />
      <QuizClient kidId={kidId} attemptId={attemptId} />
    </main>
  );
}
