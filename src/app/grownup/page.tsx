import { TopBar } from "@/components/ui";
import GrownupClient from "./GrownupClient";
import { listAllAttempts, listKids, listLedger } from "@/lib/db";
import { hasApiKey, mockMode } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function Grownup() {
  const kids = await listKids();
  const attempts = await listAllAttempts();
  const ledgers = Object.fromEntries(await Promise.all(kids.map(async (k) => [k.id, await listLedger(k.id, 15)] as const)));
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back="/" title="Grown-up corner" />
      <GrownupClient
        kids={kids}
        attempts={attempts.map((a) => ({
          id: a.id,
          kidId: a.kid_id,
          title: a.book.title,
          status: a.status,
          percent: a.percent,
          points: a.points_earned,
          when: a.completed_at ?? a.created_at,
          bonus: a.bonus_status,
          flagged: a.flagged.length,
        }))}
        ledgers={ledgers}
        keyOk={hasApiKey() || mockMode()}
      />
    </main>
  );
}
