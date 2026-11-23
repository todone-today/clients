"use client";

import { createElement, useEffect, useRef } from "react";
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
  "#ffbe86", // peach
  "#00afb9", // aqua
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

// The icons to choose from, as a small card at (x, y) on screen (the sidebar opens it by the list you clicked).
// Closes on a pick, a click elsewhere, or Esc.
export function IconGrid({
  id,
  name,
  icon,
  at,
  onPick,
  onClose,
}: {
  id: string;
  name: string;
  icon?: string;
  at: { x: number; y: number };
  onPick: (icon: string) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const current = iconName(id, name, icon);
  useEffect(() => {
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // On the next tick, so the click that opened it doesn't close it.
    const t = setTimeout(() => addEventListener("pointerdown", away));
    addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return (
    <div
      ref={box}
      className={s.iconGrid}
      role="listbox"
      aria-label={`Icon for ${name}`}
      style={{ position: "fixed", top: at.y, left: at.x }}
    >
      {Object.entries(ICONS).map(([key, Icon]) => (
        <button
          key={key}
          role="option"
          aria-selected={current === key}
          aria-label={key}
          onClick={() => {
            onPick(key);
            onClose();
          }}
        >
          <Icon size={18} strokeWidth={2.5} aria-hidden />
        </button>
      ))}
    </div>
  );
}
