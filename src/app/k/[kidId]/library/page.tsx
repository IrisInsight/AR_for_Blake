import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar, LevelChip } from "@/components/ui";
import { fmtPts } from "@/lib/ar";
import { kidState } from "@/lib/engine";

export default async function Library({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const s = await kidState(kidId);
  if (!s) notFound();
  const done = s.attempts.filter((a) => a.status !== "in_progress");
  const passed = done.filter((a) => a.status === "passed");
  return (
    <main className="safe-x safe-bottom mx-auto max-w-3xl">
      <TopBar back={`/k/${kidId}`} title="Library" bolts={s.kid.bolts} />
      <div className="panel-soft mb-3 flex items-center justify-around p-3 text-center">
        <div>
          <div className="numeral text-3xl">{passed.length}</div>
          <div className="text-ink-2 text-xs font-bold">books finished</div>
        </div>
        <div>
          <div className="numeral text-3xl">{fmtPts(s.kid.lifetime_points)}</div>
          <div className="text-ink-2 text-xs font-bold">lifetime points</div>
        </div>
        <div>
          <div className="numeral text-3xl">{passed.reduce((n, a) => n + a.book.word_count, 0).toLocaleString()}</div>
          <div className="text-ink-2 text-xs font-bold">words read</div>
        </div>
      </div>
      {!done.length && (
        <div className="panel p-6 text-center">
          <div className="text-5xl" aria-hidden>📚</div>
          <h2 className="mt-2 text-2xl font-black">Your shelf is empty</h2>
          <p className="text-ink-2 mt-1 font-bold">Finish a book, then find it here.</p>
          <Link href={`/k/${kidId}/search`} className="btn btn-accent mt-4">Find a book</Link>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {done.map((a) => (
          <li key={a.id} className="panel flex items-center gap-3 p-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-panel-2 text-2xl" aria-hidden>
              {a.book.emoji ?? "📖"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-extrabold">{a.book.title}</div>
              <div className="text-ink-2 truncate text-sm font-bold">{a.book.author}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-xs font-bold">
                {a.level_label && <LevelChip level={a.level_label} />}
                <span className="chip bg-panel-2">{Math.round((a.percent ?? 0) * 100)}% correct</span>
                {a.bonus_status === "passed" && <span className="chip bg-panel-2">🎯 bonus</span>}
                {a.status === "failed" && <Link href={`/k/${kidId}/book/${a.book_id}`} className="chip bg-panel-2">Read again</Link>}
              </div>
            </div>
            <div className="text-right">
              <div className={`numeral text-2xl ${a.status === "passed" ? "text-accent" : "text-ink-2"}`}>{fmtPts(a.points_earned)}</div>
              <div className="text-ink-2 text-xs font-bold">pts</div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
