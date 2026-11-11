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

window.fetch = async () => new Response(JSON.stringify({ error: "offline in the video" }), { status: 503 });

// The app's two themes are set on <html data-theme>; ThemeToggle listens for "themechange".
export function setTheme(t: "day" | "night") {
  if (document.documentElement.dataset.theme === t) return;
  document.documentElement.dataset.theme = t;
  dispatchEvent(new Event("themechange"));
}
