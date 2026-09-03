"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Rocket from "./Rocket";
import MissionPatch, { PATCH_ICONS } from "./MissionPatch";
import { BoltsChip, ErrorNote } from "./ui";
import { ACCENT_COLORS, AVATARS, CATALOG, CATEGORY_LABELS, EXHAUST_COLORS, HULL_PAINTS, PATCH_COLORS, ownsItem, unlockMet, unlockText, type Category, type Milestones, type ShopItem } from "@/lib/catalog";
import { ApiError, post } from "@/lib/client";
import { play } from "@/lib/sound";
import type { Kid, RocketConfig } from "@/lib/types";

type Tab = Category | "name" | "patch" | "you";
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "hull", label: "Paint", emoji: "🎨" },
  { id: "nose", label: "Nose", emoji: "🔺" },
  { id: "fins", label: "Fins", emoji: "🪽" },
  { id: "decal", label: "Decals", emoji: "⚡" },
  { id: "booster", label: "Boosters", emoji: "🧨" },
  { id: "engine", label: "Engine", emoji: "🔥" },
  { id: "exhaust", label: "Exhaust", emoji: "💨" },
  { id: "patch", label: "Patch", emoji: "🛡️" },
  { id: "name", label: "Name", emoji: "✏️" },
  { id: "you", label: "You", emoji: "🧑‍🚀" },
];

export default function Customizer({ kid, milestones, stage }: { kid: Kid; milestones: Milestones; stage: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hull");
  const [cfg, setCfg] = useState<RocketConfig>(kid.rocket);
  const [saved, setSaved] = useState<RocketConfig>(kid.rocket);
  const [owned, setOwned] = useState<string[]>(kid.owned);
  const [bolts, setBolts] = useState(kid.bolts);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<ShopItem | null>(null); // unowned item being tried on
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Auto-save owned changes shortly after they happen.
  useEffect(() => {
    if (preview) return;
    if (JSON.stringify(cfg) === JSON.stringify(saved)) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const res = await post<{ rocket: RocketConfig }>("/api/rocket", { kidId: kid.id, rocket: cfg });
        setSaved(res.rocket);
        setCfg(res.rocket);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Couldn't save.");
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [cfg, saved, preview, kid.id]);

  const items = useMemo(() => CATALOG.filter((i) => i.category === tab), [tab]);

  function applyItem(it: ShopItem, c: RocketConfig): RocketConfig {
    switch (it.category) {
      case "patch_shape":
        return { ...c, patch: { ...c.patch, shape: it.value as RocketConfig["patch"]["shape"] } };
      case "patch_icon":
        return { ...c, patch: { ...c.patch, icon: it.value } };
      default:
        return { ...c, [it.category]: it.value } as RocketConfig;
    }
  }
  function isSelected(it: ShopItem): boolean {
    if (it.category === "patch_shape") return cfg.patch.shape === it.value;
    if (it.category === "patch_icon") return cfg.patch.icon === it.value;
    return (cfg as unknown as Record<string, string>)[it.category] === it.value;
  }

  function tap(it: ShopItem) {
    setErr(null);
    const unlocked = unlockMet(it.unlock, milestones);
    const has = ownsItem(owned, it);
    play("tap");
    if (has) {
      setPreview(null);
      setCfg((c) => applyItem(it, c));
      return;
    }
    if (!unlocked) {
      setErr(`Locked: ${unlockText(it.unlock!)}.`);
      setPreview(it);
      setCfg((c) => applyItem(it, c));
      return;
    }
    // Try it on; the buy button appears.
    setPreview(it);
    setCfg((c) => applyItem(it, c));
  }

  async function buy() {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await post<{ bolts: number; owned: string[] }>("/api/shop/buy", { kidId: kid.id, itemId: preview.id });
      setBolts(res.bolts);
      setOwned(res.owned);
      setPreview(null);
      setFlash(true);
      play("attach");
      setTimeout(() => setFlash(false), 900);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't buy that.");
    } finally {
      setBusy(false);
    }
  }

  function cancelPreview() {
    setPreview(null);
    setCfg(saved);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      {/* Live preview */}
      <div className="panel relative flex min-w-0 flex-col items-center p-3 lg:sticky lg:top-3">
        <div className="flex w-full items-center justify-between">
          <div className="text-xl font-black">{cfg.name}</div>
          <BoltsChip n={bolts} />
        </div>
        <div className={`w-full max-w-[240px] lg:max-w-[340px] ${flash ? "anim-pop" : ""}`}>
          <Rocket config={cfg} stage={7} flame pad={false} ghost={false} idPrefix="cust" className="h-auto w-full" />
        </div>
        <div className="text-ink-2 text-xs font-bold">{stage < 7 ? `Your real rocket has ${stage} of 7 parts so far. Parts show up as you earn them.` : "Fully built and ready."}</div>
        {preview && (
          <div className="anim-rise mt-3 flex w-full items-center gap-2">
            {unlockMet(preview.unlock, milestones) ? (
              <button type="button" onClick={buy} disabled={busy || bolts < preview.price} className="btn btn-accent min-h-[56px] flex-1">
                {bolts < preview.price ? `Need ${preview.price - bolts} more bolts` : `Buy ${preview.label} for ${preview.price} 🔩`}
              </button>
            ) : (
              <div className="panel-soft flex-1 p-3 text-center text-sm font-bold">🔒 {unlockText(preview.unlock!)}</div>
            )}
            <button type="button" onClick={cancelPreview} className="btn tap">
              Undo
            </button>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`chip tap shrink-0 px-4 text-base ${tab === t.id ? "bg-accent text-[var(--accent-ink)]" : "bg-panel-2"}`}
            >
              <span aria-hidden>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
        {err && <ErrorNote message={err} />}

        {tab === "name" && (
          <div className="panel flex flex-col gap-2 p-4">
            <label className="font-extrabold" htmlFor="rocket-name">Paint a name on the hull</label>
            <input
              id="rocket-name"
              value={cfg.name}
              maxLength={14}
              onChange={(e) => setCfg((c) => ({ ...c, name: e.target.value }))}
              className="min-h-[52px] rounded-2xl bg-space px-4 text-lg font-extrabold"
            />
            <p className="text-ink-2 text-xs font-bold">Up to 14 letters. It saves by itself.</p>
          </div>
        )}

        {tab === "patch" && (
          <div className="flex flex-col gap-3">
            <div className="panel flex items-center gap-4 p-4">
              <MissionPatch patch={cfg.patch} size={96} />
              <div className="text-ink-2 text-sm font-bold">Your mission patch goes on the detail band. Pick a shape, an icon, and two colors.</div>
            </div>
            <ItemGrid items={CATALOG.filter((i) => i.category === "patch_shape")} title="Shape" owned={owned} milestones={milestones} isSelected={isSelected} onTap={tap} render={(it) => <MissionPatch patch={{ ...cfg.patch, shape: it.value as RocketConfig["patch"]["shape"] }} size={44} />} />
            <ItemGrid items={CATALOG.filter((i) => i.category === "patch_icon")} title="Icon" owned={owned} milestones={milestones} isSelected={isSelected} onTap={tap} render={(it) => <svg viewBox="0 0 100 100" width="44" height="44">{(PATCH_ICONS[it.value] ?? PATCH_ICONS.rocket)(cfg.patch.c1)}</svg>} />
            <div className="panel p-3">
              <div className="mb-2 font-extrabold">Icon color</div>
              <ColorRow value={cfg.patch.c1} onPick={(c) => setCfg((x) => ({ ...x, patch: { ...x.patch, c1: c } }))} />
              <div className="mb-2 mt-3 font-extrabold">Background color</div>
              <ColorRow value={cfg.patch.c2} onPick={(c) => setCfg((x) => ({ ...x, patch: { ...x.patch, c2: c } }))} />
            </div>
          </div>
        )}

        {tab === "you" && <YouTab kid={kid} onSaved={() => router.refresh()} />}

        {tab !== "name" && tab !== "patch" && tab !== "you" && (
          <ItemGrid
            items={items}
            title={CATEGORY_LABELS[tab as Category]}
            owned={owned}
            milestones={milestones}
            isSelected={isSelected}
            onTap={tap}
            render={(it) => <Swatch item={it} />}
          />
        )}
      </div>
    </div>
  );
}

function ItemGrid({ items, title, owned, milestones, isSelected, onTap, render }: { items: ShopItem[]; title: string; owned: string[]; milestones: Milestones; isSelected: (i: ShopItem) => boolean; onTap: (i: ShopItem) => void; render: (i: ShopItem) => React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-lg font-extrabold">{title}</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((it) => {
          const has = ownsItem(owned, it);
          const unlocked = unlockMet(it.unlock, milestones);
          const sel = isSelected(it);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onTap(it)}
              className={`panel-soft relative flex min-h-[96px] flex-col items-center justify-center gap-1 p-2 text-center active:scale-[0.97] ${sel ? "ring-3 ring-accent" : ""} ${!unlocked ? "opacity-70" : ""}`}
              aria-pressed={sel}
            >
              <div className="grid h-11 place-items-center">{render(it)}</div>
              <div className="text-xs font-extrabold leading-tight">{it.label}</div>
              <div className="text-[11px] font-bold">
                {has ? <span className="text-ink-2">{it.price === 0 ? "free" : "owned"}</span> : !unlocked ? <span>🔒</span> : <span className="text-bolt">{it.price} 🔩</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Swatch({ item }: { item: ShopItem }) {
  if (item.category === "hull") {
    const p = HULL_PAINTS.find((h) => h.id === item.value);
    if (!p) return null;
    return (
      <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/20" style={{ background: p.secondary ? `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)` : p.primary }} />
    );
  }
  if (item.category === "exhaust") {
    const c = EXHAUST_COLORS[item.value] ?? EXHAUST_COLORS.orange;
    return <div className="h-10 w-10 rounded-full border-2 border-white/20" style={{ background: `linear-gradient(180deg, ${c.join(", ")})` }} />;
  }
  const glyph: Record<string, string> = {
    "nose:cone": "🔺", "nose:rounded": "🟠", "nose:blunt": "⬛", "nose:needle": "📍",
    "fins:swept": "🪽", "fins:straight": "📐", "fins:delta": "🔻", "fins:none": "⭕",
    "decal:none": "✨", "decal:stripes": "🦓", "decal:stars": "⭐", "decal:lightning": "⚡", "decal:flames": "🔥", "decal:teeth": "🦈", "decal:shooting_star": "🌠",
    "booster:none": "1️⃣", "booster:twin": "2️⃣", "booster:quad": "4️⃣",
    "engine:standard": "🔩", "engine:wide": "🔔", "engine:triple": "🎺",
  };
  return <span className="text-3xl" aria-hidden>{glyph[item.id] ?? "🚀"}</span>;
}

function ColorRow({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PATCH_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          aria-pressed={value === c}
          onClick={() => onPick(c)}
          className={`tap h-11 w-11 rounded-full border-4 ${value === c ? "border-white" : "border-transparent"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function YouTab({ kid, onSaved }: { kid: Kid; onSaved: () => void }) {
  const [accent, setAccent] = useState(kid.accent);
  const [avatar, setAvatar] = useState(kid.avatar);
  async function save(patch: { accent?: string; avatar?: string }) {
    play("tap");
    await post("/api/kid", { kidId: kid.id, ...patch }).catch(() => {});
    onSaved();
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="panel p-4">
        <div className="mb-2 font-extrabold">Your color</div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={accent === c.id}
              onClick={() => {
                setAccent(c.id);
                void save({ accent: c.id });
              }}
              className={`tap h-12 w-12 rounded-2xl border-4 ${accent === c.id ? "border-white" : "border-transparent"}`}
              style={{ background: c.id }}
            />
          ))}
        </div>
      </div>
      <div className="panel p-4">
        <div className="mb-2 font-extrabold">Your avatar</div>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={a.label}
              aria-pressed={avatar === a.id}
              onClick={() => {
                setAvatar(a.id);
                void save({ avatar: a.id });
              }}
              className={`panel-soft tap grid h-16 place-items-center text-3xl ${avatar === a.id ? "ring-3 ring-accent" : ""}`}
            >
              <span aria-hidden>{a.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
