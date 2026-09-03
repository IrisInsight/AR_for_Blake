import { NextResponse } from "next/server";
import { GATE_COOKIE, GATE_MAX_AGE, rotateFamilyCode } from "@/lib/gate";
import { route } from "@/lib/http";

/** New family code. Every other device will need the new link. This device keeps working. */
export const POST = route(async (req) => {
  const code = await rotateFamilyCode();
  const res = NextResponse.json({ code });
  res.cookies.set(GATE_COOKIE, code, { maxAge: GATE_MAX_AGE, path: "/", httpOnly: true, sameSite: "lax", secure: new URL(req.url).protocol === "https:" });
  return res;
});
