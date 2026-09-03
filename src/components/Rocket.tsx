import { EXHAUST_COLORS, HULL_PAINTS } from "@/lib/catalog";
import type { RocketConfig } from "@/lib/types";
import MissionPatch from "./MissionPatch";

/**
 * The rocket. Inline SVG scaled by viewBox. Seven build stages:
 * 1 engine bell, 2 fuel tank, 3 fins, 4 upper stage, 5 detail band, 6 window, 7 nose cone.
 * Parts not yet built show as a faint dashed ghost so an empty pad reads as an invitation.
 */
export interface RocketProps {
  config: RocketConfig;
  stage?: number; // 0..7
  animateStage?: number | null; // which stage's part snaps in
  flame?: boolean;
  pad?: boolean;
  ghost?: boolean;
  className?: string;
  idPrefix?: string;
}

const BODY_X = 72;
const BODY_W = 56;
const BODY_R = 10;

export default function Rocket({ config, stage = 7, animateStage = null, flame = false, pad = true, ghost = true, className, idPrefix = "r" }: RocketProps) {
  const paint = HULL_PAINTS.find((p) => p.id === config.hull) ?? HULL_PAINTS[0];
  const primary = paint.primary;
  const secondary = paint.secondary ?? shade(paint.primary, -0.22);
  const dark = shade(primary, -0.35);
  const light = shade(primary, 0.25);
  const isLight = luminance(primary) > 0.6;
  const trim = isLight ? "#1b2a4a" : "#f4f1ea";
  const ex = EXHAUST_COLORS[config.exhaust] ?? EXHAUST_COLORS.orange;
  const gid = (s: string) => `${idPrefix}-${s}`;

  const built = (n: number) => stage >= n;
  const cls = (n: number) => (animateStage === n ? "anim-snap" : undefined);
  const ghostStyle = { fill: "none", stroke: "#8ea0ff", strokeOpacity: 0.28, strokeWidth: 1.5, strokeDasharray: "4 4" } as const;

  // Nose cone paths (top of body at y=92)
  const nose = (() => {
    switch (config.nose) {
      case "rounded":
        return `M${BODY_X} 96 C ${BODY_X} 50, ${BODY_X + BODY_W} 50, ${BODY_X + BODY_W} 96 Z`;
      case "blunt":
        return `M${BODY_X} 96 L ${BODY_X + 8} 62 Q ${BODY_X + BODY_W / 2} 52 ${BODY_X + BODY_W - 8} 62 L ${BODY_X + BODY_W} 96 Z`;
      case "needle":
        return `M${BODY_X} 96 Q ${BODY_X + 6} 60 ${BODY_X + BODY_W / 2} 18 Q ${BODY_X + BODY_W - 6} 60 ${BODY_X + BODY_W} 96 Z`;
      default:
        return `M${BODY_X} 96 Q ${BODY_X + 4} 70 ${BODY_X + BODY_W / 2} 40 Q ${BODY_X + BODY_W - 4} 70 ${BODY_X + BODY_W} 96 Z`;
    }
  })();

  const finL = (() => {
    switch (config.fins) {
      case "straight":
        return "M72 200 L46 200 L46 240 L72 240 Z";
      case "delta":
        return "M72 176 L40 246 L72 246 Z";
      case "none":
        return "";
      default:
        return "M72 190 Q50 210 44 250 L72 238 Z";
    }
  })();
  const finR = finL ? mirror(finL) : "";

  const engine = (() => {
    const x = 100;
    switch (config.engine) {
      case "wide":
        return <path d={`M${x - 16} 232 L${x - 26} 262 L${x + 26} 262 L${x + 16} 232 Z`} fill={`url(#${gid("metal")})`} />;
      case "triple":
        return (
          <g fill={`url(#${gid("metal")})`}>
            <path d={`M${x - 10} 232 L${x - 16} 258 L${x + 16} 258 L${x + 10} 232 Z`} />
            <path d={`M${x - 26} 236 L${x - 32} 256 L${x - 14} 256 L${x - 16} 236 Z`} />
            <path d={`M${x + 26} 236 L${x + 32} 256 L${x + 14} 256 L${x + 16} 236 Z`} />
          </g>
        );
      default:
        return <path d={`M${x - 12} 232 L${x - 19} 262 L${x + 19} 262 L${x + 12} 232 Z`} fill={`url(#${gid("metal")})`} />;
    }
  })();

  const decal = (() => {
    const cx = 100;
    switch (config.decal) {
      case "stripes":
        return (
          <g fill={trim} opacity=".9">
            <rect x={BODY_X + 8} y={100} width="6" height="128" rx="3" />
            <rect x={BODY_X + BODY_W - 14} y={100} width="6" height="128" rx="3" />
          </g>
        );
      case "stars":
        return (
          <g fill={trim}>
            {[[84, 118], [116, 132], [90, 160], [112, 188], [86, 210]].map(([x, y], i) => (
              <path key={i} transform={`translate(${x} ${y}) scale(.5)`} d="M0-9l2.6 5.4 6 .9-4.3 4.2 1 6L0 4.7l-5.3 2.8 1-6-4.3-4.2 6-.9z" />
            ))}
          </g>
        );
      case "flames":
        return (
          <g>
            <path d="M74 228 Q80 200 84 214 Q88 190 94 208 Q98 186 104 210 Q110 190 114 214 Q120 198 126 228 Z" fill="#ff8a1f" />
            <path d="M80 228 Q84 210 88 220 Q92 200 98 216 Q104 200 110 220 Q114 210 120 228 Z" fill="#ffd23f" />
          </g>
        );
      case "lightning":
        return <path d="M104 100 L86 150 L98 150 L92 186 L114 132 L102 132 L110 100 Z" fill="#ffd23f" stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />;
      case "teeth":
        return (
          <g>
            <path d={`M${BODY_X} 100 ${Array.from({ length: 7 }, (_, i) => `L${BODY_X + i * 8 + 4} 116 L${BODY_X + (i + 1) * 8} 100`).join(" ")} Z`} fill="#f4f1ea" stroke="#1b2a4a" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx={cx - 12} cy={124} r="4" fill="#1b2a4a" />
            <circle cx={cx + 12} cy={124} r="4" fill="#1b2a4a" />
          </g>
        );
      case "shooting_star":
        return (
          <g>
            <path d="M80 224 L108 156" stroke="#ffd23f" strokeWidth="5" strokeLinecap="round" opacity=".8" />
            <path d="M88 226 L110 170" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
            <path transform="translate(112 150) scale(1.2)" d="M0-9l2.6 5.4 6 .9-4.3 4.2 1 6L0 4.7l-5.3 2.8 1-6-4.3-4.2 6-.9z" fill="#ffd23f" stroke={dark} strokeWidth="1" />
          </g>
        );
      default:
        return null;
    }
  })();

  const boosters = (() => {
    if (config.booster === "none") return null;
    const tube = (x: number, scale = 1, back = false) => (
      <g key={x} transform={`translate(${x} 0) scale(${scale})`} opacity={back ? 0.85 : 1}>
        <path d="M-10 150 Q-10 130 0 128 Q10 130 10 150 L10 236 L-10 236 Z" fill={back ? dark : secondary} stroke={dark} strokeWidth="1.5" />
        <path d="M-7 236 L-9 248 L9 248 L7 236 Z" fill={`url(#${gid("metal")})`} />
        <rect x="-10" y="176" width="20" height="6" fill={dark} opacity=".6" />
      </g>
    );
    if (config.booster === "twin") return <g>{tube(60)}{tube(140)}</g>;
    return (
      <g>
        {tube(52, 0.8, true)}
        {tube(148, 0.8, true)}
        {tube(62)}
        {tube(138)}
      </g>
    );
  })();

  const anyPart = stage > 0;

  return (
    <svg viewBox="0 0 200 320" className={className} role="img" aria-label={`${config.name} rocket`}>
      <defs>
        <linearGradient id={gid("hull")} x1="0" x2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset="0.35" stopColor={light} />
          <stop offset="0.6" stopColor={primary} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={gid("hull2")} x1="0" x2="1">
          <stop offset="0" stopColor={shade(secondary, -0.3)} />
          <stop offset="0.4" stopColor={shade(secondary, 0.2)} />
          <stop offset="1" stopColor={shade(secondary, -0.25)} />
        </linearGradient>
        <linearGradient id={gid("metal")} x1="0" x2="1">
          <stop offset="0" stopColor="#5b6478" />
          <stop offset="0.5" stopColor="#c9d1de" />
          <stop offset="1" stopColor="#4a5266" />
        </linearGradient>
        <linearGradient id={gid("flame")} x1="0" x2="0" y1="0" y2="1">
          {ex.map((c, i) => (
            <stop key={i} offset={i / Math.max(1, ex.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <clipPath id={gid("bodyclip")}>
          <rect x={BODY_X} y={96} width={BODY_W} height={136} rx={BODY_R} />
        </clipPath>
      </defs>

      {/* Exhaust */}
      {flame && anyPart && (
        <g className="anim-flame" style={{ transformOrigin: "100px 258px" }}>
          <path d="M78 256 Q100 330 122 256 Z" fill={`url(#${gid("flame")})`} opacity=".95" />
          <path d="M88 256 Q100 300 112 256 Z" fill="#fff" opacity=".7" />
        </g>
      )}

      {/* Launch pad */}
      {pad && (
        <g>
          <rect x="30" y="262" width="140" height="10" rx="5" fill="#2a3566" />
          <rect x="44" y="272" width="112" height="8" rx="4" fill="#1b2450" />
          <rect x="34" y="150" width="8" height="112" rx="3" fill="#2a3566" />
          <rect x="30" y="150" width="16" height="8" rx="3" fill="#3a4680" />
          <circle cx="38" cy="146" r="4" fill="#e5484d" className="twinkle" style={{ animation: "twinkle 1.6s ease-in-out infinite" }} />
        </g>
      )}

      {/* Ghost silhouette for missing parts */}
      {ghost && stage < 7 && (
        <g {...ghostStyle}>
          {!built(1) && <path d="M88 232 L81 262 L119 262 L112 232 Z" />}
          {!built(2) && <rect x={BODY_X} y={160} width={BODY_W} height={72} rx={BODY_R} />}
          {!built(3) && finL && <path d={finL} />}
          {!built(3) && finR && <path d={finR} />}
          {!built(4) && <rect x={BODY_X} y={96} width={BODY_W} height={66} rx={BODY_R} />}
          {!built(6) && <circle cx="100" cy="126" r="12" />}
          {!built(7) && <path d={nose} />}
        </g>
      )}

      {/* Boosters ride with the fuel tank */}
      {built(2) && boosters}

      {/* 1: engine bell */}
      {built(1) && (
        <g data-part="engine" className={cls(1)} style={{ transformOrigin: "100px 247px" }}>
          {engine}
          <rect x="84" y="226" width="32" height="8" rx="3" fill={dark} />
        </g>
      )}

      {/* 3: fins (drawn behind the tank) */}
      {built(3) && finL && (
        <g data-part="fins" className={cls(3)} style={{ transformOrigin: "100px 220px" }}>
          <path d={finL} fill={`url(#${gid("hull2")})`} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
          <path d={finR} fill={`url(#${gid("hull2")})`} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}

      {/* 2: fuel tank */}
      {built(2) && (
        <g data-part="tank" className={cls(2)} style={{ transformOrigin: "100px 196px" }}>
          <path d={`M${BODY_X} 160 H${BODY_X + BODY_W} V${232 - BODY_R} a${BODY_R} ${BODY_R} 0 0 1 -${BODY_R} ${BODY_R} H${BODY_X + BODY_R} a${BODY_R} ${BODY_R} 0 0 1 -${BODY_R} -${BODY_R} Z`} fill={`url(#${gid("hull")})`} stroke={dark} strokeWidth="1.5" />
        </g>
      )}

      {/* 4: upper stage */}
      {built(4) && (
        <g data-part="upper" className={cls(4)} style={{ transformOrigin: "100px 128px" }}>
          <path d={`M${BODY_X} ${96 + BODY_R} a${BODY_R} ${BODY_R} 0 0 1 ${BODY_R} -${BODY_R} H${BODY_X + BODY_W - BODY_R} a${BODY_R} ${BODY_R} 0 0 1 ${BODY_R} ${BODY_R} V162 H${BODY_X} Z`} fill={`url(#${gid("hull")})`} stroke={dark} strokeWidth="1.5" />
        </g>
      )}

      {/* Decals and name live on the hull once both halves exist */}
      {built(4) && (
        <g clipPath={`url(#${gid("bodyclip")})`}>
          {decal}
        </g>
      )}

      {/* 5: detail band */}
      {built(5) && (
        <g data-part="band" className={cls(5)} style={{ transformOrigin: "100px 160px" }}>
          <rect x={BODY_X} y={156} width={BODY_W} height="10" fill={`url(#${gid("hull2")})`} stroke={dark} strokeWidth="1" />
          {[80, 92, 104, 116].map((x) => (
            <circle key={x} cx={x} cy={161} r="1.6" fill={dark} />
          ))}
          <g transform="translate(89 176) scale(.22)">
            <MissionPatchInline patch={config.patch} />
          </g>
        </g>
      )}

      {/* Name painted on the hull's left edge, over the band, clear of the window and patch */}
      {built(4) && config.name && (
        <g clipPath={`url(#${gid("bodyclip")})`}>
          <text
            transform="translate(78 228) rotate(-90)"
            fontFamily="var(--font-sans), sans-serif"
            fontWeight="900"
            fontSize={config.name.length <= 12 ? 10 : 9}
            fill={trim}
            opacity=".95"
            letterSpacing=".4"
            {...(config.name.length > 14 ? { textLength: 120, lengthAdjust: "spacingAndGlyphs" as const } : {})}
          >
            {config.name.slice(0, 20)}
          </text>
        </g>
      )}

      {/* 6: window */}
      {built(6) && (
        <g data-part="window" className={cls(6)} style={{ transformOrigin: "100px 126px" }}>
          <circle cx="100" cy="126" r="14" fill={trim} />
          <circle cx="100" cy="126" r="10" fill="#7dd3fc" />
          <circle cx="100" cy="126" r="10" fill={`url(#${gid("hull")})`} opacity=".15" />
          <path d="M94 121 q3 -4 8 -2" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" />
        </g>
      )}

      {/* 7: nose cone */}
      {built(7) && (
        <g data-part="nose" className={cls(7)} style={{ transformOrigin: "100px 80px" }}>
          <path d={nose} fill={`url(#${gid("hull2")})`} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

function MissionPatchInline({ patch }: { patch: RocketConfig["patch"] }) {
  // Reuse the patch as nested SVG so it scales with the rocket.
  return (
    <foreignObject width="100" height="100" x="0" y="0" style={{ overflow: "visible" }}>
      <MissionPatch patch={patch} size={100} />
    </foreignObject>
  );
}

function mirror(path: string): string {
  return path.replace(/([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g, (_m, c, x, y) => `${c}${200 - Number(x)} ${y}`).replace(/Q\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/g, (_m, x1, y1, x2, y2) => `Q${200 - Number(x1)} ${y1} ${200 - Number(x2)} ${y2}`);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `#${[f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
