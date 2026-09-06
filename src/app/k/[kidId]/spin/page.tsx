import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import SpinClient from "./SpinClient";
import { kidState } from "@/lib/engine";

export default async function SpinPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title="Spin" coins={s.kid.bolts} />
      <SpinClient kidId={kidId} machine={s.kid.machine} spins={s.kid.spins_bank} meter={s.meter} goal={s.kid.goal_points} coins={s.kid.bolts} lifetime={s.kid.lifetime_points} />
    </main>
  );
}
