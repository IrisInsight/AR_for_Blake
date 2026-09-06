import Link from "next/link";
import { notFound } from "next/navigation";
import ReadingTimer from "@/components/ReadingTimer";
import SoundToggle from "@/components/SoundToggle";
import { Panel, SectionTitle } from "@/components/ui";
import { avatarEmoji } from "@/lib/catalog";
import { kidState } from "@/lib/engine";
import { BADGES, MISSION_DEFS } from "@/lib/game";

export default async function Dashboard({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  const { kid, meter, missions, streak, rank, badges, active, today, week, jackpots } = s;
  const earned = new Set(badges.map((b) => b.badge_id));
  const toGo = Math.max(0, kid.goal_points - meter);

  return (
    <main className="safe-x safe-bottom mx-auto max-w-5xl">
      <header className="safe-top pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-ink-2 flex min-w-0 items-center gap-2 text-lg font-extrabold">
            <span className="text-3xl" aria-hidden>{avatarEmoji(kid.avatar)}</span>
            <span className="truncate">{kid.name}&apos;s</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="chip bg-panel-2 text-bolt"><span aria-hidden>🪙</span><span className="numeral text-base">{kid.bolts}</span></span>
            <SoundToggle />
            <Link href="/grownup" aria-label="Grown-up corner" className="tap grid h-11 w-11 place-items-center rounded-2xl bg-panel-2 text-xl">
              ⚙️
            </Link>
          </div>
        </div>
        <h1 className="mt-1 text-[30px] font-black leading-[1.05] tracking-tight sm:text-4xl">Reading Jackpot</h1>
        <div className="text-ink-2 mt-1 text-sm font-bold">
          {rank.emoji} {rank.name} · Level {kid.level + 1}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <ReadingTimer kidId={kid.id} active={active} spins={kid.spins_bank} carrySeconds={kid.carry_seconds} />
          <Link href="/grownup#add" className="panel-soft flex items-center gap-3 p-3 active:scale-[0.99]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-panel-2 text-2xl" aria-hidden>✍️</span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Read without the timer?</span>
              <span className="text-ink-2 block text-sm font-bold">A grown-up can add the minutes here.</span>
            </span>
            <span className="text-ink-2 font-black">›</span>
          </Link>

          <Link href={`/k/${kid.id}/spin`} className="panel flex items-center gap-4 p-4 active:scale-[0.99]" style={{ borderTop: `6px solid ${kid.accent}` }}>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-panel-2 text-4xl" aria-hidden>🎰</div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-black">{kid.machine.name}</div>
              <div className="text-ink-2 text-sm font-bold">{kid.spins_bank > 0 ? `${kid.spins_bank} spin${kid.spins_bank === 1 ? "" : "s"} ready to pull` : "Read a minute, earn a spin"}</div>
            </div>
            <div className="numeral text-4xl text-accent">{kid.spins_bank}</div>
          </Link>

          <Panel>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-ink-2 text-sm font-bold">Jackpot meter</div>
                <div className="numeral text-4xl text-accent">
                  {meter}
                  <span className="text-ink-2 text-lg font-extrabold"> / {kid.goal_points}</span>
                </div>
              </div>
              <div className="text-ink-2 pb-1 text-right text-sm font-bold">{toGo > 0 ? `${toGo} points to the jackpot` : "Jackpot!"}</div>
            </div>
            <div className="gauge mt-2">
              <div style={{ width: `${Math.min(100, (meter / kid.goal_points) * 100)}%` }} />
            </div>
            <div className="text-ink-2 mt-2 text-xs font-bold">Fill it and a trophy goes on your shelf. {jackpots.length ? `${jackpots.length} so far.` : "None yet."}</div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Panel soft className="flex flex-col gap-0.5 !p-3">
              <div className="text-ink-2 text-xs font-bold">Today</div>
              <div className="numeral text-2xl">{today}<span className="text-ink-2 text-sm"> min</span></div>
            </Panel>
            <Panel soft className="flex flex-col gap-0.5 !p-3">
              <div className="text-ink-2 text-xs font-bold">This week</div>
              <div className="numeral text-2xl">{week}<span className="text-ink-2 text-sm"> min</span></div>
            </Panel>
            <Panel soft className="flex flex-col gap-0.5 !p-3">
              <div className="text-ink-2 text-xs font-bold">Streak</div>
              <div className="flex items-center gap-1">
                <span aria-hidden>{streak.fuel > 66 ? "🔥" : streak.fuel > 33 ? "🕯️" : "💨"}</span>
                <div className="numeral text-2xl">{streak.days}<span className="text-ink-2 text-sm"> day{streak.days === 1 ? "" : "s"}</span></div>
              </div>
            </Panel>
          </div>

          <section>
            <SectionTitle>This week&apos;s missions</SectionTitle>
            <div className="flex flex-col gap-2">
              {missions.map((m) => {
                const def = MISSION_DEFS[m.kind];
                const done = Boolean(m.completed_at);
                return (
                  <div key={m.id} className={`panel-soft flex items-center gap-3 p-3 ${done ? "opacity-70" : ""}`}>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-panel-2 text-2xl" aria-hidden>{done ? "✅" : def?.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-extrabold ${done ? "line-through" : ""}`}>{def?.title ?? m.kind}</div>
                      {m.target > 1 && !done && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="gauge h-2 w-32"><div style={{ width: `${(m.progress / m.target) * 100}%` }} /></div>
                          <span className="text-ink-2 text-xs font-bold">{m.progress}/{m.target}</span>
                        </div>
                      )}
                    </div>
                    <span className="chip bg-panel-2 text-bolt">🪙 {m.reward_bolts}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-3 gap-3">
            <Link href={`/k/${kid.id}/shop`} className="panel flex min-h-[88px] flex-col items-center justify-center gap-1 p-3 text-center font-extrabold active:scale-[0.98]">
              <span className="text-3xl" aria-hidden>🎨</span>Shop
            </Link>
            <Link href={`/k/${kid.id}/trophies`} className="panel flex min-h-[88px] flex-col items-center justify-center gap-1 p-3 text-center font-extrabold active:scale-[0.98]">
              <span className="text-3xl" aria-hidden>🏆</span>Trophies
            </Link>
            <Link href={`/k/${kid.id}/log`} className="panel flex min-h-[88px] flex-col items-center justify-center gap-1 p-3 text-center font-extrabold active:scale-[0.98]">
              <span className="text-3xl" aria-hidden>📅</span>Reading log
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
