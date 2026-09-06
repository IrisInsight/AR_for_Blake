import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui";
import { kidState } from "@/lib/engine";

export default async function Trophies({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  const { jackpots, kid, meter } = s;
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title="Trophy shelf" coins={kid.bolts} />
      {!jackpots.length ? (
        <div className="panel p-6 text-center">
          <div className="text-5xl" aria-hidden>🏆</div>
          <h2 className="mt-2 text-2xl font-black">The shelf is empty</h2>
          <p className="text-ink-2 mt-1 font-bold">Fill the jackpot meter ({meter} of {kid.goal_points}) and your first trophy lands here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {jackpots.map((j) => (
            <div key={j.id} className="panel flex flex-col items-center gap-1 p-4 text-center">
              <svg viewBox="0 0 100 100" className="h-24 w-24" aria-hidden>
                <path d="M30 14h40v22a20 20 0 0 1-40 0z" fill={j.color} stroke="#0b1230" strokeWidth="3" />
                <path d="M30 20H16a12 12 0 0 0 12 22M70 20h14a12 12 0 0 1-12 22" fill="none" stroke={j.color} strokeWidth="6" strokeLinecap="round" />
                <rect x="44" y="56" width="12" height="14" fill={j.color} />
                <rect x="30" y="70" width="40" height="10" rx="3" fill="#c9d1de" />
                <rect x="24" y="80" width="52" height="8" rx="3" fill="#8a94a8" />
                <text x="50" y="34" textAnchor="middle" fontSize="16" fontWeight="900" fill="#0b1230">{j.seq}</text>
              </svg>
              <div className="font-extrabold leading-tight">{j.name}</div>
              <div className="text-ink-2 text-xs font-bold">{j.points} pts · {j.minutes} min · {new Date(j.hit_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
