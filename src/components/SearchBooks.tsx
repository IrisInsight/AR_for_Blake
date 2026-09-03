"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, post } from "@/lib/client";
import { fmtPts, quizLength, LENGTH_BUCKETS, type LengthBucket } from "@/lib/ar";
import type { BookCandidate } from "@/lib/types";
import { ErrorNote, LevelChip, Spinner } from "./ui";
import { play } from "@/lib/sound";

const WAIT_LINES = ["Checking the library computer…", "Counting the words…", "Looking up the level…", "Almost there…"];

export default function SearchBooks({ kidId, zpd }: { kidId: string; zpd: [number, number] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BookCandidate[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const [line, setLine] = useState(0);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setErr(null);
    setResults(null);
    setLine(0);
    const t = setInterval(() => setLine((l) => (l + 1) % WAIT_LINES.length), 2500);
    try {
      const res = await post<{ results: BookCandidate[] }>("/api/search", { q, kidId });
      setResults(res.results);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Search didn't work. Try again.");
    } finally {
      clearInterval(t);
      setBusy(false);
    }
  }

  async function pick(c: BookCandidate, i: number) {
    setPicking(i);
    play("tap");
    try {
      const res = await post<{ bookId: string }>("/api/books", { kidId, ...c, source: "search" });
      router.push(`/k/${kidId}/book/${res.bookId}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't save that book.");
      setPicking(null);
    }
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
        <button className="btn btn-accent min-h-[56px] px-5" disabled={busy || !q.trim()}>
          Search
        </button>
      </form>
      <p className="text-ink-2 px-1 text-sm font-bold">
        Your zone is level {zpd[0].toFixed(1)} to {zpd[1].toFixed(1)}. Any book counts. Challenge books are extra brave.
      </p>

      {busy && <Spinner label={WAIT_LINES[line]} />}
      {err && <ErrorNote message={err} />}

      {results && results.length === 0 && (
        <div className="panel p-6 text-center">
          <div className="text-5xl" aria-hidden>🔭</div>
          <h2 className="mt-2 text-xl font-black">No kid books found for that</h2>
          <p className="text-ink-2 mt-1 font-bold">Check the spelling, try the author&apos;s name, or add it yourself below.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(c, i)}
                disabled={picking != null}
                className="panel anim-rise flex w-full items-center gap-3 p-3 text-left active:scale-[0.99] disabled:opacity-60"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-panel-2 text-3xl" aria-hidden>
                  {c.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-extrabold">{c.title}</div>
                  <div className="text-ink-2 truncate text-sm font-bold">
                    {c.author}
                    {c.series ? ` · ${c.series}${c.series_number ? ` #${c.series_number}` : ""}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <LevelChip level={c.level} />
                    <span className="chip bg-panel-2 text-ink-2">Level {c.atos.toFixed(1)}</span>
                    <span className="chip bg-panel-2 text-ink-2">{quizLength(c.points)} questions</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="numeral text-3xl text-accent">{fmtPts(c.points)}</div>
                  <div className="text-ink-2 text-xs font-bold">pts</div>
                </div>
              </button>
            </li>
          ))}
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
          <button
            key={k}
            type="button"
            onClick={() => setLength(k)}
            className={`btn tap justify-start px-3 text-base ${length === k ? "btn-accent" : ""}`}
          >
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
