import { luminance } from "./Rocket";

export default function KidTheme({ accent, children }: { accent: string; children: React.ReactNode }) {
  const ink = luminance(accent) > 0.55 ? "#0b1230" : "#ffffff";
  return (
    <div style={{ ["--accent" as string]: accent, ["--accent-ink" as string]: ink }} className="min-h-screen">
      {children}
    </div>
  );
}
