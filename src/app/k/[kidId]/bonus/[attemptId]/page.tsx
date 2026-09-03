import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/ui";
import BonusClient from "./BonusClient";
import { getAttempt, getBook, getKid } from "@/lib/db";

export default async function BonusPage({ params }: { params: Promise<{ kidId: string; attemptId: string }> }) {
  const { kidId, attemptId } = await params;
  const [kid, attempt] = await Promise.all([getKid(kidId), getAttempt(attemptId)]);
  if (!kid || !attempt || attempt.kid_id !== kid.id) notFound();
  if (attempt.status !== "passed" || (attempt.bonus_status !== "available" && attempt.bonus_status !== "in_progress")) {
    redirect(`/k/${kidId}/results/${attemptId}`);
  }
  const book = await getBook(attempt.book_id);
  return (
    <main className="safe-x safe-bottom mx-auto max-w-2xl">
      <TopBar back={`/k/${kidId}/results/${attemptId}`} title={`⚡ Bonus: ${book?.title ?? ""}`} />
      <BonusClient kidId={kidId} attemptId={attemptId} started={attempt.bonus_status === "in_progress"} />
    </main>
  );
}
