"use client";

import { useEffect, useRef, useState } from "react";
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

// What a sticker does to a task; dates count from today. Custom stickers carry their value: "due:2026-11-25", "est:75".
export function sticker(key: string, today: string): Partial<Task> | null {
  const [kind, v] = key.split(":");
  if (kind === "due" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return { due: v };
  if (kind === "est" && +v > 0) return { est: +v };
  return [...WHEN, ...LONG, ...PRI, ...REP].find(([k]) => k === key)?.[2](today) ?? null;
}
// A custom sticker keeps showing what was last picked for this long, so it can be used again (click or drag).
const HOLD = 15_000;

// The right-hand sidebar: sticky notes for when, how long, priority and repeat (drop a task card on one, or pick a
// task and click one), each with a Custom row for anything the stickers don't cover, so a card never has to open up.
export function Stickers({
  selected,
  active,
  onApply,
  task,
}: {
  selected: string | null;
  // A task is open or selected: on a phone the stickers then rise as a sheet to tap.
  active: boolean;
  onApply: (key: string, taskIds?: string[]) => void;
  task?: Task | null;
}) {
  const [estErr, setEstErr] = useState(false);
  // Custom: the value last picked (shown, clickable and draggable for HOLD), and the tasks a drop on "Custom…" is for.
  const [held, setHeld] = useState<{ due?: string; est?: number }>({});
  const timer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const hold = (k: "due" | "est", v: string | number) => {
    setHeld((h) => ({ ...h, [k]: v }));
    clearTimeout(timer.current[k]);
    timer.current[k] = setTimeout(() => setHeld((h) => ({ ...h, [k]: undefined })), HOLD);
  };
  const forIds = useRef<string[] | undefined>(undefined);
  const dateRef = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState(false);
  const openPicker = () => {
    try {
      dateRef.current?.showPicker();
    } catch {
      dateRef.current?.click();
    }
  };
  // "Custom…" dropped on a task (see TodoApp's applySticker): ask for the value, for that task.
  useEffect(() => {
    const on = (e: Event) => {
      const { key, ids } = (e as CustomEvent<{ key: string; ids: string[] }>).detail;
      forIds.current = ids;
      if (key === "custom-when") openPicker();
      else setTyping(true);
    };
    addEventListener("todone:custom", on);
    return () => removeEventListener("todone:custom", on);
  });
  const drop = useDrop("stickers", {
    accept: (p) => p.kind === "task",
    drop: (p, key) => {
      if (p.kind !== "task") return;
      // A task dropped on an empty Custom: ask for the value, then apply it to that task.
      if (key === "custom-when" || key === "custom-long") {
        forIds.current = p.ids;
        return key === "custom-when" ? openPicker() : setTyping(true);
      }
      onApply(key, p.ids);
    },
  });
  const use = (key: string) => {
    onApply(key, forIds.current);
    forIds.current = undefined;
  };
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
  // Custom stickers: any day (the date picker opens) and any length (typed on the sticker). Once picked, the value
  // stays on the sticker for a while, as a normal sticker: click it for the picked task, or drag it onto any task.
  const dayLabel = (d: string) => new Date(`${d}T12:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const when = (
    <span className={s.stick} data-kind="when" data-custom>
      {held.due ? (
        <button
          type="button"
          {...drop(`due:${held.due}`)}
          {...draggable({ kind: "sticker", key: `due:${held.due}` }, dayLabel(held.due))}
          onClick={() => selected && onApply(`due:${held.due}`)}
          title={selected ? `Apply to “${selected}”` : "Drag onto a task"}
        >
          {dayLabel(held.due)}
        </button>
      ) : (
        <button
          type="button"
          {...drop("custom-when")}
          {...draggable({ kind: "sticker", key: "custom-when" }, "Custom…")}
          onClick={openPicker}
          title="Pick any day, or drag onto a task"
        >
          Custom…
        </button>
      )}
      <input
        ref={dateRef}
        type="date"
        tabIndex={-1}
        aria-label="Custom day"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          hold("due", v);
          use(`due:${v}`);
        }}
      />
    </span>
  );
  const long = typing ? (
    <input
      className={s.stick}
      data-kind="long"
      data-custom
      autoFocus
      aria-label="Custom length"
      defaultValue={held.est ? fmtMinutes(held.est) : task?.est ? fmtMinutes(task.est) : ""}
      placeholder="45m"
      aria-invalid={estErr}
      title="Like 45m, 2h or 1h30m"
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          forIds.current = undefined;
          setTyping(false);
        }
      }}
      onBlur={(e) => {
        const v = e.target.value.trim();
        const m = v ? parseMinutes(v) : 0;
        setEstErr(m === null);
        if (m === null) return;
        if (m) {
          hold("est", m);
          use(`est:${m}`);
        } else forIds.current = undefined;
        setTyping(false);
      }}
    />
  ) : held.est ? (
    <button
      type="button"
      className={s.stick}
      data-kind="long"
      data-custom
      {...drop(`est:${held.est}`)}
      {...draggable({ kind: "sticker", key: `est:${held.est}` }, fmtMinutes(held.est))}
      onClick={() => selected && onApply(`est:${held.est}`)}
      title={selected ? `Apply to “${selected}”` : "Drag onto a task"}
    >
      {fmtMinutes(held.est)}
    </button>
  ) : (
    <button
      type="button"
      className={s.stick}
      data-kind="long"
      data-custom
      {...drop("custom-long")}
      {...draggable({ kind: "sticker", key: "custom-long" }, "Custom…")}
      title="Type any length, or drag onto a task"
      onClick={() => setTyping(true)}
    >
      Custom…
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
