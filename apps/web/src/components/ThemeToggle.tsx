"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import s from "./ThemeToggle.module.css";

type Theme = "day" | "night";

const subscribe = (f: () => void) => {
  addEventListener("themechange", f);
  return () => removeEventListener("themechange", f);
};
const current = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ??
  (matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night");

function pick(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("theme", t);
  } catch {}
  dispatchEvent(new Event("themechange"));
}

// `tile`: one square button (sun or moon) that flips the theme, styled by the given class; otherwise Day / Night.
export function ThemeToggle({ tile }: { tile?: string }) {
  const theme = useSyncExternalStore(subscribe, current, () => null);

  if (tile) {
    const next = theme === "night" ? "day" : "night";
    return (
      <button className={tile} onClick={() => pick(next)} aria-label={`Switch to ${next}`} title={`Switch to ${next}`}>
        {theme === "night" ? <Moon size={18} strokeWidth={2.5} aria-hidden /> : <Sun size={18} strokeWidth={2.5} aria-hidden />}
      </button>
    );
  }

  return (
    <div className={s.toggle} role="group" aria-label="Theme">
      {(["day", "night"] as const).map((t) => (
        <button key={t} className={s.opt} aria-pressed={theme === t} onClick={() => pick(t)}>
          {t === "day" ? "Day" : "Night"}
        </button>
      ))}
    </div>
  );
}
