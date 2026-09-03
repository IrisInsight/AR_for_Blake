"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SoundToggle from "@/components/SoundToggle";
import { ErrorNote } from "@/components/ui";
import { ACCENT_COLORS, avatarEmoji } from "@/lib/catalog";
import { ApiError, post } from "@/lib/client";
import { fmtPts, zpdFor } from "@/lib/ar";
import type { Kid, LedgerEntry } from "@/lib/types";

interface AttemptRow {
  id: string;
  kidId: string;
  title: string;
  status: string;
  percent: number | null;
  points: number;
  when: string;
  bonus: string | null;
  flagged: number;
}

export default function GrownupClient({ kids, attempts, ledgers, keyOk }: { kids: Kid[]; attempts: AttemptRow[]; ledgers: Record<string, LedgerEntry[]>; keyOk: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    try {
      await post("/api/grownup", payload);
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`panel p-4 ${keyOk ? "" : "border-2 border-[#ffd23f]/60"}`}>
        <div className="font-extrabold">{keyOk ? "✅ Claude is connected" : "⚠️ Claude is not connected yet"}</div>
        <p className="text-ink-2 mt-1 text-sm font-bold">
          {keyOk
            ? "Book search and quiz writing are working."
            : "Add ANTHROPIC_API_KEY to the Vercel project's environment variables and redeploy. Until then, book search and quizzes show a friendly message instead of working."}
        </p>
      </div>

      <div className="panel flex items-center justify-between p-4">
        <div>
          <div className="font-extrabold">Sound effects</div>
          <div className="text-ink-2 text-sm font-bold">Saved on this device.</div>
        </div>
        <SoundToggle big />
      </div>

      {err && <ErrorNote message={err} />}

      {kids.map((k) => (
        <KidEditor key={k.id} kid={k} busy={busy} onSave={(p) => act({ action: "updateKid", kidId: k.id, ...p })} onResetPeriod={() => act({ action: "resetPeriod", kidId: k.id }, `Start ${k.name}'s current rocket over? Books stay in the library but stop counting toward this goal.`)} onResetAll={() => act({ action: "resetAll", kidId: k.id }, `Erase ALL of ${k.name}'s history: books, points, bolts, badges, planets? This cannot be undone.`)} />
      ))}

      <section>
        <h2 className="px-1 text-lg font-extrabold">Quiz history</h2>
        <p className="text-ink-2 px-1 pb-2 text-sm font-bold">Clearing a quiz lets Blake take it again. Points from a cleared quiz are removed; bolts and badges stay.</p>
        <ul className="flex flex-col gap-2">
          {attempts.map((a) => {
            const kid = kids.find((k) => k.id === a.kidId);
            return (
              <li key={a.id} className="panel-soft flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden>{avatarEmoji(kid?.avatar ?? "astronaut")}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{a.title}</div>
                  <div className="text-ink-2 text-xs font-bold">
                    {kid?.name} · {new Date(a.when).toLocaleDateString()} · {a.status === "in_progress" ? "in progress" : `${Math.round((a.percent ?? 0) * 100)}% · ${fmtPts(a.points)} pts`}
                    {a.bonus === "passed" ? " · bonus ✓" : a.bonus === "failed" ? " · bonus ✗" : ""}
                    {a.flagged ? ` · ${a.flagged} flagged` : ""}
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => act({ action: "clearAttempt", attemptId: a.id }, `Clear "${a.title}" for ${kid?.name}?`)} className="btn tap px-3 text-sm">
                  Clear
                </button>
              </li>
            );
          })}
          {!attempts.length && <li className="text-ink-2 px-1 font-bold">No quizzes yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="px-1 text-lg font-extrabold">Recent bolts</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {kids.map((k) => (
            <div key={k.id} className="panel-soft p-3">
              <div className="mb-1 font-extrabold">{k.name} · {k.bolts} 🔩</div>
              <ul className="text-ink-2 flex flex-col gap-0.5 text-xs font-bold">
                {(ledgers[k.id] ?? []).map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="truncate">{l.reason}</span>
                    <span className={l.amount < 0 ? "" : "text-bolt"}>{l.amount > 0 ? "+" : ""}{l.amount}</span>
                  </li>
                ))}
                {!(ledgers[k.id] ?? []).length && <li>Nothing yet.</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="panel-soft p-4 text-sm font-bold text-ink-2">
        <div className="text-ink font-extrabold">Put it on the home screen</div>
        iPhone or iPad: open this page in Safari, tap Share, then &quot;Add to Home Screen&quot;. It opens full screen like an app.
      </div>
    </div>
  );
}

function KidEditor({ kid, busy, onSave, onResetPeriod, onResetAll }: { kid: Kid; busy: boolean; onSave: (p: Record<string, unknown>) => void; onResetPeriod: () => void; onResetAll: () => void }) {
  const [name, setName] = useState(kid.name);
  const [grade, setGrade] = useState(kid.grade);
  const [goal, setGoal] = useState(kid.goal_points);
  const [accent, setAccent] = useState(kid.accent);
  const dirty = name !== kid.name || grade !== kid.grade || goal !== kid.goal_points || accent !== kid.accent;
  const zpd = zpdFor(grade);
  return (
    <section className="panel flex flex-col gap-3 p-4" style={{ borderTop: `6px solid ${accent}` }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>{avatarEmoji(kid.avatar)}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Name" className="min-h-[48px] min-w-0 flex-1 rounded-xl bg-space px-3 text-lg font-extrabold" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Grade" value={grade} min={1} max={8} step={1} onChange={setGrade} hint={`Zone ${zpd[0].toFixed(1)} to ${zpd[1].toFixed(1)}`} />
        <Stepper label="Goal (points)" value={goal} min={1} max={200} step={goal >= 20 ? 5 : 1} onChange={setGoal} hint={`${fmtPts(kid.lifetime_points)} lifetime`} />
      </div>
      <div>
        <div className="mb-1 text-sm font-bold">Color</div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button key={c.id} type="button" aria-label={c.label} aria-pressed={accent === c.id} onClick={() => setAccent(c.id)} className={`tap h-11 w-11 rounded-xl border-4 ${accent === c.id ? "border-white" : "border-transparent"}`} style={{ background: c.id }} />
          ))}
        </div>
      </div>
      <button type="button" disabled={!dirty || busy} onClick={() => onSave({ name, grade, goal, accent })} className="btn btn-accent">
        Save {kid.name}
      </button>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onResetPeriod} className="btn tap text-sm">Restart current rocket</button>
        <button type="button" disabled={busy} onClick={onResetAll} className="btn tap text-sm text-[#ff8a8a]">Erase everything</button>
      </div>
    </section>
  );
}

function Stepper({ label, value, min, max, step, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="rounded-2xl bg-space p-2">
      <div className="text-sm font-bold">{label}</div>
      <div className="flex items-center justify-between">
        <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, value - step))} className="tap grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-xl font-black">−</button>
        <span className="numeral text-3xl">{Number.isInteger(value) ? value : value.toFixed(1)}</span>
        <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + step))} className="tap grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-xl font-black">+</button>
      </div>
      {hint && <div className="text-ink-2 text-xs font-bold">{hint}</div>}
    </div>
  );
}
