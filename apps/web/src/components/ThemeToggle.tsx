"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Check, Moon, Sun } from "lucide-react";
import s from "./ThemeToggle.module.css";

// The colours live in globals.css ([data-theme="…"]); these are their names.
export const THEMES = [
  { id: "light", name: "Minimal Light", dark: false },
  { id: "midnight", name: "Midnight Dark", dark: true },
  { id: "pastel", name: "Pastel", dark: false },
  { id: "forest", name: "Forest", dark: false },
  { id: "swiss", name: "Swiss", dark: false },
  { id: "navy", name: "Midnight Blue", dark: true },
] as const;
type Theme = (typeof THEMES)[number]["id"] | "day" | "night"; // Day and Night: the website's switch

const subscribe = (f: () => void) => {
  addEventListener("themechange", f);
  return () => removeEventListener("themechange", f);
};
const current = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ??
  (matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night");
const saved = () => {
  try {
    return localStorage.getItem("theme") as Theme | null;
  } catch {
    return null;
  }
};
const isDark = (t: Theme | null) => (t === "day" ? false : (THEMES.find((x) => x.id === t)?.dark ?? true));

// Shows a theme (none: follow the device); `keep` also remembers it. The phone's status bar takes the new ground too.
function apply(t: Theme | null, keep = false) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  if (keep && t)
    try {
      localStorage.setItem("theme", t);
    } catch {}
  const ground = getComputedStyle(document.documentElement).getPropertyValue("--ground").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", ground));
  dispatchEvent(new Event("themechange"));
}

const useTheme = () => useSyncExternalStore(subscribe, current, () => null);

// The themes as little pages in their own colours. Tapping one shows it on the whole app (and keeps it, unless
// `onPick` decides).
export function ThemePicker({ onPick }: { onPick?: (t: Theme) => void }) {
  const theme = useTheme();
  return (
    <div className={s.grid} role="radiogroup" aria-label="Colours">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          className={s.swatch}
          data-theme={t.id}
          onClick={() => (onPick ? onPick(t.id) : apply(t.id, true))}
        >
          <span className={s.paper} aria-hidden>
            <i />
            <i />
            {theme === t.id && <Check className={s.tick} size={16} strokeWidth={3.5} />}
          </span>
          {t.name}
        </button>
      ))}
    </div>
  );
}

// Whether a theme is kept on this device (the app asks after signing in until one is).
export const themeKept = () => !!saved();
// The phone's status bar in the kept theme's colour, from the start (the app calls it once).
export const syncTheme = () => apply(saved());

// Asks for colours (the app mounts it after signing in). Tapping previews, "Keep" saves, closing puts back what was
// there. Account has the same choices.
export function ThemeAsk({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const was = useRef<Theme | null>(null);
  const theme = useTheme();
  // Waits its turn: never on top of another dialog (a tip, the plans).
  useEffect(() => {
    const t = setInterval(() => {
      if (ref.current?.open || document.querySelector("dialog[open]")) return;
      clearInterval(t);
      was.current = saved();
      ref.current?.showModal();
    }, 400);
    return () => clearInterval(t);
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.ask}
      aria-label="Pick your colours"
      onClose={() => {
        if (saved() === was.current) apply(was.current); // closed without keeping: back to before
        onClose();
      }}
      onMouseDown={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <h2>Pick your colours</h2>
      <p>Tap one to try it. You can change it any time in Account.</p>
      <ThemePicker onPick={(t) => apply(t)} />
      <button
        className="btn"
        style={{ "--fill": "var(--lime)" } as React.CSSProperties}
        onClick={() => {
          apply(theme, true);
          ref.current?.close();
        }}
      >
        Keep {THEMES.find((t) => t.id === theme)?.name ?? "how it looks"}
      </button>
    </dialog>
  );
}

// The website's one square button (styled by `tile`): flips between Day and Night.
export function ThemeToggle({ tile }: { tile: string }) {
  const theme = useTheme();
  const next = isDark(theme) ? "day" : "night";
  return (
    <button className={tile} onClick={() => apply(next, true)} aria-label={`Switch to ${next}`} data-tip={`Switch to ${next}`}>
      {isDark(theme) ? <Moon size={18} strokeWidth={2.5} aria-hidden /> : <Sun size={18} strokeWidth={2.5} aria-hidden />}
    </button>
  );
}
