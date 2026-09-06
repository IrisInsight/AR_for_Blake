import { headers } from "next/headers";
import { TopBar } from "@/components/ui";
import GrownupClient from "./GrownupClient";
import { listKids, listLedger, listSessions, activeSession } from "@/lib/db";
import { getFamilyCode } from "@/lib/gate";

export const dynamic = "force-dynamic";

export default async function Grownup() {
  const kids = await listKids();
  const kid = kids[0];
  const [sessions, ledger, code, h, active] = await Promise.all([listSessions(kid.id, 60), listLedger(kid.id, 15), getFamilyCode(), headers(), activeSession(kid.id)]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back="/" title="Grown-up corner" />
      <GrownupClient kid={kid} sessions={sessions} ledger={ledger} code={code} link={`${proto}://${host}/?code=${code}`} timerRunning={Boolean(active)} />
    </main>
  );
}
