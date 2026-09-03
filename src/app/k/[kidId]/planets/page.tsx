import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import PlanetMap from "@/components/PlanetMap";
import { kidState } from "@/lib/engine";

export default async function Planets({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  const books = s.attempts.filter((a) => a.status === "passed" && a.planet_id);
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title="Planet map" bolts={s.kid.bolts} />
      <PlanetMap
        planets={s.planets}
        books={books.map((b) => ({ planetId: b.planet_id as string, title: b.book.title, emoji: b.book.emoji ?? "📖", points: b.points_earned }))}
        accent={s.kid.accent}
        kidName={s.kid.name}
      />
    </main>
  );
}
