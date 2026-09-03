"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, post } from "@/lib/client";
import { play } from "@/lib/sound";
import { ErrorNote, Spinner } from "./ui";

const LINES = [
  "Reading the whole book really fast…",
  "Writing your questions…",
  "Checking every answer…",
  "Fueling up the quiz…",
  "Almost ready. Big books take a minute…",
];

export default function StartQuiz({ kidId, bookId, resumeId, cached }: { kidId: string; bookId: string; resumeId: string | null; cached: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [line, setLine] = useState(0);

  // Warm the question cache while the kid reads this page.
  useEffect(() => {
    if (!cached && !resumeId) void post("/api/quiz/prepare", { bookId }).catch(() => {});
  }, [bookId, cached, resumeId]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 4000);
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
        <Spinner label={cached ? "Loading your quiz…" : LINES[line]} />
      ) : (
        <button type="button" onClick={start} className="btn btn-accent btn-big">
          {resumeId ? "Keep going" : "Start the quiz"}
        </button>
      )}
      {err && <ErrorNote message={err} action={<button className="btn tap" onClick={start}>Try again</button>} />}
    </div>
  );
}
