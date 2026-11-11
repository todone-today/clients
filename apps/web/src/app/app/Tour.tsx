"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Panel } from "./Workspaces";
import s from "./app.module.css";

// A guided tour for new people: a spotlight on one part of the app at a time, with a card saying what
// it does and what to try. The page stays usable underneath, so people can try each thing as it's shown.
// `video`: the welcome card plays the minute-long walkthrough (public/onboarding.mp4, made in apps/video).
type Step = { target?: string; panel: Panel; title: string; body: string; video?: true };

const STEPS: Step[] = [
  {
    panel: null,
    title: "Welcome to todone",
    body: "Here's todone in a minute, then a quick tour of each part. We made you a couple of lists to play with; change or delete anything.",
    video: true,
  },
  { target: "add", panel: null, title: "Add a task", body: "Type it and press Enter. Just the name; the rest comes later." },
  {
    target: "board",
    panel: null,
    title: "Tasks are sticky notes",
    body: "Pick one up and drop it where the gap opens to reorder. Hold it over another note's middle to make it a step. Click a name to edit it.",
  },
  {
    target: "stickers",
    panel: null,
    title: "Stickers set when, how long, how big",
    body: "Date, time, length, effort (XS to XL), priority and repeat. Drag a task onto a sticker or a sticker onto a task. Ctrl/⌘-click tasks to do several at once; Ctrl/⌘+A takes them all.",
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
    body: "Dump loose ideas here. When one is ready, drag it onto a list and it becomes a task. Not yet? Drag a task back here.",
  },
  {
    target: "calendar",
    panel: "calendar",
    title: "Plan it on the calendar",
    body: "Day, week, month or year. Drag tasks from “To plan” onto a time, and stretch a block to set how long.",
  },
  {
    target: "goals",
    panel: "goals",
    title: "Goals for each list",
    body: "A Gym list can aim for 68 kg, 5 visits a week or 120 g of protein a day. Log progress here, and drop a task on a goal to make it a milestone.",
  },
  {
    target: "rewards",
    panel: "rewards",
    title: "Earn XP, treat yourself",
    body: "Finishing tasks earns XP: more for bigger effort, high priority and being on time. Spend it on rewards you pick, like a cheat meal.",
  },
  {
    target: "ai",
    panel: null,
    title: "Import with AI",
    body: "Copy our prompt into any AI, describe your plans, paste the answer back: tasks with dates and times.",
  },
  {
    target: "bell",
    panel: null,
    title: "Reminders, even with todone closed",
    body: "Turn them on here: a nudge before a task's time, what's due each morning, and new comments on tasks you've shared.",
  },
  {
    target: "integrations",
    panel: null,
    title: "Your calendar and more",
    body: "See your tasks in Apple, Google or Outlook Calendar, and connect Notion, Obsidian or Discord.",
  },
  { target: "tour", panel: null, title: "That's it", body: "Click the i up here to see this again. Have fun." },
];

export function Tour({ onPanel, onEnd }: { onPanel: (p: Panel) => void; onEnd: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => onPanel(step.panel), [step.panel, onPanel]);
  useEffect(() => card.current?.focus(), [i]);
  // The walkthrough plays with its music when the browser allows it (the Tour button was a click); otherwise muted.
  useEffect(() => {
    const v = film.current;
    if (!v) return;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
  }, [i]);

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
        // The walkthrough fills the window (the card around it, edge to edge); other steps are a small card.
        data-full={step.video || undefined}
        style={step.video ? undefined : { ...pos, width: W }}
        role="dialog"
        aria-label={`Tour, step ${i + 1} of ${STEPS.length}: ${step.title}`}
        tabIndex={-1}
      >
        <p className={s.tourCount}>
          {i + 1} / {STEPS.length}
        </p>
        <h2 className="display">{step.title}</h2>
        {step.video && (
          <video
            ref={film}
            className={s.tourVideo}
            src="/onboarding.mp4"
            poster="/onboarding.jpg"
            controls
            playsInline
            preload="auto"
            aria-label="todone in a minute: a walkthrough of adding tasks, stickers, lists, the calendar, goals, rewards and sharing"
          />
        )}
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
            {last ? "Start" : step.video ? "Take the tour" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
