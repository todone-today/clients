import { useEffect } from "react";

const SWIPE = 60; // px sideways that counts as a swipe

// Phones: swipe left to right to bring in the lists drawer, right to left to put it away. A quick, mostly
// sideways swipe only, so scrolling, a long-press drag, typing and sideways-scrolling strips keep working.
export function useSwipeDrawer(open: boolean, setOpen: (o: boolean) => void) {
  useEffect(() => {
    const phone = matchMedia("(max-width: 760px)");
    let from: { x: number; y: number; t: number } | null = null;
    const down = (e: TouchEvent) => {
      from = null;
      if (!phone.matches || e.touches.length !== 1) return;
      const el = e.target as Element;
      if (el.closest?.("input, textarea, select, [contenteditable], [role=dialog], [data-swipe=off]")) return;
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement)
        if (n.scrollWidth > n.clientWidth && /auto|scroll/.test(getComputedStyle(n).overflowX)) return;
      from = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
    };
    const up = (e: TouchEvent) => {
      if (!from || document.body.dataset.drag) return (from = null);
      const t = e.changedTouches[0];
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      const quick = performance.now() - from.t < 600;
      from = null;
      if (!quick || Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0 && !open) setOpen(true);
      else if (dx < 0 && open) setOpen(false);
    };
    addEventListener("touchstart", down, { passive: true });
    addEventListener("touchend", up, { passive: true });
    return () => {
      removeEventListener("touchstart", down);
      removeEventListener("touchend", up);
    };
  }, [open, setOpen]);
}
