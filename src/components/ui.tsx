import Link from "next/link";
import SoundToggle from "./SoundToggle";

export function TopBar({ back, title, coins }: { back?: string; title: string; coins?: number }) {
  return (
    <header className="safe-top flex items-center gap-2 pb-3">
      {back && (
        <Link href={back} aria-label="Back" className="tap grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-panel-2 text-xl">
          ←
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-2xl font-black">{title}</h1>
      {coins != null && <CoinsChip n={coins} />}
      <SoundToggle />
    </header>
  );
}

export function CoinsChip({ n }: { n: number }) {
  return (
    <span className="chip bg-panel-2 text-bolt" aria-label={`${n} coins`}>
      <span aria-hidden>🪙</span>
      <span className="numeral text-base">{n}</span>
    </span>
  );
}

export function Panel({ children, className = "", soft = false }: { children: React.ReactNode; className?: string; soft?: boolean }) {
  return <div className={`${soft ? "panel-soft" : "panel"} p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 px-1 text-lg font-extrabold">{children}</h2>;
}

export function ErrorNote({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="panel-soft flex items-center gap-3 border-2 border-[#e5484d]/50 p-3" role="alert">
      <span className="text-2xl" aria-hidden>⚠️</span>
      <p className="flex-1 font-bold">{message}</p>
      {action}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center" role="status">
      <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      <span className="font-extrabold">{label}</span>
    </div>
  );
}
