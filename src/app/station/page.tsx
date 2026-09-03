import { TopBar, Panel } from "@/components/ui";
import StationMini from "@/components/StationMini";
import { listKids } from "@/lib/db";
import { fmtPts } from "@/lib/ar";
import { STATION_LEVELS, stationFor } from "@/lib/game";
import { avatarEmoji } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Station() {
  const kids = await listKids();
  const combined = kids.reduce((s, k) => s + k.lifetime_points, 0);
  const st = stationFor(combined);
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back="/" title="Space station" />
      <Panel className="flex flex-col items-center">
        <StationMini level={st.current.level} className="h-auto w-full max-w-sm" />
        <h1 className="text-2xl font-black">{st.current.name}</h1>
        <p className="text-ink-2 text-center font-bold">{st.current.blurb}</p>
        <div className="numeral mt-3 text-4xl text-[#7dd3fc]">{fmtPts(combined)} pts</div>
        <div className="text-ink-2 text-sm font-bold">earned together by {kids.map((k) => k.name).join(" and ")}</div>
        {st.next && (
          <div className="mt-3 w-full">
            <div className="gauge">
              <div style={{ width: `${Math.round(st.progress * 100)}%`, background: "#7dd3fc" }} />
            </div>
            <div className="text-ink-2 mt-1 text-center text-sm font-bold">
              {fmtPts(st.next.min - combined)} more points builds the {st.next.name}
            </div>
          </div>
        )}
      </Panel>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {kids.map((k) => (
          <div key={k.id} className="panel-soft flex items-center gap-3 p-3">
            <span className="text-3xl" aria-hidden>{avatarEmoji(k.avatar)}</span>
            <div>
              <div className="font-extrabold">{k.name}</div>
              <div className="text-ink-2 text-sm font-bold">{fmtPts(k.lifetime_points)} pts</div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mt-4 px-1 text-lg font-extrabold">Every level unlocks something for both of you</h2>
      <ol className="mt-2 flex flex-col gap-2">
        {STATION_LEVELS.filter((l) => l.level > 0).map((l) => {
          const done = st.current.level >= l.level;
          return (
            <li key={l.level} className={`panel-soft flex items-center gap-3 p-3 ${done ? "" : "opacity-70"}`}>
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black ${done ? "bg-[#7dd3fc] text-space" : "bg-panel-2"}`}>{done ? "✓" : l.level}</div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">{l.name} <span className="text-ink-2 text-sm">· {l.min} pts</span></div>
                <div className="text-ink-2 text-sm font-bold">{l.unlock}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
