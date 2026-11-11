"use client";

import { createElement, useEffect, useRef, useState } from "react";
import {
  Anchor,
  Bike,
  BookOpen,
  Briefcase,
  Camera,
  Cat,
  Coffee,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Leaf,
  type LucideIcon,
  Music,
  Palette,
  PawPrint,
  Plane,
  Rocket,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Wallet,
  Zap,
} from "lucide-react";
import s from "./app.module.css";

// The icons a list can wear, by the name stored with the list (inside its encrypted data).
export const ICONS: Record<string, LucideIcon> = {
  star: Star,
  heart: Heart,
  rocket: Rocket,
  coffee: Coffee,
  leaf: Leaf,
  flame: Flame,
  zap: Zap,
  music: Music,
  sun: Sun,
  camera: Camera,
  palette: Palette,
  anchor: Anchor,
  bike: Bike,
  cat: Cat,
  paw: PawPrint,
  sparkles: Sparkles,
  cart: ShoppingCart,
  briefcase: Briefcase,
  home: Home,
  dumbbell: Dumbbell,
  plane: Plane,
  book: BookOpen,
  school: GraduationCap,
  wallet: Wallet,
  gift: Gift,
};
const BY_NAME: [RegExp, string][] = [
  [/grocer|shop|buy/i, "cart"],
  [/work|job|office|client/i, "briefcase"],
  [/home|house|chore/i, "home"],
  [/gym|workout|fitness|run/i, "dumbbell"],
  [/trip|travel/i, "plane"],
  [/read|book|study/i, "book"],
  [/money|bill|budget|finance/i, "wallet"],
  [/gift|birthday/i, "gift"],
];
const ANY = [
  "star",
  "heart",
  "rocket",
  "coffee",
  "leaf",
  "flame",
  "zap",
  "music",
  "sun",
  "camera",
  "palette",
  "anchor",
  "bike",
  "cat",
  "sparkles",
];

// The list's chosen icon; until one is chosen, a fitting one for some names, else a random-looking one from its id.
export function iconName(id: string, name: string, icon?: string) {
  if (icon && ICONS[icon]) return icon;
  const named = BY_NAME.find(([re]) => re.test(name));
  if (named) return named[1];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ANY[Math.abs(h) % ANY.length];
}
// The note colours; a list's own colour comes from its id (picked once, the same everywhere, kept on rename).
export const NOTES = [
  "var(--butter)",
  "var(--pink)",
  "var(--cyan)",
  "var(--lime)",
  "var(--peri)",
  "var(--orange)",
  "#c9b3ff", // lavender
  "#8fe3b0", // mint
];
// A list's own colour, from its id: picked once when it's made, the same on every device and after a rename.
export const listColor = (id: string) => NOTES[noteColor(id)];
export const noteColor = (id: string) => {
  let h = 2166136261; // FNV-1a, then a final mix so short ids spread evenly over the colours
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) % NOTES.length;
};
export const ListIcon = ({
  id,
  name,
  icon,
  size = 16,
}: {
  id: string;
  name: string;
  icon?: string;
  size?: number;
}) =>
  createElement(ICONS[iconName(id, name, icon)], {
    size,
    strokeWidth: 2.5,
    "aria-hidden": true,
  });

// The icon in a list's header: click it to choose another.
export function IconPick({
  id,
  name,
  icon,
  onPick,
}: {
  id: string;
  name: string;
  icon?: string;
  onPick: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = iconName(id, name, icon);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) =>
      !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className={s.iconPick} ref={box}>
      <button
        className={s.iconNow}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Choose this list's icon"
        title="Choose an icon"
      >
        <ListIcon id={id} name={name} icon={icon} size={22} />
      </button>
      {open && (
        <div className={s.iconGrid} role="listbox" aria-label="List icons">
          {Object.entries(ICONS).map(([key, Icon]) => (
            <button
              key={key}
              role="option"
              aria-selected={current === key}
              aria-label={key}
              onClick={() => {
                onPick(key);
                setOpen(false);
              }}
            >
              <Icon size={18} strokeWidth={2.5} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
