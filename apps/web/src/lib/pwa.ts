"use client";

// Phones only: is todone installed on the home screen, and if not, how to install it here. `detect` is pure (tested
// in pwa.test.ts); `usePwaInstall` adds the live parts: the install prompt Chrome-style browsers offer, the
// "installed" signal, and a 7-day "not now".
import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "other";
export type Where = {
  platform: Platform;
  inApp: boolean; // inside Instagram, WhatsApp, Facebook…: they can't install or notify; open it in the browser
  iosOtherBrowser: boolean; // Chrome or Firefox on iPhone: installing (and so notifications) needs Safari
};

// From the browser's own description of itself. iPadOS says it's a Mac, so a "Mac" with a touch screen is an iPad.
export function detect(ua: string, touchPoints = 0): Where {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  const android = /Android/.test(ua);
  return {
    platform: ios ? "ios" : android ? "android" : "other",
    inApp: /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Snapchat|LinkedInApp|Twitter|musical_ly|BytedanceWebview|; wv\)/.test(ua),
    iosOtherBrowser: ios && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua),
  };
}

const SNOOZE = "todone:install-snoozed"; // when "Not now" was tapped
const WEEK = 7 * 86_400_000;
const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};
export const snoozed = () => Date.now() - Number(get(SNOOZE) ?? 0) < WEEK;
export const snooze = () => set(SNOOZE, String(Date.now()));

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function usePwaInstall() {
  const [state, setState] = useState<{
    where: Where;
    phone: boolean;
    standalone: boolean;
    preview: Platform | null; // ?pwa=ios or ?pwa=android: show that phone's version on any screen, for testing
  } | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("pwa");
    if (q === "ios" || q === "android") sessionStorage.setItem("todone:pwa-preview", q);
    const preview = (sessionStorage.getItem("todone:pwa-preview") as Platform | null) ?? null;
    const where = preview
      ? { platform: preview, inApp: false, iosOtherBrowser: false }
      : detect(navigator.userAgent, navigator.maxTouchPoints);
    const standalone =
      matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    Promise.resolve().then(() => setState({ where, phone: !!preview || where.platform !== "other", standalone, preview }));
    const offer = (e: Event) => {
      e.preventDefault(); // our own sheet shows it, when they tap Install
      setPrompt(e as Prompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    addEventListener("beforeinstallprompt", offer);
    addEventListener("appinstalled", done);
    return () => {
      removeEventListener("beforeinstallprompt", offer);
      removeEventListener("appinstalled", done);
    };
  }, []);
  // The browser's own install question (Chrome-style browsers only); false if there isn't one to ask.
  const install = async () => {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice.catch(() => ({ outcome: "dismissed" }));
    setPrompt(null);
    if (outcome === "accepted") setInstalled(true);
    return true;
  };
  return { ...state, ready: !!state, canPrompt: !!prompt, install, installed: installed || !!state?.standalone };
}
