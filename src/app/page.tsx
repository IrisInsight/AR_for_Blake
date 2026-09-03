import Link from "next/link";
import Rocket from "@/components/Rocket";
import SoundToggle from "@/components/SoundToggle";
import StationMini from "@/components/StationMini";
import { avatarEmoji } from "@/lib/catalog";
import { listKids } from "@/lib/db";
import { kidState } from "@/lib/engine";
import { fmtPts } from "@/lib/ar";
import { stationFor } from "@/lib/game";
import { hasApiKey, mockMode } from "@/lib/ai";
import { NO_KEY_MESSAGE } from "@/lib/http";
import { luminance } from "@/components/Rocket";

export const dynamic = "force-dynamic";

export default async function Home() {
  const kids = await listKids();
  const states = await Promise.all(kids.map((k) => kidState(k.id)));
  const combined = kids.reduce((s, k) => s + k.lifetime_points, 0);
  const station = stationFor(combined);
  const keyMissing = !hasApiKey() && !mockMode();

  return (
    <main className="safe-x safe-bottom mx-auto flex min-h-screen max-w-3xl flex-col">
      <header className="safe-top flex items-center justify-between pb-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Reader Rocket</h1>
          <p className="text-ink-2 font-bold">Who&apos;s reading?</p>
        </div>
        <div className="flex gap-2">
          <SoundToggle />
          <Link href="/grownup" aria-label="Grown-up corner" className="tap grid h-11 w-11 place-items-center rounded-2xl bg-panel-2 text-xl">
            ⚙️
          </Link>
        </div>
      </header>

      {keyMissing && (
        <div className="panel mb-3 border-2 border-[#ffd23f]/60 p-4 text-base">
          <p className="font-extrabold">Almost ready.</p>
          <p className="text-ink-2 mt-1">{NO_KEY_MESSAGE} Everything else works.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {states.map((s) =>
          s ? (
            <Link
              key={s.kid.id}
              href={`/k/${s.kid.id}`}
              className="panel anim-rise relative flex min-h-[220px] items-stretch gap-3 overflow-hidden p-4 active:scale-[0.99]"
              style={{ ["--accent" as string]: s.kid.accent, ["--accent-ink" as string]: luminance(s.kid.accent) > 0.55 ? "#0b1230" : "#fff" }}
            >
              <div className="absolute inset-x-0 top-0 h-2" style={{ background: s.kid.accent }} />
              <div className="flex flex-1 flex-col justify-between py-1">
                <div>
                  <div className="text-4xl" aria-hidden>
                    {avatarEmoji(s.kid.avatar)}
                  </div>
                  <div className="mt-1 text-3xl font-black">{s.kid.name}</div>
                  <div className="text-ink-2 font-bold">
                    {s.rank.emoji} {s.rank.name} · Grade {s.kid.grade}
                  </div>
                </div>
                <div>
                  <div className="numeral text-4xl" style={{ color: s.kid.accent }}>
                    {fmtPts(s.period)}
                    <span className="text-ink-2 text-lg font-extrabold"> / {fmtPts(s.kid.goal_points)}</span>
                  </div>
                  <div className="gauge mt-2 w-40">
                    <div style={{ width: `${Math.min(100, (s.period / s.kid.goal_points) * 100)}%`, background: s.kid.accent }} />
                  </div>
                  <div className="text-ink-2 mt-1 text-sm font-bold">{s.period >= s.kid.goal_points ? "Ready to launch!" : "points toward launch"}</div>
                </div>
              </div>
              <div className="w-28 shrink-0 self-end">
                <Rocket config={s.kid.rocket} stage={s.stage} idPrefix={`home-${s.kid.id}`} className="h-auto w-full" />
              </div>
            </Link>
          ) : null,
        )}
      </div>

      <Link href="/station" className="panel-soft mt-4 flex items-center gap-4 p-4 active:scale-[0.99]">
        <StationMini level={station.current.level} className="h-16 w-24 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">Space station: {station.current.name}</div>
          <div className="text-ink-2 text-sm font-bold">
            {station.next ? `${fmtPts(combined)} of ${station.next.min} points together for ${station.next.name}` : "Fully built. Wow."}
          </div>
          <div className="gauge mt-2">
            <div style={{ width: `${Math.round(station.progress * 100)}%`, background: "#7dd3fc" }} />
          </div>
        </div>
      </Link>
    </main>
  );
}
