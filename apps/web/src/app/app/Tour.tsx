"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import s from "./app.module.css";

// The short tour after "About you": four cards, each spotlighting one part of the board, the page still usable
// underneath so people can try each thing as it's shown. The i in the top bar plays it again. Brainstorm, Calendar,
// Goals and Rewards explain themselves the first time they're opened (Tip), so they aren't here.
type Step = { target: string; title: string; body: string; phone?: string; phoneTarget?: string };
const STEPS: Step[] = [
  {
    target: "ask",
    title: "Just tell todone",
    body: "Type or say what's on your mind, in any language. Ask todone turns it into tasks and shows you before adding anything.",
  },
  {
    target: "board",
    title: "Tasks are sticky notes",
    body: "Tick the box when it's done. Drag a note to reorder it, or hold it over another note to make it a step.",
  },
  {
    target: "stickers",
    title: "Stickers set the details",
    body: "Drag a task onto a sticker (or a sticker onto a task) for when, how long, effort, priority and repeat.",
  },
  {
    target: "lists",
    title: "Your lists",
    body: "Each list is its own board. Brainstorm, at the top, holds loose ideas: drag one onto a list when it's ready.",
    phone: "Each list is its own board: tap ☰ at the top to see them all, and Brainstorm for loose ideas.",
    phoneTarget: "menu",
  },
];

export function Tour({ onEnd }: { onEnd: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const phone = typeof matchMedia !== "undefined" && matchMedia("(max-width: 760px)").matches;
  const step = STEPS[i];
  const target = (phone && step.phoneTarget) || step.target;
  const last = i === STEPS.length - 1;

  useEffect(() => card.current?.focus(), [i]);
  // The sticker panel tucks itself away; it stays out while its card shows (CSS: body[data-tour-step]).
  useEffect(() => {
    document.body.dataset.tourStep = step.target;
    return () => void delete document.body.dataset.tourStep;
  }, [step.target]);

  // Follow the target as the page lays out, scrolls or resizes. Hidden (e.g. the lists on a phone): no spotlight.
  useLayoutEffect(() => {
    let raf = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      return el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" ? el : null;
    };
    const track = () => {
      const r = find()?.getBoundingClientRect() ?? null;
      setRect((old) => (old && r && old.x === r.x && old.y === r.y && old.width === r.width && old.height === r.height ? old : r));
      raf = requestAnimationFrame(track);
    };
    const t = setTimeout(() => find()?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
    track();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [target]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onEnd]);

  // The card sits beside the target where there's room, else in the middle (phones: along the bottom, in CSS).
  const pad = 8;
  const W = 340;
  let pos: React.CSSProperties = { left: "50%", top: "50%", translate: "-50% -50%" };
  if (rect) {
    const below = innerHeight - rect.bottom > 220;
    const right = innerWidth - rect.right > W + 24;
    const left = rect.left > W + 24;
    const top = Math.min(Math.max(rect.top, 16), innerHeight - 260);
    pos = right
      ? { left: rect.right + 16, top }
      : left
        ? { left: rect.left - W - 16, top }
        : below
          ? { left: Math.min(Math.max(rect.left, 16), innerWidth - W - 16), top: rect.bottom + 16 }
          : { left: Math.min(Math.max(rect.left, 16), innerWidth - W - 16), top: Math.max(rect.top - 236, 16) };
  }

  return (
    <div className={s.tour}>
      {rect ? (
        <div
          className={s.tourSpot}
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }}
        />
      ) : (
        <div className={s.tourShade} />
      )}
      <div
        ref={card}
        className={s.tourCard}
        style={{ ...pos, width: W }}
        data-step={step.target}
        role="dialog"
        aria-label={`Tour, step ${i + 1} of ${STEPS.length}: ${step.title}`}
        tabIndex={-1}
      >
        <p className={s.tourCount}>
          {i + 1} / {STEPS.length}
        </p>
        <h2 className="display">{step.title}</h2>
        <p>{phone && step.phone ? step.phone : step.body}</p>
        <div className={s.tourNav}>
          {!last && (
            <button className={s.link} onClick={onEnd}>
              Skip tour
            </button>
          )}
          {i > 0 && (
            <button className={s.ghost} onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={() => (last ? onEnd() : setI(i + 1))}>
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
