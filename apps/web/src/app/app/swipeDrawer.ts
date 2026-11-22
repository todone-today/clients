import { useEffect, useRef } from "react";

const SWIPE = 60; // px sideways that counts as a swipe
const EDGE = 28; // a swipe that starts this close to the left edge is for the lists drawer

// Phones, sideways swipes:
// - from the left edge, rightwards: brings in the lists drawer; leftwards anywhere while it's open: puts it away;
// - anywhere else: the next or previous view (Lists, Calendar, Goals, Rewards). The page follows the finger, then
//   slides out as the next view slides in; a short or slow swipe springs back.
// Only mostly-sideways swipes: scrolling, a long-press drag, typing, a note's own swipe (its actions), dialogs and
// sideways-scrolling strips keep working.
export function useSwipeNav<P>({
  open,
  setOpen,
  views,
  view,
  go,
  main,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  views: readonly P[]; // the views, in their tab order
  view: P;
  go: (p: P) => void;
  main: React.RefObject<HTMLElement | null>;
}) {
  // Read inside the listeners, which are added once.
  const now = useRef({ open, setOpen, views, view, go });
  useEffect(() => {
    now.current = { open, setOpen, views, view, go };
  });
  useEffect(() => {
    const phone = matchMedia("(max-width: 760px)");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let from: { x: number; y: number; t: number; edge: boolean; dir?: "h" | "v" } | null = null;
    const slide = (x: number, animate: boolean) => {
      const m = main.current;
      if (!m) return;
      m.style.transition = animate ? "translate 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.22s" : "none";
      m.style.translate = x ? `${x}px 0` : "";
      m.style.opacity = x ? String(Math.max(0.4, 1 - Math.abs(x) / innerWidth)) : "";
    };
    const neighbour = (dx: number) => {
      const { views, view } = now.current;
      const i = views.indexOf(view);
      if (i < 0) return undefined;
      const j = dx < 0 ? i + 1 : i - 1;
      return j >= 0 && j < views.length ? views[j] : undefined;
    };
    const down = (e: TouchEvent) => {
      from = null;
      if (!phone.matches || e.touches.length !== 1) return;
      const t = e.target as Element;
      if (t.closest?.("input, textarea, select, [contenteditable], [role=dialog], dialog, [data-swipe=off]")) return;
      for (let n: Element | null = t; n && n !== document.body; n = n.parentElement)
        if (n.scrollWidth > n.clientWidth && /auto|scroll/.test(getComputedStyle(n).overflowX)) return;
      const x = e.touches[0].clientX;
      // A note has its own sideways swipe (its actions): the page leaves it be, unless it's the drawer's edge.
      if (x > EDGE && !now.current.open && t.closest?.("[data-card]")) return;
      from = { x, y: e.touches[0].clientY, t: performance.now(), edge: x <= EDGE };
    };
    const move = (e: TouchEvent) => {
      if (!from || document.body.dataset.drag || now.current.open || from.edge || still.matches) return;
      const dx = e.touches[0].clientX - from.x;
      const dy = e.touches[0].clientY - from.y;
      if (!from.dir && Math.hypot(dx, dy) > 10) from.dir = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
      if (from.dir !== "h") return;
      // Past the first or last view it gives a little, like a page with nothing behind it.
      slide(neighbour(dx) === undefined ? dx / 4 : dx, false);
    };
    const up = (e: TouchEvent) => {
      const f = from;
      from = null;
      if (!f || document.body.dataset.drag) return slide(0, true);
      const t = e.changedTouches[0];
      const dx = t.clientX - f.x;
      const dy = t.clientY - f.y;
      const ms = performance.now() - f.t;
      const sideways = Math.abs(dx) >= Math.abs(dy) * 1.5;
      const { open, setOpen, go } = now.current;
      if (open) {
        if (sideways && dx < -SWIPE && ms < 600) setOpen(false);
        return;
      }
      if (f.edge) {
        if (sideways && dx > SWIPE && ms < 600) setOpen(true);
        return;
      }
      // A view change: far enough, or a quick flick.
      const next = neighbour(dx);
      const far = Math.abs(dx) > innerWidth / 3 || (Math.abs(dx) > SWIPE && ms < 350);
      if (!sideways || !far || next === undefined) return slide(0, true);
      if (still.matches) return go(next);
      const w = dx < 0 ? -innerWidth : innerWidth;
      slide(w, true);
      setTimeout(() => {
        go(next);
        // The next view comes in from the other side.
        slide(-w * 0.5, false);
        requestAnimationFrame(() => requestAnimationFrame(() => slide(0, true)));
      }, 180);
    };
    addEventListener("touchstart", down, { passive: true });
    addEventListener("touchmove", move, { passive: true });
    addEventListener("touchend", up, { passive: true });
    addEventListener("touchcancel", up, { passive: true });
    return () => {
      removeEventListener("touchstart", down);
      removeEventListener("touchmove", move);
      removeEventListener("touchend", up);
      removeEventListener("touchcancel", up);
    };
  }, [main]);
}
