"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, post } from "@/lib/client";
import { play } from "@/lib/sound";
import { ErrorNote } from "./ui";
import Stages from "./Stages";

const HINTS = ["Big books take a minute. Worth it.", "Reading the whole book really fast…", "Checking every answer twice…", "Almost there…"];

export default function StartQuiz({ kidId, bookId, resumeId, cached }: { kidId: string; bookId: string; resumeId: string | null; cached: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState(0);
  const [warmed, setWarmed] = useState(cached);

  // Warm the question cache while the kid reads this page.
  useEffect(() => {
    if (cached || resumeId) return;
    let alive = true;
    post("/api/quiz/prepare", { bookId })
      .then(() => alive && setWarmed(true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [bookId, cached, resumeId]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 5000);
    return () => clearInterval(t);
  }, [busy]);

  async function start() {
    play("tap");
    if (resumeId) {
      router.push(`/k/${kidId}/quiz/${resumeId}`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await post<{ attemptId: string }>("/api/quiz/start", { kidId, bookId });
      router.push(`/k/${kidId}/quiz/${res.attemptId}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "The quiz didn't load. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {busy ? (
        <Stages
          stages={[
            { label: "Found your book", state: "done" },
            { label: "Checked the level", state: "done" },
            { label: warmed ? "Questions ready" : "Writing the questions", state: warmed ? "done" : "active" },
            { label: "Fueling up the quiz", state: warmed ? "active" : "todo" },
          ]}
          hint={warmed ? undefined : HINTS[hint]}
        />
      ) : (
        <button type="button" onClick={start} className="btn btn-accent btn-big">
          {resumeId ? "Keep going" : "Start the quiz"}
        </button>
      )}
      {!busy && !resumeId && !warmed && <p className="text-ink-2 text-center text-xs font-bold">Getting your questions ready in the background…</p>}
      {err && <ErrorNote message={err} action={<button className="btn tap" onClick={start}>Try again</button>} />}
    </div>
  );
}
