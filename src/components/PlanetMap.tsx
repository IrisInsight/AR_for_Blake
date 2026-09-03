"use client";
import { useState } from "react";
import { post } from "@/lib/client";
import { fmtPts } from "@/lib/ar";
import type { Planet } from "@/lib/types";

interface BookRef {
  planetId: string;
  title: string;
  emoji: string;
  points: number;
}

export default function PlanetMap({ planets, books, accent, kidName }: { planets: Planet[]; books: BookRef[]; accent: string; kidName: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  // Lay planets along a gentle winding path.
  const W = 400;
  const H = Math.max(360, 150 + planets.length * 120);
  const pos = planets.map((_, i) => ({ x: 80 + ((i % 2 === 0 ? 0.15 : 0.75) + Math.sin(i * 1.7) * 0.08) * (W - 160), y: 90 + i * 120 }));

  if (!planets.length) {
    return (
      <div className="panel mt-2 p-6 text-center">
        <div className="text-5xl" aria-hidden>🌌</div>
        <h2 className="mt-2 text-2xl font-black">No planets yet</h2>
        <p className="text-ink-2 mt-1 font-bold">Fill the rocket and launch it. Your first planet is waiting.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-ink-2 px-1 pb-2 font-bold">{planets.length} planet{planets.length === 1 ? "" : "s"} discovered by {kidName}. Tap one.</p>
      <div className="panel-soft overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="list">
          <path d={pos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ")} fill="none" stroke="#8ea0ff" strokeOpacity=".3" strokeWidth="3" strokeDasharray="6 8" />
          {planets.map((p, i) => {
            const { x, y } = pos[i];
            const name = names[p.id] ?? p.name;
            const active = open === p.id;
            return (
              <g key={p.id} role="listitem" transform={`translate(${x} ${y})`} onClick={() => setOpen(active ? null : p.id)} style={{ cursor: "pointer" }}>
                <circle r="44" fill="transparent" />
                {p.style === 1 && <ellipse rx="52" ry="12" fill="none" stroke="#c9d1de" strokeWidth="5" transform="rotate(-18)" opacity=".9" />}
                <circle r="34" fill={p.color} stroke={active ? "#fff" : "none"} strokeWidth="4" />
                <circle r="34" fill="url(#shade)" opacity=".5" />
                {p.style === 2 && (
                  <g fill="#000" opacity=".2">
                    <circle cx="-12" cy="-8" r="7" />
                    <circle cx="10" cy="6" r="5" />
                    <circle cx="-4" cy="16" r="4" />
                  </g>
                )}
                {p.style === 3 && (
                  <g fill="#fff" opacity=".25">
                    <rect x="-34" y="-12" width="68" height="6" />
                    <rect x="-34" y="4" width="68" height="8" />
                  </g>
                )}
                <text y="58" textAnchor="middle" fill="#f3f5ff" fontSize="16" fontWeight="900">
                  {name}
                </text>
                <text y="76" textAnchor="middle" fill="#aab3d6" fontSize="12" fontWeight="700">
                  {fmtPts(p.points)} pts · {new Date(p.launched_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
              </g>
            );
          })}
          <defs>
            <radialGradient id="shade" cx="35%" cy="30%" r="80%">
              <stop offset="0" stopColor="#fff" stopOpacity=".5" />
              <stop offset="1" stopColor="#000" stopOpacity=".6" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {open && (() => {
        const p = planets.find((x) => x.id === open) as Planet;
        const list = books.filter((b) => b.planetId === p.id);
        const name = names[p.id] ?? p.name;
        return (
          <div className="panel anim-rise mt-3 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-full" style={{ background: p.color }} />
              <div className="min-w-0 flex-1">
                {editing === p.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const v = String(fd.get("name") ?? "").trim();
                      if (!v) return;
                      const res = await post<{ name: string }>("/api/planets/rename", { planetId: p.id, name: v });
                      setNames((n) => ({ ...n, [p.id]: res.name }));
                      setEditing(null);
                    }}
                  >
                    <input name="name" defaultValue={name} maxLength={24} className="min-w-0 flex-1 rounded-xl bg-space px-3 py-2 font-bold" autoFocus />
                    <button className="btn btn-accent tap px-4 text-base">Save</button>
                  </form>
                ) : (
                  <button type="button" className="tap text-left text-2xl font-black" onClick={() => setEditing(p.id)}>
                    {name} <span className="text-ink-2 text-sm font-bold">rename</span>
                  </button>
                )}
                <div className="text-ink-2 text-sm font-bold">Planet #{p.seq} · {fmtPts(p.points)} points of fuel</div>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {list.map((b, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-space px-3 py-2 font-bold">
                  <span aria-hidden>{b.emoji}</span>
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                  <span className="text-ink-2 text-sm">{fmtPts(b.points)}</span>
                </li>
              ))}
              {!list.length && <li className="text-ink-2 font-bold">Fueled by carried-over points.</li>}
            </ul>
          </div>
        );
      })()}
      <div className="h-4" style={{ color: accent }} />
    </div>
  );
}
