"use client";

import { useEffect } from "react";

// Chapters fade up as they come into view (Apple-style), once. Without JS or with reduced motion they're just there.
export function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void els.forEach((e) => (e.dataset.in = ""));
    document.documentElement.dataset.reveals = "";
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.in = "";
          io.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -15% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}
