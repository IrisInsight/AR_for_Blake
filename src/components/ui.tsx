import Link from "next/link";
import SoundToggle from "./SoundToggle";

export function TopBar({ back, title, right, bolts }: { back?: string; title?: string; right?: React.ReactNode; bolts?: number }) {
  return (
    <header className="safe-top safe-x flex items-center gap-3 pb-2">
      {back ? (
        <Link href={back} aria-label="Back" className="tap grid h-11 w-11 place-items-center rounded-2xl bg-panel-2 text-xl">
          ←
        </Link>
      ) : (
        <span className="w-11" />
      )}
      <div className="min-w-0 flex-1 truncate text-lg font-extrabold">{title}</div>
      {bolts != null && <BoltsChip n={bolts} />}
      {right}
      <SoundToggle />
    </header>
  );
}

export function BoltsChip({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`chip bg-panel-2 text-bolt ${className}`} title="Bolts">
      <span aria-hidden>🔩</span>
      <span className="numeral text-base">{n}</span>
      <span className="sr-only">bolts</span>
    </span>
  );
}

export function Panel({ children, className = "", soft = false }: { children: React.ReactNode; className?: string; soft?: boolean }) {
  return <section className={`${soft ? "panel-soft" : "panel"} p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-lg font-extrabold">{children}</h2>
      {action}
    </div>
  );
}

export function LevelChip({ level }: { level: "easy" | "just_right" | "challenge" }) {
  const map = {
    easy: { text: "Easy", cls: "bg-[#2b3a6b] text-ink-2" },
    just_right: { text: "Just right", cls: "bg-[#1f6b46] text-white" },
    challenge: { text: "Challenge ⚡", cls: "bg-[#ffd23f] text-[#0b1230]" },
  }[level];
  return <span className={`chip ${map.cls}`}>{map.text}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-ink-2" role="status">
      <div className="anim-float text-4xl" aria-hidden>
        🛰️
      </div>
      {label && <p className="text-center text-base font-bold">{label}</p>}
    </div>
  );
}

export function ErrorNote({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="panel border-2 border-[#e5484d]/50 p-4 text-base">
      <p className="font-bold">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
