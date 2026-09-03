import Link from "next/link";
import { notFound } from "next/navigation";
import Rocket from "@/components/Rocket";
import { Panel, SectionTitle } from "@/components/ui";
import SoundToggle from "@/components/SoundToggle";
import { hasApiKey, mockMode } from "@/lib/ai";
import { NO_KEY_MESSAGE } from "@/lib/http";
import { avatarEmoji } from "@/lib/catalog";
import { fmtPts } from "@/lib/ar";
import { kidState } from "@/lib/engine";
import { BADGES, MISSION_DEFS, STAGE_NAMES } from "@/lib/game";

export default async function Dashboard({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  const { kid, period, stage, missions, streak, rank, badges, attempts } = s;
  const remaining = Math.max(0, Math.round((kid.goal_points - period) * 10) / 10);
  const ready = period >= kid.goal_points;
  const earned = new Set(badges.map((b) => b.badge_id));
  const inProgress = attempts.find((a) => a.status === "in_progress");
  const nextPart = stage < 7 ? STAGE_NAMES[stage] : null;

  return (
    <main className="safe-x safe-bottom mx-auto max-w-5xl">
      <header className="safe-top pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-ink-2 flex min-w-0 items-center gap-2 text-lg font-extrabold">
            <span className="text-3xl" aria-hidden>{avatarEmoji(kid.avatar)}</span>
            <span className="truncate">{kid.name}&apos;s</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="chip bg-panel-2 text-bolt"><span aria-hidden>🔩</span><span className="numeral text-base">{kid.bolts}</span></span>
            <SoundToggle />
            <Link href="/grownup" aria-label="Grown-up corner" className="tap grid h-11 w-11 place-items-center rounded-2xl bg-panel-2 text-xl">
              ⚙️
            </Link>
          </div>
        </div>
        <h1 className="mt-1 text-[30px] font-black leading-[1.05] tracking-tight sm:text-4xl">Rocket Reader Challenge</h1>
        <div className="text-ink-2 mt-1 text-sm font-bold">
          {rank.emoji} {rank.name} · Grade {kid.grade}
        </div>
      </header>
      {!hasApiKey() && !mockMode() && (
        <div className="panel mb-4 border-2 border-[#ffd23f]/60 p-4 text-base">
          <p className="font-extrabold">Almost ready.</p>
          <p className="text-ink-2 mt-1">{NO_KEY_MESSAGE} Everything else works.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        {/* Rocket hero */}
        <div className="min-w-0 lg:sticky lg:top-3">
          <Panel className="flex flex-col items-center pt-3">
            <div className="flex w-full items-center justify-between px-1">
              <div>
                <div className="text-xl font-black">{kid.rocket.name}</div>
                <div className="text-ink-2 text-sm font-bold">
                  {rank.emoji} {rank.name}
                </div>
              </div>
              <Link href={`/k/${kid.id}/rocket`} className="btn tap px-4 text-base">
                Rocket shop
              </Link>
            </div>
            <div className="w-full max-w-[280px] lg:max-w-[360px]">
              <Rocket config={kid.rocket} stage={stage} idPrefix="dash" className="h-auto w-full" />
            </div>
            <div className="w-full">
              <div className="flex items-end justify-between">
                <div className="numeral text-5xl text-accent">
                  {fmtPts(period)}
                  <span className="text-ink-2 text-xl font-extrabold"> / {fmtPts(kid.goal_points)}</span>
                </div>
                <div className="text-ink-2 pb-1 text-right text-sm font-bold">
                  {stage} of 7 parts
                </div>
              </div>
              <div className="gauge mt-2">
                <div style={{ width: `${Math.min(100, (period / kid.goal_points) * 100)}%` }} />
              </div>
              {ready ? (
                <Link href={`/k/${kid.id}/launch`} className="btn btn-accent btn-big mt-4 anim-pop">
                  🚀 Launch!
                </Link>
              ) : (
                <p className="text-ink-2 mt-3 text-center font-bold">
                  {period === 0 ? `Read a book to build the ${nextPart}.` : `${fmtPts(remaining)} more points to launch. Next up: the ${nextPart}.`}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {inProgress ? (
            <Link href={`/k/${kid.id}/quiz/${inProgress.id}`} className="btn btn-accent btn-big">
              Finish your quiz: {inProgress.book.title}
            </Link>
          ) : (
            <Link href={`/k/${kid.id}/search`} className="btn btn-accent btn-big">
              🔍 Find a book
            </Link>
          )}

          <section>
            <SectionTitle>This week&apos;s missions</SectionTitle>
            <div className="flex flex-col gap-2">
              {missions.map((m) => {
                const def = MISSION_DEFS[m.kind];
                const done = Boolean(m.completed_at);
                return (
                  <div key={m.id} className={`panel-soft flex items-center gap-3 p-3 ${done ? "opacity-70" : ""}`}>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-panel-2 text-2xl" aria-hidden>
                      {done ? "✅" : def?.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-extrabold ${done ? "line-through" : ""}`}>{def?.title ?? m.kind}</div>
                      {m.target > 1 && !done && (
                        <div className="gauge mt-1 h-2 w-32">
                          <div style={{ width: `${(m.progress / m.target) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="chip bg-panel-2 text-bolt">🔩 {m.reward_bolts}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Panel soft className="flex flex-col gap-1">
              <div className="text-ink-2 text-sm font-bold">Reading streak</div>
              <div className="flex items-center gap-2">
                <span className="text-3xl" aria-hidden>
                  {streak.fuel > 66 ? "🔥" : streak.fuel > 33 ? "🕯️" : "💨"}
                </span>
                <div className="numeral text-2xl">{streak.weeks} wk</div>
              </div>
              <div className="gauge h-2">
                <div style={{ width: `${streak.fuel}%`, background: streak.fuel > 33 ? "#ff8a1f" : "#5b6478" }} />
              </div>
              <div className="text-ink-2 text-xs font-bold">{streak.thisWeek} book{streak.thisWeek === 1 ? "" : "s"} this week</div>
            </Panel>
            <Panel soft className="flex flex-col gap-1">
              <div className="text-ink-2 text-sm font-bold">Lifetime</div>
              <div className="numeral text-2xl">{fmtPts(kid.lifetime_points)} pts</div>
              <div className="text-ink-2 text-xs font-bold">
                {rank.next ? `${fmtPts(rank.next.min - kid.lifetime_points)} to ${rank.next.name}` : "Top rank!"}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Link href={`/k/${kid.id}/planets`} className="panel flex min-h-[88px] flex-col items-center justify-center gap-1 p-3 text-center font-extrabold active:scale-[0.98]">
              <span className="text-3xl" aria-hidden>🪐</span>
              Planets
            </Link>
            <Link href={`/k/${kid.id}/library`} className="panel flex min-h-[88px] flex-col items-center justify-center gap-1 p-3 text-center font-extrabold active:scale-[0.98]">
              <span className="text-3xl" aria-hidden>📚</span>
              Library
            </Link>
            <Link href="/station" className="panel flex min-h-[88px] flex-col items-center justify-center gap-1 p-3 text-center font-extrabold active:scale-[0.98]">
              <span className="text-3xl" aria-hidden>🛰️</span>
              Station
            </Link>
          </div>

          <section>
            <SectionTitle>Badges</SectionTitle>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {BADGES.map((b) => {
                const has = earned.has(b.id);
                return (
                  <div key={b.id} className={`panel-soft flex w-24 shrink-0 flex-col items-center gap-1 p-2 text-center ${has ? "" : "opacity-40 grayscale"}`} title={b.how}>
                    <span className="text-3xl" aria-hidden>{b.emoji}</span>
                    <span className="text-xs font-extrabold leading-tight">{b.name}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
