"use client";

import { useLayoutEffect, useRef } from "react";
import s from "./app.module.css";

// The add bar's one place on every page: pinned to the bottom of the screen, lined up with the page's own column
// (its spot in the page), however short or long the page is. The spot keeps the bar's height free at the end of
// the page, so the last task can always scroll out from under it.
export function Dock({ children, className }: { children: React.ReactNode; className?: string }) {
  const spot = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = spot.current;
      const b = bar.current;
      if (!a || !b) return;
      const r = a.getBoundingClientRect();
      b.style.left = `${r.left}px`;
      b.style.width = `${r.width}px`;
      a.style.height = `${b.offsetHeight}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    if (spot.current) ro.observe(spot.current);
    if (bar.current) ro.observe(bar.current);
    // The column can move without resizing (the sidebar folding, the sticker panel sliding): check on layout changes.
    const main = spot.current?.closest("main");
    if (main) ro.observe(main);
    addEventListener("resize", place);
    return () => {
      ro.disconnect();
      removeEventListener("resize", place);
    };
  }, []);
  return (
    <div ref={spot} className={s.dockSpot}>
      <div ref={bar} className={`${s.dock} ${className ?? ""}`}>
        {children}
      </div>
    </div>
  );
}
