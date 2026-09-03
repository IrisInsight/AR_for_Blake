import { TopBar } from "@/components/ui";
import GrownupClient from "./GrownupClient";
import { listAllAttempts, listKids, listLedger, listPrep, usageLastDays } from "@/lib/db";
import { getFamilyCode } from "@/lib/gate";
import { headers } from "next/headers";
import { hasApiKey, mockMode } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function Grownup() {
  const kids = await listKids();
  const attempts = await listAllAttempts();
  const ledgers = Object.fromEntries(await Promise.all(kids.map(async (k) => [k.id, await listLedger(k.id, 15)] as const)));
  const [prep, code, usage, h] = await Promise.all([listPrep(), getFamilyCode(), usageLastDays(30), headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const link = `${proto}://${host}/?code=${code}`;
  const spend = Math.round(usage.reduce((s, r) => s + r.cost, 0) * 100) / 100;
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
        prep={prep}
        code={code}
        link={link}
        spend30={spend}
      />
    </main>
  );
}
