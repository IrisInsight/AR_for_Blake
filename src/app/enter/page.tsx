import EnterForm from "./EnterForm";

export const dynamic = "force-dynamic";

export default function Enter() {
  return (
    <main className="safe-x safe-top safe-bottom mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="text-6xl" aria-hidden>🚀</div>
      <h1 className="text-3xl font-black">Rocket Reader Challenge</h1>
      <p className="text-ink-2 font-bold">This device needs the family code. A grown-up has it in the grown-up corner, or open the link they sent you.</p>
      <EnterForm />
    </main>
  );
}
