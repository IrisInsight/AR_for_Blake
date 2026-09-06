import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import { kidState } from "@/lib/engine";
import { dayKey } from "@/lib/game";

export default async function Log({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  const done = s.sessions.filter((x) => x.ended_at && x.minutes > 0);
  const byDay = new Map<string, typeof done>();
  for (const x of done) {
    const k = dayKey(x.ended_at as string);
    byDay.set(k, [...(byDay.get(k) ?? []), x]);
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title="Reading log" coins={s.kid.bolts} />
      <div className="panel-soft mb-3 flex items-center justify-around p-3 text-center">
        <div><div className="numeral text-3xl">{s.kid.lifetime_minutes}</div><div className="text-ink-2 text-xs font-bold">minutes ever</div></div>
        <div><div className="numeral text-3xl">{s.spins.length}</div><div className="text-ink-2 text-xs font-bold">spins pulled</div></div>
        <div><div className="numeral text-3xl">{s.kid.lifetime_points}</div><div className="text-ink-2 text-xs font-bold">points ever</div></div>
      </div>
      {!days.length && (
        <div className="panel p-6 text-center">
          <div className="text-5xl" aria-hidden>📅</div>
          <h2 className="mt-2 text-2xl font-black">Nothing logged yet</h2>
          <p className="text-ink-2 mt-1 font-bold">Start the timer and read. Every minute shows up here.</p>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {days.map(([k, list]) => (
          <li key={k} className="panel p-3">
            <div className="flex items-center justify-between">
              <div className="font-extrabold">{new Date(k + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
              <div className="numeral text-xl text-accent">{list.reduce((n, x) => n + x.minutes, 0)} min</div>
            </div>
            <ul className="mt-1 flex flex-col gap-1">
              {list.map((x) => (
                <li key={x.id} className="text-ink-2 flex justify-between text-sm font-bold">
                  <span className="truncate">{x.note ?? (x.source === "manual" ? "Added by a grown-up" : "Timer")}</span>
                  <span>{x.minutes} min</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
