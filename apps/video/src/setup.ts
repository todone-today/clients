// What the web app's layout gives every page, for the video: its stylesheet (design tokens, .sticker, .btn,
// .display, both themes), its three fonts on the same CSS variables, and no network (components that would call the
// server get a quiet "unavailable" instead, so nothing depends on a live API, auth, encryption or a service worker).
import "@/app/globals.css";
import { loadFont as display } from "@remotion/google-fonts/BigShoulders";
import { loadFont as sans } from "@remotion/google-fonts/SchibstedGrotesk";
import { loadFont as mono } from "@remotion/google-fonts/JetBrainsMono";

const fonts = {
  "--font-display": display("normal", { weights: ["800", "900"], subsets: ["latin"] }).fontFamily,
  "--font-sans": sans("normal", { subsets: ["latin"] }).fontFamily,
  "--font-mono": mono("normal", { subsets: ["latin"] }).fontFamily,
};
for (const [k, v] of Object.entries(fonts)) document.documentElement.style.setProperty(k, `"${v}"`);

// The demo's own sample lists (/api/demo) never arrive: the video seeds its own with startDemo (AppScenes.tsx).
window.fetch = (url) =>
  String(url).includes("/api/demo")
    ? new Promise<Response>(() => {})
    : Promise.resolve(new Response(JSON.stringify({ error: "offline in the video" }), { status: 503 }));

// The app's two themes are set on <html data-theme>; ThemeToggle listens for "themechange".
export function setTheme(t: "day" | "night") {
  if (document.documentElement.dataset.theme === t) return;
  document.documentElement.dataset.theme = t;
  dispatchEvent(new Event("themechange"));
}

// Repeatable "random": ids the app makes (a new list, goal or reward) and confetti come out the same each time a
// scene is replayed, so a frame looks the same however it's reached. reseed() starts the sequence over.
let state = 1;
export const reseed = (n = 1) => void (state = n);
Math.random = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
crypto.randomUUID = () => {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}` as `${string}-${string}-${string}-${string}-${string}`;
};

// The app's dialogs open as modals, which the browser draws above everything on the page, the video's cursor and
// captions included. In the video they open in place instead (live.tsx centres them over the app and dims the rest).
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.show();
};
