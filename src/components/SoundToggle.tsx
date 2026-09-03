"use client";
import { useEffect, useState } from "react";
import { isMuted, play, setMuted } from "@/lib/sound";

export default function SoundToggle({ big = false }: { big?: boolean }) {
  const [muted, setM] = useState(false);
  useEffect(() => {
    setM(isMuted());
    const fn = () => setM(isMuted());
    window.addEventListener("rr:mute", fn);
    return () => window.removeEventListener("rr:mute", fn);
  }, []);
  return (
    <button
      type="button"
      aria-pressed={muted}
      aria-label={muted ? "Sound is off. Turn sound on" : "Sound is on. Turn sound off"}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setM(next);
        if (!next) play("tap");
      }}
      className={`tap grid place-items-center rounded-2xl bg-panel-2 text-ink ${big ? "h-14 w-14 text-2xl" : "h-11 w-11 text-xl"}`}
    >
      <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
