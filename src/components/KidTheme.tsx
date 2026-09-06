function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function KidTheme({ accent, children }: { accent: string; children: React.ReactNode }) {
  const ink = luminance(accent) > 0.55 ? "#0b1230" : "#ffffff";
  return (
    <div style={{ ["--accent" as string]: accent, ["--accent-ink" as string]: ink }} className="min-h-screen">
      {children}
    </div>
  );
}
