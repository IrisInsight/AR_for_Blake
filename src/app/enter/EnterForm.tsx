"use client";
import { useState } from "react";
import { ApiError, post } from "@/lib/client";
import { ErrorNote } from "@/components/ui";

export default function EnterForm() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex w-full flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await post("/api/enter", { code });
          window.location.href = "/";
        } catch (er) {
          setErr(er instanceof ApiError ? er.message : "That didn't work.");
          setBusy(false);
        }
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="FAMILY CODE"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={16}
        className="min-h-[60px] rounded-2xl bg-panel px-4 text-center text-2xl font-black tracking-[0.2em]"
      />
      {err && <ErrorNote message={err} />}
      <button className="btn btn-accent btn-big" disabled={busy || code.length < 4}>
        Let me in
      </button>
    </form>
  );
}
