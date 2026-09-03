import { NextResponse } from "next/server";
import { GATE_COOKIE, GATE_MAX_AGE, getFamilyCode, normalizeCode } from "@/lib/gate";
import { body, HttpError, route } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await body(req);
  const code = normalizeCode(String(b.code ?? ""));
  const expected = await getFamilyCode();
  if (!code || code !== expected) throw new HttpError(403, "That code isn't right. Check it with a grown-up.");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, expected, { maxAge: GATE_MAX_AGE, path: "/", httpOnly: true, sameSite: "lax", secure: new URL(req.url).protocol === "https:" });
  return res;
});
