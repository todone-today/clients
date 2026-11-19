"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { refresh } from "@/lib/store";
import s from "./app.module.css";

const PULL = 80; // px down from the top that counts as "refresh"

// Installed on a phone (home screen), the browser's own pull-to-refresh is gone: pulling down from the very top
// fetches the lists again. Off in a browser tab (it has its own) and while a note is being dragged.
export function PullRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!matchMedia("(display-mode: standalone)").matches || !matchMedia("(pointer: coarse)").matches) return;
    const down = (e: TouchEvent) => {
      const el = e.target as Element;
      // Only from the top of the page, with one finger, and not on something draggable or inside a dialog.
      if (scrollY > 0 || e.touches.length !== 1 || el.closest?.("[draggable], [role=dialog], input, textarea")) return;
      start.current = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || scrollY > 0 || document.body.dataset.drag) {
        start.current = null;
        return setPull(0);
      }
      setPull(Math.min(dy * 0.5, PULL * 1.3)); // resists, like the native one
    };
    const up = async () => {
      if (start.current === null) return;
      start.current = null;
      setPull((p) => {
        if (p >= PULL) {
          setBusy(true);
          navigator.vibrate?.(10);
          refresh().finally(() => setTimeout(() => setBusy(false), 400));
        }
        return 0;
      });
    };
    addEventListener("touchstart", down, { passive: true });
    addEventListener("touchmove", move, { passive: true });
    addEventListener("touchend", up);
    addEventListener("touchcancel", up);
    return () => {
      removeEventListener("touchstart", down);
      removeEventListener("touchmove", move);
      removeEventListener("touchend", up);
      removeEventListener("touchcancel", up);
    };
  }, []);

  if (!pull && !busy) return null;
  return (
    <div
      className={s.pullRefresh}
      role="status"
      aria-label={busy ? "Refreshing" : "Pull to refresh"}
      style={{ "--pull": `${busy ? PULL * 0.7 : pull}px`, "--turn": `${(pull / PULL) * 270}deg` } as React.CSSProperties}
      data-busy={busy || undefined}
      data-ready={pull >= PULL || undefined}
    >
      <RefreshCw size={20} strokeWidth={2.5} aria-hidden />
    </div>
  );
}
