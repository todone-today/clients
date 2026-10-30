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
const LONG: [string, string, (today: string) => Partial<Task>][] = [
  ...[15, 30, 60, 120, 240].map((m): [string, string, () => Partial<Task>] => [
    `est${m}`,
    m < 60 ? `${m} min` : `${m / 60} hr`,
    () => ({ est: m }),
  ]),
];

// What a sticker does to a task; dates count from today.
export const sticker = (key: string, today: string): Partial<Task> | null =>
  [...WHEN, ...LONG].find(([k]) => k === key)?.[2](today) ?? null;

// Sticky notes for when and how long: drop a task card on one, or open a task and click one.
export function Stickers({
  selected,
  onApply,
}: {
  selected: string | null;
  onApply: (key: string, taskId?: string, listId?: string) => void;
}) {
  const drop = useDrop("stickers", {
    accept: (p) => p.kind === "task",
    drop: (p, key) => p.kind === "task" && onApply(key, p.id, p.listId),
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
    <aside className={s.stickers} aria-label="Stickers">
      <p>
        {selected ? <>Click one to apply it to “{selected}”. </> : null}Drag a task onto a sticker, or a sticker onto a task.
      </p>
      {group("When", WHEN, "when")}
      {group("How long", LONG, "long")}
    </aside>
  );
}
