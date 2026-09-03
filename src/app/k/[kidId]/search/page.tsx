import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import SearchBooks from "@/components/SearchBooks";
import { getKid } from "@/lib/db";
import { zpdFor } from "@/lib/ar";

export default async function SearchPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const kid = await getKid(kidId);
  if (!kid) notFound();
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title="Find a book" bolts={kid.bolts} />
      <SearchBooks kidId={kid.id} zpd={zpdFor(kid.grade)} />
    </main>
  );
}
