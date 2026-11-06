"use client";

import { useState } from "react";
import { addDays, shiftMonths } from "@todone/sdk/calendar";
import { draggable, useDrop } from "@/lib/drag";
import { type Task, fmtMinutes, parseMinutes } from "@todone/sdk/tasks";
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

// The right-hand sidebar: sticky notes for when, how long, priority and repeat (drop a task card on one, or pick a
// task and click one), each with a Custom row for anything the stickers don't cover. The picked task's own details
// (`panel`: name, list, steps) sit on top, so a card never has to open up.
export function Stickers({
  selected,
  active,
  onApply,
  task,
  edit,
  panel,
}: {
  selected: string | null;
  // A task is open or selected: on a phone the stickers then rise as a sheet to tap.
  active: boolean;
  onApply: (key: string, taskIds?: string[]) => void;
  task?: Task | null;
  edit?: (f: (t: Task) => Task | null) => void;
  panel?: React.ReactNode;
}) {
  const [estErr, setEstErr] = useState(false);
  const drop = useDrop("stickers", {
    accept: (p) => p.kind === "task",
    drop: (p, key) => p.kind === "task" && onApply(key, p.ids),
  });
  const group = (title: string, items: typeof WHEN, kind: string, custom?: React.ReactNode) => (
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
      {custom && task && edit && <div className={s.custom}>{custom}</div>}
    </div>
  );
  // Custom values for the picked task: any day and time, any length.
  const when = task && edit && (
    <>
      <label>
        <span>Custom day</span>
        <input
          key={`d${task.id}${task.due}`}
          type="date"
          defaultValue={task.due ?? ""}
          onChange={(e) =>
            edit((t) => ({ ...t, due: e.target.value || undefined, ...(e.target.value ? {} : { at: undefined }) }))
          }
        />
      </label>
      <label>
        <span>Time</span>
        <input
          key={`t${task.id}${task.at}`}
          type="time"
          step={900}
          disabled={!task.due}
          title={task.due ? undefined : "Give it a day first"}
          defaultValue={task.at ?? ""}
          onChange={(e) => edit((t) => ({ ...t, at: e.target.value || undefined }))}
        />
      </label>
    </>
  );
  const long = task && edit && (
    <label>
      <span>Custom</span>
      <input
        key={`e${task.id}${task.est}`}
        defaultValue={task.est ? fmtMinutes(task.est) : ""}
        placeholder="45m, 1h30m"
        aria-invalid={estErr}
        title={estErr ? "Reads like 30m, 2h or 1h30m" : undefined}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        onBlur={(e) => {
          const v = e.target.value.trim();
          const m = v ? parseMinutes(v) : 0;
          setEstErr(m === null);
          if (m !== null && m !== (task.est ?? 0)) edit((t) => ({ ...t, est: m || undefined }));
        }}
      />
    </label>
  );
  return (
    <aside className={s.stickers} aria-label="Stickers" data-tour="stickers" data-active={active}>
      {panel}
      <p>
        {selected ? <>Tap or click one to apply it to “{selected}”. </> : null}Drag a task onto a sticker, or a sticker onto a task.
      </p>
      {group("When", WHEN, "when", when)}
      {group("How long", LONG, "long", long)}
      {group("Priority", PRI, "pri")}
      {group("Repeat", REP, "rep")}
    </aside>
  );
}
