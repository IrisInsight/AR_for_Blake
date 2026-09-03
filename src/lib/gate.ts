import { getSetting, setSetting } from "./db";

export const GATE_COOKIE = "rr_code";
export const GATE_MAX_AGE = 60 * 60 * 24 * 400; // ~13 months, refreshed on every visit

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function getFamilyCode(): Promise<string> {
  if (process.env.RR_FAKE_DB === "1") return (await getSetting("family_code")) ?? "TESTCODE";
  let code = await getSetting("family_code");
  if (!code) {
    code = randomCode();
    await setSetting("family_code", code);
  }
  return code;
}

export async function rotateFamilyCode(): Promise<string> {
  const code = randomCode();
  await setSetting("family_code", code);
  return code;
}

export function normalizeCode(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}
