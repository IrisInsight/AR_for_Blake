/** Staged status in the app's voice, instead of a bare spinner. */
export interface Stage {
  label: string;
  state: "done" | "active" | "todo";
}

export default function Stages({ stages, hint }: { stages: Stage[]; hint?: string }) {
  return (
    <div className="panel-soft flex flex-col gap-2 p-4" role="status" aria-live="polite">
      {stages.map((s, i) => (
        <div key={i} className={`flex items-center gap-3 font-extrabold ${s.state === "todo" ? "text-ink-2 opacity-60" : ""}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel-2 text-base" aria-hidden>
            {s.state === "done" ? "✓" : s.state === "active" ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-[3px] border-accent border-t-transparent" /> : "·"}
          </span>
          <span>{s.label}</span>
        </div>
      ))}
      {hint && <p className="text-ink-2 pl-11 text-sm font-bold">{hint}</p>}
    </div>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return <span className={`inline-block animate-pulse rounded-lg bg-panel-2 ${className ?? "h-4 w-16"}`} aria-hidden />;
}
