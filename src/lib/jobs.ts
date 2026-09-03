// Long admin jobs run after the response and park their result in settings, so a quick GET can pick it up.
import { after } from "next/server";
import { getSetting, setSetting } from "./db";

export async function startJob(name: string, fn: () => Promise<unknown>): Promise<void> {
  await setSetting(`job:${name}`, JSON.stringify({ status: "running", startedAt: new Date().toISOString() }));
  after(async () => {
    try {
      const result = await fn();
      await setSetting(`job:${name}`, JSON.stringify({ status: "done", finishedAt: new Date().toISOString(), result }));
    } catch (e) {
      await setSetting(`job:${name}`, JSON.stringify({ status: "failed", error: e instanceof Error ? e.message : String(e) }));
    }
  });
}

export async function jobResult(name: string): Promise<unknown> {
  const v = await getSetting(`job:${name}`);
  return v ? JSON.parse(v) : { status: "none" };
}
