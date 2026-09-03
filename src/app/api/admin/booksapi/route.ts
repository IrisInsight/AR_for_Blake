import { ok, route } from "@/lib/http";
import { timed } from "@/lib/bookapis";

export const maxDuration = 60;

/** Compare Open Library and Google Books on the test queries. */
export const GET = route(async (req) => {
  const qs = (new URL(req.url).searchParams.get("q") ?? "InvestiGators,Dog Man,Wings of Fire,Who Was").split(",").map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const q of qs) {
    const [ol, gb] = await Promise.all([timed("openlibrary", q), timed("google", q)]);
    out.push({ q, openlibrary: { ms: ol.ms, error: ol.error, top: ol.candidates.slice(0, 5).map((c) => `${c.title} — ${c.author} (${c.pages ?? "?"}p, ${c.year ?? "?"})`) }, google: { ms: gb.ms, error: gb.error, top: gb.candidates.slice(0, 5).map((c) => `${c.title} — ${c.author} (${c.pages ?? "?"}p, ${c.year ?? "?"})`) } });
  }
  return ok(out);
});
