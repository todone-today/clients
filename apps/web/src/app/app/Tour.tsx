"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Panel } from "./Workspaces";
import s from "./app.module.css";

// A guided tour for new people: a spotlight on one part of the app at a time, with a card saying what
// it does and what to try. The page stays usable underneath, so people can try each thing as it's shown.
type Step = { target?: string; panel: Panel; title: string; body: string };

const STEPS: Step[] = [
  {
    panel: null,
    title: "Welcome to todone",
    body: "Here's a quick tour. We made you a couple of lists to play with; change or delete anything.",
  },
  { target: "add", panel: null, title: "Add a task", body: "Type it and press Enter. Just the name; the rest comes later." },
  {
    target: "board",
    panel: null,
    title: "Tasks are sticky notes",
    body: "Drag a note onto another to make it a step. Drop it on a note's left or right edge to reorder. Click a name to edit it.",
  },
  {
    target: "stickers",
    panel: null,
    title: "Stickers set when, how long, priority, repeat",
    body: "Drag a task onto “Tomorrow” or “1 hr”, or a sticker onto a task. Ctrl/⌘-click tasks to do several at once.",
  },
  {
    target: "filters",
    panel: null,
    title: "Filter and sort",
    body: "See what's open, done, due today or late, and sort by date, length or priority.",
  },
  {
    target: "bin",
    panel: null,
    title: "The bin",
    body: "Drop tasks here to delete them (you can undo). Drop the “Today” sticker here to clear the day.",
  },
  {
    target: "lists",
    panel: null,
    title: "Your lists",
    body: "Drag a task onto another list to move it. Drag lists up and down to reorder them.",
  },
  {
    target: "ideas",
    panel: "ideas",
    title: "Brainstorm",
    body: "Dump loose ideas here. When one is ready, drag it onto a list and it becomes a task.",
  },
  {
    target: "calendar",
    panel: "calendar",
    title: "Plan it on the calendar",
    body: "Day, week, month or year. Drag tasks from “To plan” onto a time, and stretch a block to set how long.",
  },
  {
    target: "ai",
    panel: null,
    title: "Import with AI",
    body: "Copy our prompt into any AI, describe your plans, paste the answer back: tasks with dates and times.",
  },
  {
    target: "integrations",
    panel: null,
    title: "Notifications and more",
    body: "Turn on reminders on this device, and connect Google Calendar, Notion, Obsidian or Discord.",
  },
  { target: "tour", panel: null, title: "That's it", body: "Take the tour again any time with this button. Have fun." },
];

export function Tour({ onPanel, onEnd }: { onPanel: (p: Panel) => void; onEnd: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => onPanel(step.panel), [step.panel, onPanel]);
  useEffect(() => card.current?.focus(), [i]);

  // Follow the target as the page lays out, scrolls or resizes.
  useLayoutEffect(() => {
    let raf = 0;
    const track = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      const r = el?.getBoundingClientRect() ?? null;
      setRect((old) =>
        old && r && old.x === r.x && old.y === r.y && old.width === r.width && old.height === r.height ? old : r,
      );
      raf = requestAnimationFrame(track);
    };
    const el = step.target && document.querySelector(`[data-tour="${step.target}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    track();
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onEnd]);

  // The card sits beside the target where there's room, else in the middle of the screen.
  const pad = 8;
  const W = 340;
  let pos: React.CSSProperties = { left: "50%", top: "50%", translate: "-50% -50%" };
  if (rect) {
    const below = innerHeight - rect.bottom > 220;
    const right = innerWidth - rect.right > W + 24;
    const left = rect.left > W + 24;
    pos = right
      ? { left: rect.right + 16, top: Math.min(Math.max(rect.top, 16), innerHeight - 260) }
      : left
        ? { left: rect.left - W - 16, top: Math.min(Math.max(rect.top, 16), innerHeight - 260) }
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
        role="dialog"
        aria-label={`Tour, step ${i + 1} of ${STEPS.length}: ${step.title}`}
        tabIndex={-1}
      >
        <p className={s.tourCount}>
          {i + 1} / {STEPS.length}
        </p>
        <h2 className="display">{step.title}</h2>
        <p>{step.body}</p>
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
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() => (last ? onEnd() : setI(i + 1))}
          >
            {last ? "Start" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
