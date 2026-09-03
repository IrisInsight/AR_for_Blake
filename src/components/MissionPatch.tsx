import type { Patch } from "@/lib/types";

export const PATCH_ICONS: Record<string, (c: string) => React.ReactNode> = {
  rocket: (c) => (
    <g fill={c}>
      <path d="M50 22c-8 8-12 20-12 32l6 8h12l6-8c0-12-4-24-12-32z" />
      <circle cx="50" cy="44" r="4" fill="#0b1230" />
      <path d="M38 54l-8 10h10zM62 54l8 10H60z" />
    </g>
  ),
  star: (c) => <path fill={c} d="M50 22l8 17 19 3-14 13 4 19-17-9-17 9 4-19-14-13 19-3z" />,
  moon: (c) => <path fill={c} d="M58 24a24 24 0 1 0 14 40 20 20 0 0 1-14-40z" />,
  planet: (c) => (
    <g fill={c}>
      <circle cx="50" cy="50" r="17" />
      <path d="M22 46c8-6 46-6 56 0 4 3-8 12-28 12S18 49 22 46z" opacity=".8" />
    </g>
  ),
  bolt: (c) => <path fill={c} d="M54 22L34 54h14l-4 24 22-34H52z" />,
  comet: (c) => (
    <g fill={c}>
      <circle cx="60" cy="40" r="11" />
      <path d="M52 48L26 74l8-2 18-18zM48 40L22 56l10 0 14-10z" opacity=".7" />
    </g>
  ),
  dino: (c) => (
    <g fill={c}>
      <path d="M32 70c0-14 6-26 18-30l6-8 10 2-4 8c8 4 10 12 8 22l-6-2 2 8h-8l-2-8h-8v8h-8v-8c-4 0-6 4-8 8z" />
      <circle cx="58" cy="40" r="2" fill="#0b1230" />
    </g>
  ),
  cat: (c) => (
    <g fill={c}>
      <path d="M32 34l8 10h20l8-10v20c0 12-8 20-18 20s-18-8-18-20z" />
      <circle cx="44" cy="52" r="2.5" fill="#0b1230" />
      <circle cx="56" cy="52" r="2.5" fill="#0b1230" />
    </g>
  ),
  skull: (c) => (
    <g fill={c}>
      <path d="M50 24c-14 0-22 10-22 22 0 8 4 12 8 16v10h28V62c4-4 8-8 8-16 0-12-8-22-22-22z" />
      <circle cx="42" cy="48" r="5" fill="#0b1230" />
      <circle cx="58" cy="48" r="5" fill="#0b1230" />
    </g>
  ),
  crown: (c) => <path fill={c} d="M26 68V36l14 12 10-20 10 20 14-12v32z" />,
  station: (c) => (
    <g fill={c}>
      <rect x="42" y="40" width="16" height="20" rx="3" />
      <rect x="20" y="46" width="18" height="8" rx="2" />
      <rect x="62" y="46" width="18" height="8" rx="2" />
    </g>
  ),
};

function shapePath(shape: Patch["shape"]): string {
  switch (shape) {
    case "shield":
      return "M50 6L90 20v30c0 22-18 38-40 46C28 88 10 72 10 50V20z";
    case "hex":
      return "M50 6l38 22v44L50 94 12 72V28z";
    case "star":
      return "M50 4l13 27 30 4-22 21 5 30-26-14-26 14 5-30L7 35l30-4z";
    default:
      return "M50 6a44 44 0 1 1 0 88 44 44 0 1 1 0-88z";
  }
}

export default function MissionPatch({ patch, size = 64, className }: { patch: Patch; size?: number | string; className?: string }) {
  const icon = PATCH_ICONS[patch.icon] ?? PATCH_ICONS.rocket;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <path d={shapePath(patch.shape)} fill={patch.c2} stroke={patch.c1} strokeWidth="5" strokeLinejoin="round" />
      <path d={shapePath(patch.shape)} fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" transform="translate(50 50) scale(.84) translate(-50 -50)" />
      {icon(patch.c1)}
    </svg>
  );
}
