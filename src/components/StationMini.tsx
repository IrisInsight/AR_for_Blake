/** The shared space station, growing module by module. */
export default function StationMini({ level, className }: { level: number; className?: string }) {
  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label={`Space station level ${level}`}>
      {/* Level 0: platform */}
      <rect x="100" y="76" width="40" height="8" rx="3" fill="#3a4680" />
      {level >= 1 && <rect x="92" y="60" width="56" height="40" rx="12" fill="#c9d1de" stroke="#5b6478" strokeWidth="2" />}
      {level >= 1 && <circle cx="120" cy="80" r="7" fill="#7dd3fc" />}
      {level >= 2 && (
        <g>
          <rect x="18" y="66" width="66" height="28" rx="3" fill="#2d5bd7" stroke="#7dd3fc" strokeWidth="2" />
          <rect x="156" y="66" width="66" height="28" rx="3" fill="#2d5bd7" stroke="#7dd3fc" strokeWidth="2" />
          <rect x="84" y="78" width="8" height="4" fill="#5b6478" />
          <rect x="148" y="78" width="8" height="4" fill="#5b6478" />
        </g>
      )}
      {level >= 3 && <ellipse cx="120" cy="80" rx="60" ry="14" fill="none" stroke="#c9d1de" strokeWidth="4" opacity=".9" />}
      {level >= 4 && (
        <g>
          <path d="M100 60 Q120 26 140 60 Z" fill="#a3e635" opacity=".85" stroke="#3ecf6a" strokeWidth="2" />
          <circle cx="112" cy="50" r="3" fill="#e5484d" />
          <circle cx="126" cy="46" r="3" fill="#e5484d" />
        </g>
      )}
      {level >= 5 && (
        <g>
          <rect x="60" y="96" width="24" height="22" rx="6" fill="#c9d1de" stroke="#5b6478" strokeWidth="2" />
          <rect x="68" y="90" width="8" height="10" fill="#5b6478" />
          <circle cx="72" cy="88" r="4" fill="#7dd3fc" />
        </g>
      )}
      {level >= 6 && (
        <g stroke="#ffd23f" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M148 100 L176 118 L198 108" />
          <circle cx="198" cy="108" r="4" fill="#ffd23f" />
        </g>
      )}
      {level >= 7 && (
        <g>
          <circle cx="120" cy="120" r="14" fill="#9b5cf6" className="twinkle" style={{ animation: "twinkle 2s ease-in-out infinite" }} />
          <circle cx="120" cy="120" r="6" fill="#fff" />
        </g>
      )}
    </svg>
  );
}
