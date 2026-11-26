"use client";

import { useEffect, useRef, type RefObject } from "react";

// A demo that shows itself: once it's well on screen it plays `script` one time, and stops for good the moment the
// visitor touches it (their turn). Nothing plays for people who asked for less motion.
export function useAutoplay(ref: RefObject<HTMLElement | null>, script: (alive: () => boolean) => Promise<void>) {
  const run = useRef(script);
  useEffect(() => {
    run.current = script;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const stop = () => {
      alive = false;
    };
    el.addEventListener("pointerdown", stop, true);
    el.addEventListener("keydown", stop, true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        // A demo that lost its page mid-way (scrolled off, swapped out) just stops.
        run.current(() => alive).catch(() => {});
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      stop();
      io.disconnect();
      el.removeEventListener("pointerdown", stop, true);
      el.removeEventListener("keydown", stop, true);
    };
  }, [ref]);
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Carries `el` over to `to` the way a finger would: lift, travel, set down. The caller moves the data, then calls the
// returned `done` to drop the motion (the element is then wherever the new state put it).
export async function carry(el: HTMLElement | null, to: Element | null, ms = 900) {
  if (!el || !to) return () => {}; // not on the page (any more): nothing to carry
  const a = el.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const z = el.style.zIndex;
  el.style.zIndex = "30";
  el.style.position ||= "relative";
  const anim = el.animate(
    [
      { transform: "none" },
      { transform: "translate(0, -6px) rotate(-4deg) scale(1.06)", offset: 0.18 },
      { transform: `translate(${dx}px, ${dy}px) rotate(2deg) scale(1.04)` },
    ],
    { duration: ms, easing: "cubic-bezier(.5, 0, .2, 1)", fill: "forwards" },
  );
  await anim.finished.catch(() => {});
  return () => {
    anim.cancel();
    el.style.zIndex = z;
  };
}
