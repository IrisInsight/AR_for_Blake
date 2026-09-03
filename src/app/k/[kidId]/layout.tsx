import { notFound } from "next/navigation";
import KidTheme from "@/components/KidTheme";
import { getKid } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function KidLayout({ children, params }: { children: React.ReactNode; params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const kid = await getKid(kidId);
  if (!kid) notFound();
  return <KidTheme accent={kid.accent}>{children}</KidTheme>;
}
