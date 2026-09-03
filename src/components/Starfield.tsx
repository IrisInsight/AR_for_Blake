// Static starfield rendered once as SVG. Sparse twinkle keeps motion quiet outside celebrations.
function seeded(n: number) {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function Starfield() {
  const rnd = seeded(7);
  const stars = Array.from({ length: 110 }, (_, i) => ({
    x: rnd() * 100,
    y: rnd() * 100,
    r: 0.08 + rnd() * 0.3,
    o: 0.3 + rnd() * 0.7,
    t: i % 9 === 0,
    d: rnd() * 4,
  }));
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#25307a" />
          <stop offset="60%" stopColor="#0b1230" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#glow)" />
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          opacity={s.o}
          className={s.t ? "twinkle" : undefined}
          style={s.t ? { animation: `twinkle ${3 + s.d}s ease-in-out infinite` } : undefined}
        />
      ))}
    </svg>
  );
}
