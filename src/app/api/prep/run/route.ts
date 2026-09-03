import { after } from "next/server";
import { ok, route } from "@/lib/http";
import { runQueue } from "@/lib/prep";
import { listPrep } from "@/lib/db";

export const maxDuration = 300;

/** Accept immediately, then work after the response so the caller never has to wait for us. */
export const POST = route(async (req) => {
  const origin = new URL(req.url).origin;
  after(async () => {
    try {
      await runQueue(origin);
    } catch (e) {
      console.error("prep run failed", e);
    }
  });
  return ok({ accepted: true });
});

/** Status for the grown-up corner; with ?run=1 (Vercel cron uses this) it also kicks the worker. */
export const GET = route(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("run") === "1") {
    const origin = u.origin;
    after(async () => {
      try {
        await runQueue(origin);
      } catch (e) {
        console.error("prep run failed", e);
      }
    });
    return ok({ accepted: true });
  }
  const items = await listPrep();
  const counts = { pending: 0, generating: 0, ready: 0, failed: 0 };
  for (const i of items) counts[i.status]++;
  return ok({ counts, recent: items.slice(0, 30).map((i) => ({ title: i.title, status: i.status, error: i.error })) });
});
