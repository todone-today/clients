"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// How people move through the landing page (and its sign-up form, which opens over it), to make it convert better:
// PostHog heatmaps, scroll depth, clicks and session recordings, plus a `section_seen` event with the seconds each
// part of the page was on screen. Only here, never inside the app (lists are end-to-end encrypted and stay
// unrecorded). No cookies: everything lives in memory for this visit. Every typed field is masked in recordings.
// Off unless NEXT_PUBLIC_POSTHOG_KEY is set (the project's public key; it only allows sending events).
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// A step towards an account, for the funnel (no-op unless PostHog is running here).
export function track(event: "signed_up" | "social_start", props: Record<string, string>) {
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
  // Signed up: the recovery key comes next, so the recording ends here (it's also blocked on the key itself).
  if (event === "signed_up") posthog.stopSessionRecording();
}

// The landing page's parts, in order: the hero, then each <section> by its id or heading.
function partName(el: Element, i: number) {
  if (i === 0) return "hero";
  return el.id || el.getAttribute("aria-labelledby")?.replace(/-h$/, "") || el.className.toString().match(/close/i)?.[0] || `part-${i}`;
}

export function Journey() {
  useEffect(() => {
    if (!KEY) return;
    // The launch tag: in this address, or kept from earlier in the visit (by Visits).
    let ref = new URLSearchParams(location.search).get("ref");
    try {
      ref ||= sessionStorage.getItem("todone:ref");
    } catch {}
    // Back on the landing page after the app (the same tab): pick up again where it stopped.
    if (posthog.__loaded) {
      posthog.opt_in_capturing();
      posthog.startSessionRecording();
    } else posthog.init(KEY, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      persistence: "memory",
      person_profiles: "never",
      capture_pageview: "history_change",
      capture_pageleave: true,
      enable_heatmaps: true,
      session_recording: { maskAllInputs: true },
    });
    posthog.register({ ref: ref ?? "none" });

    // Seconds each part spends as the main thing on screen (at least half visible, or filling half the window).
    const parts = [...document.querySelectorAll("main > *")].filter((el) => el.tagName === "SECTION" || el === document.querySelector("main > *"));
    const since = new Map<Element, number>();
    const flush = (el: Element) => {
      const t = since.get(el);
      if (t === undefined) return;
      since.delete(el);
      const seconds = Math.round((performance.now() - t) / 100) / 10;
      if (seconds >= 0.5) posthog.capture("section_seen", { section: partName(el, parts.indexOf(el)), seconds, order: parts.indexOf(el) });
    };
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const main = e.intersectionRatio >= 0.5 || e.intersectionRect.height >= innerHeight * 0.5;
          if (main && !since.has(e.target)) since.set(e.target, performance.now());
          else if (!main) flush(e.target);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    parts.forEach((el) => io.observe(el));
    // Which sign-up button people press, and in which part of the page.
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href*='new=1'], a[href='/app']");
      if (!a) return;
      const part = parts.find((p) => p.contains(a));
      posthog.capture("signup_cta", { text: a.textContent?.trim() ?? "", section: part ? partName(part, parts.indexOf(part)) : "nav" });
    };
    addEventListener("click", click, true);
    const leave = () => [...since.keys()].forEach(flush);
    addEventListener("pagehide", leave);
    return () => {
      leave();
      io.disconnect();
      removeEventListener("pagehide", leave);
      removeEventListener("click", click, true);
      // Leaving for the app: nothing there is recorded or counted.
      posthog.stopSessionRecording();
      posthog.opt_out_capturing();
    };
  }, []);
  return null;
}
