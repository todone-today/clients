"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import s from "./ThemeToggle.module.css";

// The colours live in globals.css ([data-theme="…"]); these are their names.
export const THEMES = [
  { id: "night", name: "Night", dark: true },
  { id: "day", name: "Day", dark: false },
  { id: "forest", name: "Forest", dark: true },
  { id: "ocean", name: "Ocean", dark: true },
  { id: "plum", name: "Plum", dark: true },
  { id: "blush", name: "Blush", dark: false },
] as const;
type Theme = (typeof THEMES)[number]["id"];

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
const isDark = (t: Theme | null) => THEMES.find((x) => x.id === t)?.dark ?? true;

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

// The six themes as little pages in their own colours. Tapping one shows it on the whole app (and keeps it, unless
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

// Asks for colours: by itself on every visit until a theme is kept (not while `hold`, when something else is on
// screen), or when `open` (the header's button). Tapping previews, "Keep" saves, closing puts back what was there.
export function ThemeAsk({ open, onClose, hold }: { open: boolean; onClose: () => void; hold?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const was = useRef<Theme | null>(null);
  const unset = useSyncExternalStore(subscribe, () => !saved(), () => false);
  const [later, setLater] = useState(false); // closed without keeping one: asks again next visit, not now
  const theme = useTheme();
  useEffect(() => apply(saved()), []); // the status bar matches the saved theme from the start
  const show = open || (unset && !later && !hold);
  // Waits its turn: never on top of another dialog (the sign-in haiku, a tip).
  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => {
      if (ref.current?.open || document.querySelector("dialog[open]")) return;
      clearInterval(t);
      was.current = saved();
      ref.current?.showModal();
    }, 400);
    return () => clearInterval(t);
  }, [show]);
  if (!show) return null;
  return (
    <dialog
      ref={ref}
      className={s.ask}
      aria-label="Pick your colours"
      onClose={() => {
        if (saved() === was.current) apply(was.current); // closed without keeping: back to before
        setLater(true);
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
        Keep {THEMES.find((t) => t.id === theme)?.name ?? "these"}
      </button>
    </dialog>
  );
}

// `tile`: one square button styled by the given class. With `onOpen` it opens the colours (the app); otherwise it
// flips between Day and Night (the website).
export function ThemeToggle({ tile, onOpen }: { tile: string; onOpen?: () => void }) {
  const theme = useTheme();
  if (onOpen)
    return (
      <button className={tile} onClick={onOpen} aria-label="Change colours" data-tip="Colours" aria-haspopup="dialog">
        <Palette size={18} strokeWidth={2.5} aria-hidden />
      </button>
    );
  const next = isDark(theme) ? "day" : "night";
  return (
    <button className={tile} onClick={() => apply(next, true)} aria-label={`Switch to ${next}`} data-tip={`Switch to ${next}`}>
      {isDark(theme) ? <Moon size={18} strokeWidth={2.5} aria-hidden /> : <Sun size={18} strokeWidth={2.5} aria-hidden />}
    </button>
  );
}
