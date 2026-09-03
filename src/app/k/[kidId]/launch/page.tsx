import { notFound, redirect } from "next/navigation";
import LaunchClient from "./LaunchClient";
import { kidState } from "@/lib/engine";

export default async function LaunchPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  if (s.period < s.kid.goal_points) redirect(`/k/${kidId}`);
  const books = s.attempts.filter((a) => a.status === "passed" && !a.planet_id && !a.archived).map((a) => ({ title: a.book.title, emoji: a.book.emoji ?? "📖", points: a.points_earned }));
  return <LaunchClient kidId={kidId} rocket={s.kid.rocket} points={s.period} goal={s.kid.goal_points} books={books} planetCount={s.planets.length} />;
}
