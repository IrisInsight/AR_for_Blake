import { NextResponse, type NextRequest } from "next/server";

// The whole app sits behind a family code. A device learns it once from the shareable link
// (?code=XXXX) or by typing it on /enter, then a long-lived cookie carries it. No accounts.
const COOKIE = "rr_code";
const MAX_AGE = 60 * 60 * 24 * 400;
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://nuddxbupepsqgiytxbnh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_6ljlsT54S7LjvuknF9hRaQ_QOEBnUXI";

let cached: { code: string; at: number } | null = null;

async function familyCode(): Promise<string | null> {
  if (process.env.RR_FAKE_DB === "1") return "TESTCODE";
  if (cached && Date.now() - cached.at < 30_000) return cached.code;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.family_code&select=value`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return cached?.code ?? null;
    const rows = (await res.json()) as { value: string }[];
    const code = rows[0]?.value ?? null;
    if (code) cached = { code, at: Date.now() };
    return code;
  } catch {
    return cached?.code ?? null;
  }
}

function norm(v: string | null | undefined): string {
  return (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const expected = await familyCode();
  // If the database is unreachable we fail open rather than lock the family out.
  if (!expected) return NextResponse.next();

  // Vercel cron pokes the prep worker; it can only process work that was queued from inside the gate.
  if (url.pathname === "/api/prep/run" && (req.headers.get("user-agent") ?? "").startsWith("vercel-cron")) return NextResponse.next();
  const fromQuery = norm(url.searchParams.get("code"));
  if (fromQuery) {
    if (fromQuery === expected) {
      const clean = url.clone();
      clean.searchParams.delete("code");
      const res = url.pathname.startsWith("/api/") ? NextResponse.next() : NextResponse.redirect(clean);
      res.cookies.set(COOKIE, expected, { maxAge: MAX_AGE, path: "/", httpOnly: true, sameSite: "lax", secure: url.protocol === "https:" });
      return res;
    }
  }
  const fromCookie = norm(req.cookies.get(COOKIE)?.value);
  if (fromCookie === expected) {
    const res = NextResponse.next();
    // Refresh the cookie so it never quietly expires on a device that keeps using the app.
    res.cookies.set(COOKIE, expected, { maxAge: MAX_AGE, path: "/", httpOnly: true, sameSite: "lax", secure: url.protocol === "https:" });
    return res;
  }
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "This device needs the family code first.", code: "gate" }, { status: 401 });
  }
  const enter = url.clone();
  enter.pathname = "/enter";
  enter.search = "";
  return NextResponse.redirect(enter);
}

export const config = {
  matcher: ["/((?!_next/|icons/|icon\\.png|favicon\\.ico|manifest\\.webmanifest|enter$|api/enter$).*)"],
};
