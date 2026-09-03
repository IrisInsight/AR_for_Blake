"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import QuizRunner from "@/components/QuizRunner";
import { post } from "@/lib/client";

export default function QuizClient({ kidId, attemptId }: { kidId: string; attemptId: string }) {
  const router = useRouter();
  const onDone = useCallback(
    async (id: string) => {
      const result = await post("/api/quiz/finish", { attemptId: id });
      try {
        sessionStorage.setItem(`rr:result:${id}`, JSON.stringify(result));
      } catch {
        /* ignore */
      }
      router.replace(`/k/${kidId}/results/${id}`);
    },
    [kidId, router],
  );
  return <QuizRunner attemptId={attemptId} kind="main" kidId={kidId} onDone={onDone} />;
}
