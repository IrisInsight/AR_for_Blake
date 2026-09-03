"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import QuizRunner from "@/components/QuizRunner";
import { ApiError, post } from "@/lib/client";
import { play } from "@/lib/sound";
import { ErrorNote, Spinner } from "@/components/ui";

const LINES = ["Writing three tough ones…", "Thinking about why things happened…", "Almost ready…"];

export default function BonusClient({ kidId, attemptId, started }: { kidId: string; attemptId: string; started: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "loading" | "run">(started ? "run" : "intro");
  const [err, setErr] = useState<string | null>(null);
  const [line, setLine] = useState(0);

  async function begin() {
    play("tap");
    setPhase("loading");
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 4000);
    try {
      await post("/api/bonus/start", { attemptId });
      setPhase("run");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "The bonus didn't load.");
      setPhase("intro");
    } finally {
      clearInterval(t);
    }
  }

  const onDone = useCallback(
    async (id: string) => {
      const result = await post("/api/bonus/finish", { attemptId: id });
      try {
        sessionStorage.setItem(`rr:bonus:${id}`, JSON.stringify(result));
      } catch {
        /* ignore */
      }
      router.replace(`/k/${kidId}/results/${id}?bonus=1`);
    },
    [kidId, router],
  );

  if (phase === "run") return <QuizRunner attemptId={attemptId} kind="bonus" kidId={kidId} onDone={onDone} />;
  if (phase === "loading") return <Spinner label={LINES[line]} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="panel border-2 border-[#ffd23f]/60 p-5 text-center">
        <div className="text-6xl" aria-hidden>⚡</div>
        <h1 className="mt-2 text-2xl font-black">Bonus mission</h1>
        <p className="mt-2 font-bold">Three harder questions. Not about what happened. About <em>why</em>.</p>
        <p className="mt-2 font-bold">
          Get all three right: <span className="text-accent">+0.5 points</span> and <span className="text-bolt">+5 bolts</span>.
        </p>
        <p className="text-ink-2 mt-2 text-sm font-bold">Miss one and you keep everything you already earned. Nothing is lost. One bonus per book.</p>
      </div>
      {err && <ErrorNote message={err} />}
      <button type="button" onClick={begin} className="btn btn-accent btn-big">
        I&apos;ll take the mission
      </button>
      <button
        type="button"
        onClick={async () => {
          await post("/api/bonus/decline", { attemptId }).catch(() => {});
          router.replace(`/k/${kidId}`);
        }}
        className="btn btn-ghost tap self-center"
      >
        Not this time
      </button>
    </div>
  );
}
