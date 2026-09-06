import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import MachineShop from "@/components/MachineShop";
import { kidState } from "@/lib/engine";

export default async function ShopPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  return (
    <main className="safe-x safe-bottom mx-auto max-w-5xl">
      <TopBar back={`/k/${kidId}`} title="Machine shop" />
      <MachineShop kid={s.kid} milestones={s.milestones} />
    </main>
  );
}
