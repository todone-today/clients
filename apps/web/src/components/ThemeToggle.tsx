"use client";

import { useSyncExternalStore } from "react";
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

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => null);

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
