"use client";

import { addDays, shiftMonths } from "@/lib/calendar";
import { draggable, useDrop } from "@/lib/drag";
import type { Task } from "@/lib/tasks";
import s from "./app.module.css";

const WHEN: [string, string, (today: string) => Partial<Task>][] = [
  ["today", "Today", (d) => ({ due: d })],
  ["tomorrow", "Tomorrow", (d) => ({ due: addDays(d, 1) })],
  ["week", "Next week", (d) => ({ due: addDays(d, 7) })],
  ["month", "Next month", (d) => ({ due: shiftMonths(d, 1) })],
  ["year", "Next year", (d) => ({ due: shiftMonths(d, 12) })],
];
const PRI: [string, string, (today: string) => Partial<Task>][] = [
  ["p1", "High", () => ({ pri: 1 })],
  ["p2", "Medium", () => ({ pri: 2 })],
  ["p3", "Low", () => ({ pri: 3 })],
];
const REP: [string, string, (today: string) => Partial<Task>][] = [
  ["r-day", "Daily", () => ({ rep: "every day" })],
  ["r-weekday", "Weekdays", () => ({ rep: "every weekday" })],
  ["r-weekend", "Weekends", () => ({ rep: "every weekend" })],
  ["r-week", "Weekly", () => ({ rep: "every week" })],
  ["r-month", "Monthly", () => ({ rep: "every month" })],
  ["r-year", "Yearly", () => ({ rep: "every year" })],
];
const LONG: [string, string, (today: string) => Partial<Task>][] = [
  ...[15, 30, 60, 120, 240].map((m): [string, string, () => Partial<Task>] => [
    `est${m}`,
    m < 60 ? `${m} min` : `${m / 60} hr`,
    () => ({ est: m }),
  ]),
];

// What a sticker does to a task; dates count from today.
export const sticker = (key: string, today: string): Partial<Task> | null =>
  [...WHEN, ...LONG, ...PRI, ...REP].find(([k]) => k === key)?.[2](today) ?? null;

// Sticky notes for when and how long: drop a task card on one, or open a task and click one.
export function Stickers({
  selected,
  active,
  onApply,
}: {
  selected: string | null;
  // A task is open or selected: on a phone the stickers then rise as a sheet to tap.
  active: boolean;
  onApply: (key: string, taskIds?: string[]) => void;
}) {
  const drop = useDrop("stickers", {
    accept: (p) => p.kind === "task",
    drop: (p, key) => p.kind === "task" && onApply(key, p.ids),
  });
  const group = (title: string, items: typeof WHEN, kind: string) => (
    <div className={s.stickGroup}>
      <h3>{title}</h3>
      <div>
        {items.map(([key, name]) => (
          <button
            key={key}
            className={s.stick}
            data-kind={kind}
            {...drop(key)}
            {...draggable({ kind: "sticker", key }, name)}
            onClick={() => selected && onApply(key)}
            aria-disabled={!selected}
            title={selected ? `Apply to “${selected}”` : "Drop a task here"}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <aside className={s.stickers} aria-label="Stickers" data-tour="stickers" data-active={active}>
      <p>
        {selected ? <>Tap or click one to apply it to “{selected}”. </> : null}Drag a task onto a sticker, or a sticker onto a task.
      </p>
      {group("When", WHEN, "when")}
      {group("How long", LONG, "long")}
      {group("Priority", PRI, "pri")}
      {group("Repeat", REP, "rep")}
    </aside>
  );
}
