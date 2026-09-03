"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ApiError, post } from "@/lib/client";
import { fmtPts, quizLength, LENGTH_BUCKETS, type LengthBucket, type LevelLabel } from "@/lib/ar";
import type { Book } from "@/lib/types";
import { ErrorNote, LevelChip } from "./ui";
import Stages, { Shimmer } from "./Stages";
import { play } from "@/lib/sound";

interface Card {
  key: string;
  title: string;
  author: string;
  pages: number | null;
  year: number | null;
  cover: string | null;
  book: (Book & { level: LevelLabel }) | null;
  error?: string;
}

export default function SearchBooks({ kidId, zpd }: { kidId: string; zpd: [number, number] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "finding" | "levels" | "done">("idle");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const seq = useRef(0);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    const my = ++seq.current;
    setPhase("finding");
    setErr(null);
    setCards(null);
    try {
      const res = await post<{ cards: Card[] }>("/api/search", { q, kidId });
      if (my !== seq.current) return;
      setCards(res.cards);
      const pending = res.cards.filter((c) => !c.book);
      setPhase(pending.length ? "levels" : "done");
      // Resolve levels in parallel and fill each card in place.
      await Promise.all(
        pending.map(async (c) => {
          try {
            const r = await post<{ book: Book & { level: LevelLabel } }>("/api/resolve", { kidId, title: c.title, author: c.author, pages: c.pages, year: c.year, cover: c.cover });
            if (my !== seq.current) return;
            setCards((cs) => cs?.map((x) => (x.key === c.key ? { ...x, book: r.book } : x)) ?? cs);
          } catch (e2) {
            if (my !== seq.current) return;
            setCards((cs) => cs?.map((x) => (x.key === c.key ? { ...x, error: e2 instanceof ApiError ? e2.message : "Couldn't find the level." } : x)) ?? cs);
          }
        }),
      );
      if (my === seq.current) setPhase("done");
    } catch (e) {
      if (my !== seq.current) return;
      setErr(e instanceof ApiError ? e.message : "Search didn't work. Try again.");
      setPhase("idle");
    }
  }

  function pick(c: Card) {
    if (!c.book) return;
    play("tap");
    router.push(`/k/${kidId}/book/${c.book.id}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type the book's name"
          enterKeyHint="search"
          autoCapitalize="words"
          autoCorrect="on"
          className="min-h-[56px] min-w-0 flex-1 rounded-2xl bg-panel px-4 text-lg font-bold placeholder:text-ink-2/70"
        />
        <button className="btn btn-accent min-h-[56px] px-5" disabled={phase === "finding" || !q.trim()}>
          Search
        </button>
      </form>
      <p className="text-ink-2 px-1 text-sm font-bold">
        Your zone is level {zpd[0].toFixed(1)} to {zpd[1].toFixed(1)}. Any book counts. Challenge books are extra brave.
      </p>

      {phase === "finding" && <Stages stages={[{ label: "Finding the titles", state: "active" }, { label: "Checking the levels", state: "todo" }]} />}
      {err && <ErrorNote message={err} />}

      {cards && cards.length === 0 && (
        <div className="panel p-6 text-center">
          <div className="text-5xl" aria-hidden>🔭</div>
          <h2 className="mt-2 text-xl font-black">No books found for that</h2>
          <p className="text-ink-2 mt-1 font-bold">Check the spelling, try the author&apos;s name, or add it yourself below.</p>
        </div>
      )}

      {cards && cards.length > 0 && (
        <ul className="flex flex-col gap-2">
          {cards.map((c, i) => {
            const b = c.book;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  disabled={!b}
                  aria-busy={!b && !c.error}
                  className="panel anim-rise flex w-full items-center gap-3 p-3 text-left active:scale-[0.99] disabled:opacity-90"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-panel-2 text-3xl" aria-hidden>
                    {c.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      b?.emoji ?? "📖"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold">{c.title}</div>
                    <div className="text-ink-2 truncate text-sm font-bold">
                      {c.author}
                      {b?.series ? ` · ${b.series}${b.series_number ? ` #${b.series_number}` : ""}` : c.year ? ` · ${c.year}` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {b ? (
                        <>
                          <LevelChip level={b.level} />
                          <span className="chip bg-panel-2 text-ink-2">Level {b.atos.toFixed(1)}</span>
                          <span className="chip bg-panel-2 text-ink-2">{quizLength(b.points)} questions</span>
                        </>
                      ) : c.error ? (
                        <span className="chip bg-panel-2 text-ink-2">{c.error}</span>
                      ) : (
                        <>
                          <Shimmer className="h-7 w-24 rounded-full" />
                          <Shimmer className="h-7 w-20 rounded-full" />
                          <span className="text-ink-2 text-xs font-bold">checking the level…</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-14 text-right">
                    {b ? (
                      <>
                        <div className="numeral text-3xl text-accent">{fmtPts(b.points)}</div>
                        <div className="text-ink-2 text-xs font-bold">pts</div>
                      </>
                    ) : (
                      <Shimmer className="h-9 w-12" />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!manual ? (
        <button type="button" onClick={() => setManual(true)} className="btn btn-ghost tap mt-2 self-center">
          Can&apos;t find it? Add it yourself
        </button>
      ) : (
        <ManualAdd kidId={kidId} zpd={zpd} onError={setErr} />
      )}
    </div>
  );
}

function ManualAdd({ kidId, zpd, onError }: { kidId: string; zpd: [number, number]; onError: (s: string) => void }) {
  const router = useRouter();
  const [length, setLength] = useState<LengthBucket>("early");
  const [busy, setBusy] = useState(false);
  const mid = ((zpd[0] + zpd[1]) / 2).toFixed(1);
  return (
    <form
      className="panel anim-rise flex flex-col gap-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await post<{ bookId: string }>("/api/books", {
            kidId,
            title: fd.get("title"),
            author: fd.get("author"),
            atos: Number(fd.get("atos")),
            length,
            source: "manual",
            emoji: "📖",
          });
          router.push(`/k/${kidId}/book/${res.bookId}`);
        } catch (err) {
          onError(err instanceof ApiError ? err.message : "Couldn't add that book.");
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl font-black">Add a book</h2>
      <label className="flex flex-col gap-1 font-bold">
        Title
        <input name="title" required maxLength={160} className="min-h-[48px] rounded-xl bg-space px-3 text-base font-bold" />
      </label>
      <label className="flex flex-col gap-1 font-bold">
        Author
        <input name="author" required maxLength={120} className="min-h-[48px] rounded-xl bg-space px-3 text-base font-bold" />
      </label>
      <label className="flex flex-col gap-1 font-bold">
        Level (about)
        <input name="atos" type="number" inputMode="decimal" step="0.1" min="0.5" max="12" defaultValue={mid} required className="min-h-[48px] rounded-xl bg-space px-3 text-base font-bold" />
        <span className="text-ink-2 text-xs">Your zone is {zpd[0].toFixed(1)} to {zpd[1].toFixed(1)}. A grown-up can look up the ATOS level on AR BookFinder.</span>
      </label>
      <div className="font-bold">How long is it?</div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LENGTH_BUCKETS) as LengthBucket[]).map((k) => (
          <button key={k} type="button" onClick={() => setLength(k)} className={`btn tap justify-start px-3 text-base ${length === k ? "btn-accent" : ""}`}>
            {LENGTH_BUCKETS[k].label}
          </button>
        ))}
      </div>
      <button className="btn btn-accent btn-big" disabled={busy}>
        {busy ? "Adding…" : "Add this book"}
      </button>
    </form>
  );
}
