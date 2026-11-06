"use client";

import { useRef, useState } from "react";
import { addDays, shiftMonths } from "@todone/sdk/calendar";
import { draggable, useDrop } from "@/lib/drag";
import { type Task, fmtMinutes, parseMinutes, todayISO } from "@todone/sdk/tasks";
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
// task and click one), each with a Custom row for anything the stickers don't cover, so a card never has to open up.
export function Stickers({
  selected,
  active,
  onApply,
  task,
  edit,
}: {
  selected: string | null;
  // A task is open or selected: on a phone the stickers then rise as a sheet to tap.
  active: boolean;
  onApply: (key: string, taskIds?: string[]) => void;
  task?: Task | null;
  edit?: (f: (t: Task) => Task | null) => void;
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
        {custom}
      </div>
    </div>
  );
  // Custom stickers for the picked task: any day (the date picker opens), any length (typed right on the sticker).
  const dateRef = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState(false);
  const off = !task || !edit;
  const when = (
    <span className={s.stick} data-kind="when" data-custom aria-disabled={off}>
      <button
        type="button"
        onClick={() => !off && (dateRef.current?.showPicker?.() ?? dateRef.current?.click())}
        title={off ? "Pick a task first" : "Pick any day"}
      >
        {task?.due && !WHEN.some(([, , f]) => f(todayISO()).due === task.due) ? new Date(`${task.due}T12:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "Custom…"}
      </button>
      <input
        ref={dateRef}
        type="date"
        tabIndex={-1}
        aria-label="Custom day"
        value={task?.due ?? ""}
        onChange={(e) =>
          edit?.((t) => ({ ...t, due: e.target.value || undefined, ...(e.target.value ? {} : { at: undefined }) }))
        }
      />
    </span>
  );
  const long = typing && task && edit ? (
    <input
      className={s.stick}
      data-kind="long"
      data-custom
      autoFocus
      aria-label="Custom length"
      defaultValue={task.est ? fmtMinutes(task.est) : ""}
      placeholder="45m"
      aria-invalid={estErr}
      title="Like 45m, 2h or 1h30m"
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setTyping(false);
      }}
      onBlur={(e) => {
        const v = e.target.value.trim();
        const m = v ? parseMinutes(v) : 0;
        setEstErr(m === null);
        if (m === null) return;
        if (m !== (task.est ?? 0)) edit((t) => ({ ...t, est: m || undefined }));
        setTyping(false);
      }}
    />
  ) : (
    <button
      type="button"
      className={s.stick}
      data-kind="long"
      data-custom
      aria-disabled={off}
      title={off ? "Pick a task first" : "Type any length"}
      onClick={() => !off && setTyping(true)}
    >
      {task?.est && ![15, 30, 60, 120, 240].includes(task.est) ? fmtMinutes(task.est) : "Custom…"}
    </button>
  );
  return (
    <aside className={s.stickers} aria-label="Stickers" data-tour="stickers" data-active={active}>
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
