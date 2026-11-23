"use client";

import { useEffect } from "react";
import s from "./app.module.css";

// Phones: the dialogs that open as sheets from the bottom (s.goalDialog: Your week, sharing, goals, views…) close by
// dragging them down, from the grab bar or anywhere while the sheet is scrolled to its top. They follow the finger,
// go if pulled far (or flicked), and spring back otherwise. On a computer they're centred dialogs with a ×.
export function useSheetSwipe() {
  useEffect(() => {
    if (!matchMedia("(max-width: 760px)").matches) return;
    let sheet: HTMLDialogElement | null = null;
    let y0 = 0;
    let t0 = 0;
    let dy = 0;
    const down = (e: TouchEvent) => {
      const d = (e.target as Element | null)?.closest?.("dialog[open]") as HTMLDialogElement | null;
      if (!d || !d.classList.contains(s.goalDialog) || d.scrollTop > 0) return;
      if ((e.target as Element).closest("input, textarea, select, [contenteditable=true], [role=slider]")) return;
      sheet = d;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
      dy = 0;
    };
    const move = (e: TouchEvent) => {
      if (!sheet) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      if (dy > 0 && sheet.scrollTop <= 0) {
        sheet.style.transition = "none";
        sheet.style.translate = `0 ${dy}px`;
        e.preventDefault(); // the page mustn't scroll (or pull to refresh) behind it
      }
    };
    const up = () => {
      const d = sheet;
      sheet = null;
      if (!d) return;
      const fast = dy / Math.max(1, Date.now() - t0) > 0.6; // a flick
      d.style.transition = "translate 0.2s ease";
      if (dy > 120 || (fast && dy > 40)) {
        d.style.translate = "0 100%";
        setTimeout(() => {
          d.close();
          d.style.translate = "";
          d.style.transition = "";
        }, 180);
      } else d.style.translate = "";
    };
    addEventListener("touchstart", down, { passive: true });
    addEventListener("touchmove", move, { passive: false });
    addEventListener("touchend", up);
    addEventListener("touchcancel", up);
    return () => {
      removeEventListener("touchstart", down);
      removeEventListener("touchmove", move);
      removeEventListener("touchend", up);
      removeEventListener("touchcancel", up);
    };
  }, []);
}

// Phones: the on-screen keyboard covers the bottom of the page, and things fixed there (the add bar) end up behind
// it. Its height is measured from the visible viewport and given to CSS as --kb (with body[data-kb] while it's up),
// so the add bar can sit just above it.
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      const kb = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
      document.documentElement.style.setProperty("--kb", `${kb}px`);
      if (kb > 80) document.body.dataset.kb = "1";
      else delete document.body.dataset.kb;
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      delete document.body.dataset.kb;
    };
  }, []);
}
