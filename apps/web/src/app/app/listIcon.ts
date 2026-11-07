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
  Heart,
  Home,
  Leaf,
  type LucideIcon,
  Music,
  Palette,
  Plane,
  Rocket,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Wallet,
  Zap,
} from "lucide-react";

// Lists have no icon setting: a few names get a fitting one, the rest a random-looking one picked from the list's id,
// so it's the same on every device and needs nothing stored.
const BY_NAME: [RegExp, LucideIcon][] = [
  [/grocer|shop|buy/i, ShoppingCart],
  [/work|job|office|client/i, Briefcase],
  [/home|house|chore/i, Home],
  [/gym|workout|fitness|run/i, Dumbbell],
  [/trip|travel/i, Plane],
  [/read|book|study/i, BookOpen],
  [/money|bill|budget|finance/i, Wallet],
  [/gift|birthday/i, Gift],
];
const ANY = [
  Star,
  Heart,
  Rocket,
  Coffee,
  Leaf,
  Flame,
  Zap,
  Music,
  Sun,
  Camera,
  Palette,
  Anchor,
  Bike,
  Cat,
  Sparkles,
];

export function listIcon(id: string, name: string): LucideIcon {
  const named = BY_NAME.find(([re]) => re.test(name));
  if (named) return named[1];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ANY[Math.abs(h) % ANY.length];
}
