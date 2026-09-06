"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SoundToggle from "@/components/SoundToggle";
import { ErrorNote } from "@/components/ui";
import { ACCENT_COLORS, avatarEmoji } from "@/lib/catalog";
import { ApiError, post } from "@/lib/client";
import { expectedValue } from "@/lib/slots";
import type { Kid, LedgerEntry, ReadingSession } from "@/lib/types";

export default function GrownupClient({ kid, sessions, ledger, code, link, timerRunning }: { kid: Kid; sessions: ReadingSession[]; ledger: LedgerEntry[]; code: string; link: string; timerRunning: boolean }) {
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

  const ev = expectedValue();
  const minutesPerJackpot = Math.round(kid.goal_points / ev);

  return (
    <div className="flex flex-col gap-4">
      {err && <ErrorNote message={err} />}

      <AddMinutes busy={busy} onAdd={(p) => act({ action: "addMinutes", kidId: kid.id, ...p })} />

      <ShareLink code={code} link={link} />

      {timerRunning && (
        <section className="panel flex flex-col gap-2 border-2 border-[#ffd23f]/60 p-4">
          <div className="font-extrabold">⏱️ The reading timer is running right now</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="btn tap text-sm" onClick={() => act({ action: "stopTimer", kidId: kid.id })}>Stop it and credit the minutes</button>
            <button type="button" disabled={busy} className="btn tap text-sm text-[#ff8a8a]" onClick={() => act({ action: "cancelTimer", kidId: kid.id }, "Stop the timer without counting any minutes?")}>Cancel it (no minutes)</button>
          </div>
        </section>
      )}

      <KidEditor kid={kid} busy={busy} minutesPerJackpot={minutesPerJackpot} onSave={(p) => act({ action: "updateKid", kidId: kid.id, ...p })} onBonus={(n) => act({ action: "addSpins", kidId: kid.id, spins: n }, `Give ${kid.name} ${n} bonus spins?`)} onResetAll={() => act({ action: "resetAll", kidId: kid.id }, `Erase ALL of ${kid.name}'s history: minutes, spins, points, coins, badges, trophies? This cannot be undone.`)} />

      <div className="panel flex items-center justify-between p-4">
        <div>
          <div className="font-extrabold">Sound effects</div>
          <div className="text-ink-2 text-sm font-bold">Saved on this device.</div>
        </div>
        <SoundToggle big />
      </div>

      <section>
        <h2 className="px-1 text-lg font-extrabold">Reading sessions</h2>
        <p className="text-ink-2 px-1 pb-2 text-sm font-bold">Deleting one takes back its minutes and any unspent spins.</p>
        <ul className="flex flex-col gap-2">
          {sessions.filter((s) => s.ended_at).map((s) => (
            <li key={s.id} className="panel-soft flex items-center gap-3 p-3">
              <span className="text-2xl" aria-hidden>{s.source === "manual" ? "✍️" : "⏱️"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold">{s.minutes} min{s.note ? ` · ${s.note}` : ""}</div>
                <div className="text-ink-2 text-xs font-bold">{new Date(s.ended_at as string).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              </div>
              <button type="button" disabled={busy} onClick={() => act({ action: "deleteSession", sessionId: s.id }, `Delete this ${s.minutes}-minute session?`)} className="btn tap px-3 text-sm">Delete</button>
            </li>
          ))}
          {!sessions.some((s) => s.ended_at) && <li className="text-ink-2 px-1 font-bold">No reading logged yet.</li>}
        </ul>
      </section>

      <section className="panel-soft p-3">
        <div className="mb-1 font-extrabold">Recent coins · {kid.bolts} 🪙</div>
        <ul className="text-ink-2 flex flex-col gap-0.5 text-xs font-bold">
          {ledger.map((l) => (
            <li key={l.id} className="flex justify-between gap-2"><span className="truncate">{l.reason}</span><span className={l.amount < 0 ? "" : "text-bolt"}>{l.amount > 0 ? "+" : ""}{l.amount}</span></li>
          ))}
          {!ledger.length && <li>Nothing yet.</li>}
        </ul>
      </section>

      <div className="panel-soft p-4 text-sm font-bold text-ink-2">
        <div className="text-ink font-extrabold">How it works</div>
        One minute of reading = one spin. Every spin pays at least 2 points; pairs pay 6, triples 25 to 150, three gems 500. That averages about {ev.toFixed(1)} points a spin, so a {kid.goal_points}-point jackpot is roughly {minutesPerJackpot} minutes of reading. Coins are separate: they only buy looks for the machine and never touch points. The timer stops crediting after 120 minutes in one sitting.
      </div>

      <div className="panel-soft p-4 text-sm font-bold text-ink-2">
        <div className="text-ink font-extrabold">Put it on the home screen</div>
        iPhone or iPad: open this page in Safari, tap Share, then &quot;Add to Home Screen&quot;. It opens full screen like an app.
      </div>
    </div>
  );
}

function ShareLink({ code, link }: { code: string; link: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel flex flex-col gap-2 p-4">
      <div className="font-extrabold">Family link</div>
      <p className="text-ink-2 text-sm font-bold">Open this link once on any phone or iPad and it stays signed in. Without it, the app asks for the code.</p>
      <div className="flex items-center gap-2">
        <input readOnly value={link} className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-space px-3 text-sm font-bold" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn tap px-4 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-ink-2 text-sm font-bold">Code: <span className="text-ink font-black tracking-widest">{code}</span></div>
        <button type="button" disabled={busy} className="btn btn-ghost tap text-sm" onClick={async () => { if (!window.confirm("Make a new code? Every other device will need the new link.")) return; setBusy(true); await post("/api/gate/rotate", {}).catch(() => {}); setBusy(false); router.refresh(); }}>
          Make a new code
        </button>
      </div>
    </section>
  );
}

const QUICK = [10, 15, 20, 30, 45, 60];

function AddMinutes({ busy, onAdd }: { busy: boolean; onAdd: (p: { minutes: number; note: string; when: string }) => void }) {
  const [minutes, setMinutes] = useState(20);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState<"now" | "yesterday">("now");
  const [added, setAdded] = useState<number | null>(null);
  return (
    <section id="add" className="panel flex flex-col gap-3 border-2 border-accent/60 p-4">
      <div>
        <div className="text-xl font-black">Add reading minutes</div>
        <p className="text-ink-2 text-sm font-bold">For reading away from the timer: school, the car, bedtime. Each minute is a spin.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK.map((n) => (
          <button key={n} type="button" onClick={() => setMinutes(n)} aria-pressed={minutes === n} className={`btn tap text-lg ${minutes === n ? "btn-accent" : ""}`}>
            {n} min
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-space p-2">
        <button type="button" aria-label="Less" onClick={() => setMinutes((m) => Math.max(1, m - 5))} className="tap grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-xl font-black">−</button>
        <label className="flex items-baseline gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={300}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(300, Math.round(Number(e.target.value) || 0))))}
            aria-label="Minutes"
            className="numeral w-24 rounded-xl bg-panel px-2 text-center text-3xl"
          />
          <span className="text-ink-2 text-base font-bold">min</span>
        </label>
        <button type="button" aria-label="More" onClick={() => setMinutes((m) => Math.min(300, m + 5))} className="tap grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-xl font-black">+</button>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional): read at school" maxLength={80} className="min-h-[48px] rounded-xl bg-space px-3 text-base font-bold" />
      <div className="flex gap-2">
        {(["now", "yesterday"] as const).map((w) => (
          <button key={w} type="button" onClick={() => setWhen(w)} className={`btn tap flex-1 text-base ${when === w ? "btn-accent" : ""}`}>{w === "now" ? "Today" : "Yesterday"}</button>
        ))}
      </div>
      <button type="button" disabled={busy || minutes < 1} className="btn btn-accent btn-big" onClick={() => { const d = new Date(); if (when === "yesterday") d.setDate(d.getDate() - 1); onAdd({ minutes, note, when: d.toISOString() }); setNote(""); setAdded(minutes); }}>
        Add {minutes} minutes ({minutes} spin{minutes === 1 ? "" : "s"})
      </button>
      {added != null && !busy && <p className="anim-rise text-center font-extrabold text-[#3ecf6a]">Added {added} minutes. {added} spin{added === 1 ? "" : "s"} are waiting on the machine.</p>}
    </section>
  );
}

function KidEditor({ kid, busy, minutesPerJackpot, onSave, onBonus, onResetAll }: { kid: Kid; busy: boolean; minutesPerJackpot: number; onSave: (p: Record<string, unknown>) => void; onBonus: (n: number) => void; onResetAll: () => void }) {
  const [name, setName] = useState(kid.name);
  const [goal, setGoal] = useState(kid.goal_points);
  const [accent, setAccent] = useState(kid.accent);
  const dirty = name !== kid.name || goal !== kid.goal_points || accent !== kid.accent;
  return (
    <section className="panel flex flex-col gap-3 p-4" style={{ borderTop: `6px solid ${accent}` }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>{avatarEmoji(kid.avatar)}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Name" className="min-h-[48px] min-w-0 flex-1 rounded-xl bg-space px-3 text-lg font-extrabold" />
      </div>
      <div className="rounded-2xl bg-space p-2">
        <div className="text-sm font-bold">Jackpot goal (points)</div>
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Less goal" onClick={() => setGoal((g) => Math.max(25, g - 25))} className="tap grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-xl font-black">−</button>
          <span className="numeral text-3xl">{goal}</span>
          <button type="button" aria-label="More goal" onClick={() => setGoal((g) => Math.min(5000, g + 25))} className="tap grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-xl font-black">+</button>
        </div>
        <div className="text-ink-2 text-xs font-bold">About {Math.round(goal / (kid.goal_points / minutesPerJackpot))} minutes of reading per jackpot · {kid.lifetime_minutes} minutes so far</div>
      </div>
      <div>
        <div className="mb-1 text-sm font-bold">Color</div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button key={c.id} type="button" aria-label={c.label} aria-pressed={accent === c.id} onClick={() => setAccent(c.id)} className={`tap h-11 w-11 rounded-xl border-4 ${accent === c.id ? "border-white" : "border-transparent"}`} style={{ background: c.id }} />
          ))}
        </div>
      </div>
      <button type="button" disabled={!dirty || busy} onClick={() => onSave({ name, goal, accent })} className="btn btn-accent">Save {kid.name}</button>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => onBonus(5)} className="btn tap text-sm">Give 5 bonus spins</button>
        <button type="button" disabled={busy} onClick={onResetAll} className="btn tap text-sm text-[#ff8a8a]">Erase everything</button>
      </div>
    </section>
  );
}
