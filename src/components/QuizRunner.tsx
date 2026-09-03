"use client";
import { useEffect, useRef, useState } from "react";
import { ApiError, get, post } from "@/lib/client";
import { play } from "@/lib/sound";
import type { ClientQuestion } from "@/lib/types";
import { ErrorNote, Spinner } from "./ui";

interface Loaded {
  attemptId: string;
  status: string;
  bonusStatus: string | null;
  book: { id: string; title: string; emoji: string | null; points: number };
  questions: ClientQuestion[];
  answers: Record<string, number>;
  flagged: number[];
  maxFlags: number;
  showTip: boolean;
}

const LETTERS = ["A", "B", "C", "D"];
const RIGHT = ["Yes!", "Nice one.", "You read it!", "Exactly.", "Nailed it."];
const WRONG = ["Not that one.", "Close. Keep going.", "That's okay.", "On to the next."];

export interface RunnerProps {
  attemptId: string;
  kind: "main" | "bonus";
  kidId: string;
  onDone: (attemptId: string) => Promise<void>;
}

/** One question per screen. Used for both the main quiz and the bonus round. */
export default function QuizRunner({ attemptId, kind, kidId, onDone }: RunnerProps) {
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [reveal, setReveal] = useState<{ idx: number; correct: boolean; answer: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [tip, setTip] = useState(false);
  const [msg, setMsg] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    get<Loaded>(`/api/attempts/${attemptId}/questions?kind=${kind}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setAnswers(d.answers);
        setFlagged(d.flagged);
        // Resume at the first unanswered, unflagged question.
        const first = d.questions.findIndex((q) => d.answers[String(q.idx)] == null && !d.flagged.includes(q.idx));
        setPos(first < 0 ? d.questions.length : first);
        if (kind === "main" && d.showTip) setTip(true);
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Couldn't load the quiz."));
    return () => {
      alive = false;
    };
  }, [attemptId, kind]);

  const total = data?.questions.length ?? 0;
  const q = data?.questions[pos];

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [pos]);

  async function choose(choice: number) {
    if (!q || busy || reveal) return;
    setBusy(true);
    try {
      const r = await post<{ correct: boolean; answer: number }>("/api/quiz/answer", { attemptId, idx: q.idx, choice, kind });
      setAnswers((a) => ({ ...a, [String(q.idx)]: choice }));
      setReveal({ idx: q.idx, correct: r.correct, answer: r.answer });
      setMsg(r.correct ? RIGHT[Math.floor(Math.random() * RIGHT.length)] : WRONG[Math.floor(Math.random() * WRONG.length)]);
      play(r.correct ? "correct" : "wrong");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function flag() {
    if (!q || busy) return;
    setBusy(true);
    try {
      const r = await post<{ flagged: number[]; limit: number }>("/api/quiz/flag", { attemptId, idx: q.idx });
      setFlagged(r.flagged);
      setReveal(null);
      play("tap");
      advance();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't flag that one.");
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    setReveal(null);
    setMsg("");
    setPos((p) => p + 1);
  }

  useEffect(() => {
    if (!data || finishing) return;
    if (pos >= total && total > 0) {
      setFinishing(true);
      onDone(attemptId).catch((e) => {
        setErr(e instanceof ApiError ? e.message : "Couldn't finish the quiz.");
        setFinishing(false);
      });
    }
  }, [pos, total, data, finishing, onDone, attemptId]);

  if (err) return <ErrorNote message={err} action={<a href={`/k/${kidId}`} className="btn tap">Back to base</a>} />;
  if (!data) return <Spinner label="Loading your questions…" />;
  if (finishing || !q) return <Spinner label={kind === "bonus" ? "Checking the bonus…" : "Adding up your fuel…"} />;

  const answered = answers[String(q.idx)];
  const isFlagged = flagged.includes(q.idx);
  const canFlag = kind === "main" && !isFlagged && flagged.length < data.maxFlags;

  return (
    <div ref={topRef} className="flex flex-col gap-4">
      {tip && (
        <div className="panel anim-pop border-2 border-accent/60 p-4">
          <p className="text-lg font-black">Before you start</p>
          <p className="mt-1 font-bold">
            The computer wrote these questions. If one is about something that is not in your book, tap <em>This isn&apos;t in my book</em>. It gets skipped and it never counts against you.
          </p>
          <button
            className="btn btn-accent mt-3 w-full"
            onClick={() => {
              setTip(false);
              void post("/api/kid", { kidId, seenFlagTip: true }).catch(() => {});
            }}
          >
            Got it
          </button>
        </div>
      )}

      {/* progress dots */}
      <div className="flex items-center gap-2 px-1" aria-label={`Question ${pos + 1} of ${total}`}>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {data.questions.map((qq, i) => {
            const a = answers[String(qq.idx)];
            const f = flagged.includes(qq.idx);
            const cls = f ? "bg-panel-2 opacity-40" : i === pos ? "bg-accent scale-125" : a != null ? "bg-ink" : "bg-panel-2";
            return <span key={qq.idx} className={`h-2.5 w-2.5 rounded-full transition-transform ${cls}`} />;
          })}
        </div>
        <span className="text-ink-2 text-sm font-bold">
          {pos + 1}/{total}
        </span>
      </div>

      <div className={`panel p-5 ${kind === "bonus" ? "border-2 border-[#ffd23f]/60" : ""}`}>
        <p className="text-[22px] font-extrabold leading-snug">{q.q}</p>
      </div>

      <div className="flex flex-col gap-3">
        {q.choices.map((c, i) => {
          let cls = "answer";
          if (reveal) {
            if (i === reveal.answer) cls += " is-correct";
            else if (i === answered) cls += " is-wrong";
            else cls += " is-dim";
          }
          return (
            <button key={i} type="button" className={cls} disabled={busy || Boolean(reveal)} onClick={() => choose(i)}>
              <span className="letter">{LETTERS[i]}</span>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {reveal ? (
        <div className="anim-rise flex items-center gap-3">
          <p className={`flex-1 text-lg font-black ${reveal.correct ? "text-[#3ecf6a]" : "text-ink-2"}`}>{msg}</p>
          <button type="button" className="btn btn-accent min-h-[56px] px-8" onClick={advance}>
            {pos + 1 >= total ? "Finish" : "Next"}
          </button>
        </div>
      ) : (
        canFlag && (
          <button type="button" onClick={flag} disabled={busy} className="btn btn-ghost tap self-center text-sm">
            🚩 This isn&apos;t in my book
          </button>
        )
      )}
    </div>
  );
}
