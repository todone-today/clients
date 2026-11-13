"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Share2, Trash2 } from "lucide-react";
import { Select } from "@/components/Select";
import {
  addDays,
  addMonths,
  label,
  lanes,
  monthCells,
  toClock,
  toMinutes,
  weekStart,
} from "@todone/sdk/calendar";
import { type At, draggable, useDrop } from "@/lib/drag";
import { mapTask, toBin, unbin } from "@/lib/store";
import { binSound } from "@/lib/sound";
import { authClient } from "@/lib/auth-client";
import {
  type List,
  type Task,
  fmtMinutes,
  tick,
  todayISO,
  waiting,
} from "@todone/sdk/tasks";
import { Diamond, needsPlan, usePlan } from "./PlanPrompt";
import { listColor } from "./listIcon";
import { useFolded } from "./folded";
import { TaskPanel } from "./TaskPanel";
import s from "./app.module.css";

type View = "day" | "week" | "month" | "year";
type Item = { list: List; task: Task };
type Drop = (arg: string) => object;
const VIEWS: View[] = ["day", "week", "month", "year"];
const HOUR = 48; // px per hour in the day and week grids
const SNAP = 15; // minutes a dropped task snaps to

// Every dated task on a Google-Calendar-style grid. With `update` it is also the planner:
// tick tasks off, and drag them between days, onto times, or back to the "To plan" tray.
export function CalendarView({
  lists,
  update,
  onOpen,
  share,
  start,
  locked = false,
}: {
  lists: List[];
  update?: (id: string, f: (l: List) => List | null) => void;
  onOpen?: (listId: string) => void;
  // Returns the workspace's secret calendar token (or an error message) for a share link.
  share?: (
    view: View,
    at: string,
  ) => Promise<{ token: string } | { error: string }>;
  // Where a shared link opens: its view and date.
  start?: { view?: string; at?: string };
  // A shared view: only that period, no way to move to another one.
  locked?: boolean;
}) {
  const { gated } = usePlan();
  const today = todayISO();
  const [view, setView] = useState<View>(() =>
    VIEWS.includes(start?.view as View)
      ? (start!.view as View)
      : "month", // on a phone the month reads as an agenda of the days that have tasks
  );
  const [at, setAt] = useState(() =>
    /^\d{4}-\d{2}-\d{2}$/.test(start?.at ?? "") ? start!.at! : today,
  );
  const [shared, setShared] = useState("");

  // Which lists the calendar shows: all of them, or one.
  const [only, setOnly] = useState("all");
  const shown = only === "all" ? lists : lists.filter((l) => l.id === only);
  const all: Item[] = shown.flatMap((list) =>
    list.tasks.flatMap((t) => [t, ...t.sub]).map((task) => ({ list, task })),
  );
  const byDay = new Map<string, Item[]>();
  for (const it of all)
    if (it.task.due)
      byDay.set(it.task.due, [...(byDay.get(it.task.due) ?? []), it]);
  for (const items of byDay.values())
    items.sort((a, b) => (a.task.at ?? "").localeCompare(b.task.at ?? ""));

  const move = (it: Item, patch: Partial<Task>) =>
    update?.(it.list.id, (l) => ({
      ...l,
      tasks: mapTask(l.tasks, it.task.id, (t) => ({ ...t, ...patch })),
    }));
  // The bin, as on a list: a task dropped on it goes (steps with it) to the workspace's Bin for 7 days, with undo.
  const [binned, setBinned] = useState<{ before: { listId: string; tasks: Task[] }[]; ids: string[]; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (!binned) return;
    const t = setTimeout(() => setBinned(null), 10_000);
    return () => clearTimeout(t);
  }, [binned]);
  const binIt = (its: Item[]) => {
    const lists = [...new Set(its.map((it) => it.list))];
    for (const list of lists) {
      const mine = its.filter((it) => it.list === list).map((it) => it.task);
      // A step whose parent goes too travels inside it.
      const top = mine.filter((t) => !mine.some((p) => p.sub.includes(t)));
      update?.(list.id, (l) => ({ ...l, tasks: top.reduce((ts, t) => mapTask(ts, t.id, () => null), l.tasks) }));
      toBin(top, list);
    }
    binSound();
    setPicked(new Set());
    setBinned({
      before: lists.map((l) => ({ listId: l.id, tasks: l.tasks })),
      ids: its.map((it) => it.task.id),
      text: its.length > 1 ? `Deleted ${its.length} tasks.` : `Deleted “${its[0].task.title}”.`,
    });
  };
  // Picked tasks (Cmd/Ctrl-click, or drag a box across empty space) move and go to the bin together.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [box, setBox] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);
  const keyOf = (it: Item) => `${it.list.id}:${it.task.id}`;
  const pick = (it: Item) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(keyOf(it))) n.add(keyOf(it));
      return n;
    });
  // What a drag carries: the picked tasks when the dragged one is among them, otherwise just it.
  const withPicked = (it: Item) => (picked.has(keyOf(it)) ? all.filter((x) => picked.has(keyOf(x))) : [it]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") setPicked(new Set());
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  // Grabbing a picked task carries all the picked ones (the lifted card shows how many).
  const drag = (it: Item) => {
    if (!update) return undefined;
    const its = picked.has(`${it.list.id}:${it.task.id}`) ? all.filter((x) => picked.has(`${x.list.id}:${x.task.id}`)) : [it];
    return draggable(
      { kind: "task", listId: it.list.id, id: it.task.id, ids: its.map((x) => x.task.id) },
      its.length > 1 ? `${its.length} tasks` : it.task.title,
    );
  };
  // Drop spots: "day:<date>" keeps the time, "all:<date>" clears it, "col:<date>" sets it from where it lands,
  // "tray" unschedules. Read-only calendars (the shared page) take no drops.
  // While a task is dragged over the hour grid, a ghost block shows where it lands and for how long.
  const [ghost, setGhost] = useState<{
    day: string;
    start: number;
    est: number;
  } | null>(null);
  const minuteAt = (at: At) => {
    const y = at.y - at.el.getBoundingClientRect().top;
    return Math.max(
      0,
      Math.min(24 * 60 - SNAP, Math.round(((y / HOUR) * 60) / SNAP) * SNAP),
    );
  };
  const dropAt = useDrop("cal", {
    accept: (p) => !!update && p.kind === "task",
    where: (p, arg, at) => {
      const [spot, d] = arg.split(":");
      if (spot !== "col" || p.kind !== "task") return (setGhost(null), "");
      const est =
        all.find((x) => x.list.id === p.listId && x.task.id === p.id)?.task
          .est || 30;
      const start = minuteAt(at);
      setGhost((g) =>
        g?.day === d && g.start === start ? g : { day: d, start, est },
      );
      return "";
    },
    leave: () => setGhost(null),
    drop: (p, arg, at) => {
      const it =
        p.kind === "task" &&
        all.find((x) => x.list.id === p.listId && x.task.id === p.id);
      if (!it) return;
      const its = withPicked(it);
      const [spot, d] = arg.split(":");
      const patch =
        arg === "tray"
          ? { at: undefined }
          : arg === "tray-date"
            ? { due: undefined, at: undefined }
            : spot === "day"
              ? { due: d }
              : spot === "all"
                ? { due: d, at: undefined }
                : spot === "col"
                  ? { due: d, at: toClock(minuteAt(at)) }
                  : null;
      if (arg === "bin") binIt(its);
      // One save per list: two saves to the same list in a row would each start from the old tasks.
      else if (patch)
        for (const list of new Set(its.map((x) => x.list)))
          update?.(list.id, (l) => ({
            ...l,
            tasks: its.filter((x) => x.list === list).reduce((ts, x) => mapTask(ts, x.task.id, (t) => ({ ...t, ...patch })), l.tasks),
          }));
    },
  });
  const drop: Drop = (arg) => (update ? dropAt(arg) : {});

  const step = {
    day: (n: number) => addDays(at, n),
    week: (n: number) => addDays(at, 7 * n),
    month: (n: number) => addMonths(at, n),
    year: (n: number) => addMonths(at, 12 * n),
  }[view];
  const timed = view === "day" || view === "week"; // views with hours: the tray holds tasks without a time
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(at), i));
  const title = {
    day: () =>
      label(at, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    week: () =>
      `${label(week[0], { month: "short", day: "numeric" })} – ${label(week[6], { month: "short", day: "numeric", year: "numeric" })}`,
    month: () => label(at, { month: "long", year: "numeric" }),
    year: () => at.slice(0, 4),
  }[view]();
  // The page's heading, short enough to sit large (the year only when it isn't this one), and a line on how the
  // period looks: planned, done, late, and what's still waiting in the tray.
  const year = (d: string) => (d.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" as const });
  const big = {
    day: () => label(at, { weekday: "short", month: "short", day: "numeric", ...year(at) }),
    week: () =>
      week[0].slice(0, 7) === week[6].slice(0, 7)
        ? `${label(week[0], { month: "short", day: "numeric" })} – ${+week[6].slice(8)}${week[6].slice(0, 4) === today.slice(0, 4) ? "" : `, ${week[6].slice(0, 4)}`}`
        : `${label(week[0], { month: "short", day: "numeric" })} – ${label(week[6], { month: "short", day: "numeric", ...year(week[6]) })}`,
    month: () => label(at, { month: "long", ...year(at) }),
    year: () => at.slice(0, 4),
  }[view]();
  const inView = {
    day: (d: string) => d === at,
    week: (d: string) => week.includes(d),
    month: (d: string) => d.slice(0, 7) === at.slice(0, 7),
    year: (d: string) => d.slice(0, 4) === at.slice(0, 4),
  }[view];
  const dated = all.filter((it) => it.task.due && inView(it.task.due));
  const open = dated.filter((it) => !it.task.done);
  const late = open.filter((it) => it.task.due! < today).length;
  const now = inView(today) ? ` ${view === "day" ? "today" : `this ${view}`}` : "";
  const toPlan = all.filter((it) => !it.task.done && (timed ? !it.task.at : !it.task.due));
  const summary = [
    `${open.length} planned${now}`,
    dated.length - open.length ? `${dated.length - open.length} done` : "",
    late ? `${late} late` : "",
    update && toPlan.length ? `${toPlan.length} to plan` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const openDay = (d: string) => {
    setAt(d);
    setView("day");
  };
  const me = authClient.useSession().data?.user.id;
  // Clicking a task opens it right here, the way a list does; a read-only calendar opens its list instead.
  const [opened, setOpened] = useState<{ listId: string; id: string } | null>(null);
  const openTask = (it: Item, e?: React.MouseEvent) =>
    update && (e?.metaKey || e?.ctrlKey || e?.shiftKey)
      ? pick(it)
      : update
        ? setOpened({ listId: it.list.id, id: it.task.id })
        : onOpen?.(it.list.id);
  const openList = opened && lists.find((l) => l.id === opened.listId);
  const openItem = openList && openList.tasks.flatMap((t) => [t, ...t.sub]).find((t) => t.id === opened.id);

  const chip = (it: Item, withTime: boolean) => (
    <div
      key={it.task.id}
      className={s.calTask}
      data-key={keyOf(it)}
      data-picked={picked.has(keyOf(it)) || undefined}
      style={{ "--fill": listColor(it.list.id) } as React.CSSProperties}
      data-done={it.task.done}
      data-late={!it.task.done && it.task.due! < today}
      {...drag(it)}
    >
      {update ? (
        <button
          className={s.check}
          role="checkbox"
          aria-checked={it.task.done}
          aria-label={it.task.title}
          disabled={waiting(it.task, today)}
          title={
            waiting(it.task, today) ? "Repeats: tick it on its day" : undefined
          }
          onClick={() =>
            update?.(it.list.id, (l) => ({
              ...l,
              tasks: tick(l.tasks, it.task.id, today, me),
            }))
          }
        >
          {it.task.done && <Check size={12} strokeWidth={3.5} />}
        </button>
      ) : (
        <span className={s.dot} aria-hidden />
      )}
      <button
        className={s.calTitle}
        onClick={(e) => openTask(it, e)}
        title={`${it.task.title} · ${it.list.name}`}
      >
        <span>
          {withTime && it.task.at ? <b>{it.task.at} </b> : null}
          {it.task.title}
        </span>
        <span>{it.list.name}</span>
      </button>
    </div>
  );

  return (
    <div
      className={s.calendar}
      onPointerDown={(e) => {
        // A box dragged across empty space picks every task it touches (Shift or Cmd/Ctrl adds to what's picked).
        if (!update || e.button !== 0 || e.pointerType === "touch") return;
        if ((e.target as HTMLElement).closest("[data-key], button, input, select, a, [role=dialog], dialog, aside")) return;
        e.preventDefault(); // no text selection while the box is drawn
        const x0 = e.clientX, y0 = e.clientY;
        const add = e.shiftKey || e.metaKey || e.ctrlKey;
        let moved = false;
        const onMove = (m: PointerEvent) => {
          if (!moved && Math.hypot(m.clientX - x0, m.clientY - y0) < 6) return;
          moved = true;
          const r = { left: Math.min(x0, m.clientX), top: Math.min(y0, m.clientY), right: Math.max(x0, m.clientX), bottom: Math.max(y0, m.clientY) };
          setBox(r);
          const hit = new Set(add ? picked : []);
          for (const el of document.querySelectorAll<HTMLElement>("[data-key]")) {
            const b = el.getBoundingClientRect();
            if (b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom) hit.add(el.dataset.key!);
          }
          setPicked(hit);
        };
        const onUp = () => {
          removeEventListener("pointermove", onMove);
          removeEventListener("pointerup", onUp);
          setBox(null);
          if (!moved && !add) setPicked(new Set()); // a plain click on empty space lets go
        };
        addEventListener("pointermove", onMove);
        addEventListener("pointerup", onUp);
      }}
    >
      {box && (
        <div
          className={s.marquee}
          style={{ left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top }}
          aria-hidden
        />
      )}
      {picked.size > 0 && !binned && (
        <div className={s.pickBar} role="status">
          <b>{picked.size} picked.</b> Drag one onto a day, a time or the Bin and they all go.
          <button className={s.ghost} onClick={() => binIt(all.filter((x) => picked.has(keyOf(x))))}>
            Delete
          </button>
          <button className={s.ghost} onClick={() => setPicked(new Set())}>
            Done
          </button>
        </div>
      )}
      {openList && openItem && update && (
        <TaskPanel
          key={openItem.id}
          task={openItem}
          top={openList.tasks.some((t) => t.id === openItem.id)}
          fill={listColor(openList.id)}
          edit={(f) => update(openList.id, (l) => ({ ...l, tasks: mapTask(l.tasks, openItem.id, f) }))}
          onTick={() => update(openList.id, (l) => ({ ...l, tasks: tick(l.tasks, openItem.id, today, me) }))}
          onDelete={() => {
            binIt([{ list: openList, task: openItem }]);
            setOpened(null);
          }}
          onClose={() => setOpened(null)}
        />
      )}
      {binned && (
        <div className={s.undo} role="status">
          {binned.text}
          <small>In the Bin for 7 days.</small>
          <button
            className={s.ghost}
            onClick={() => {
              for (const b of binned.before) update?.(b.listId, (l) => ({ ...l, tasks: b.tasks }));
              unbin(binned.ids);
              setBinned(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      <div className={s.listHead}>
        {update && !locked && (
          <div className={s.bin} {...drop("bin")} aria-label="Bin: drop a task here to delete it" title="Drop a task here to delete it">
            <Trash2 size={28} strokeWidth={2.5} aria-hidden />
            <span>Bin</span>
          </div>
        )}
        <h1 className={`display ${s.title} ${s.calHeading}`}>{big}</h1>
        <p className={s.progress}>{summary}</p>
      </div>
      <div className={s.calBar}>
        {!locked && (
          <>
            <button className={s.ghost} onClick={() => setAt(today)}>
              Today
            </button>
            <button
              className={s.ghost}
              onClick={() => setAt(step(-1))}
              aria-label="Previous"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button
              className={s.ghost}
              onClick={() => setAt(step(1))}
              aria-label="Next"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </>
        )}
        {!locked && (
          <div className={s.seg} role="group" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        )}
        {!locked && lists.length > 1 && (
          <Select
            className={s.calLists}
            label="Show lists"
            value={lists.some((l) => l.id === only) ? only : "all"}
            options={[
              { value: "all", label: "All lists" },
              ...lists.map((l) => ({ value: l.id, label: l.name })),
            ]}
            onChange={setOnly}
          />
        )}
        {share && (
          <button
            className={s.ghost}
            onClick={async () => {
              if (gated) return needsPlan("Sharing comes with Plus.");
              const r = await share(view, at);
              if ("error" in r) return setShared(r.error);
              await navigator.clipboard.writeText(
                `${location.origin}/calendar/${r.token}`,
              );
              setShared(
                `Copied a read-only link to ${title}. It shows only this ${view}. Stop sharing it any time in Integrations.`,
              );
            }}
          >
            <Share2 size={16} strokeWidth={2.5} /> Share
            {gated && <Diamond />}
          </button>
        )}
        {shared && (
          <p className={s.shareNote} role="status">
            {shared}
          </p>
        )}
      </div>

      <div className={s.planner} data-tray={!!update}>
        {view === "year" ? (
          <div className={s.year}>
            {Array.from(
              { length: 12 },
              (_, m) =>
                `${at.slice(0, 4)}-${String(m + 1).padStart(2, "0")}-01`,
            ).map((first) => (
              <div key={first} className={s.mini}>
                <button
                  className={s.miniHead}
                  onClick={() => {
                    setAt(first);
                    setView("month");
                  }}
                >
                  {label(first, { month: "long" })}
                </button>
                <div className={s.miniGrid}>
                  {monthCells(first).map((d) => {
                    const n = (byDay.get(d) ?? []).filter(
                      (it) => !it.task.done,
                    ).length;
                    return d.slice(0, 7) === first.slice(0, 7) ? (
                      <button
                        key={d}
                        data-today={d === today}
                        data-n={Math.min(n, 3)}
                        {...drop(`day:${d}`)}
                        onClick={() => openDay(d)}
                        aria-label={`${label(d, { month: "long", day: "numeric" })}: ${n} open`}
                      >
                        {+d.slice(8)}
                      </button>
                    ) : (
                      <span key={d} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : view === "month" ? (
          <div className={s.cal}>
            {week.map((d) => (
              <div key={d} className={s.calHead}>
                {label(d, { weekday: "short" })}
              </div>
            ))}
            {monthCells(at).map((d) => {
              const items = byDay.get(d) ?? [];
              return (
                <div
                  key={d}
                  className={s.day}
                  data-out={d.slice(0, 7) !== at.slice(0, 7)}
                  data-today={d === today}
                  data-empty={!items.length}
                  {...drop(`day:${d}`)}
                >
                  <button className={s.dayNum} onClick={() => openDay(d)}>
                    <span className={s.dayName}>
                      {label(d, { weekday: "short" })}{" "}
                    </span>
                    {+d.slice(8)}
                  </button>
                  {items.map((it) => chip(it, true))}
                </div>
              );
            })}
          </div>
        ) : (
          <TimeGrid
            days={view === "day" ? [at] : week}
            today={today}
            byDay={byDay}
            chip={chip}
            drag={drag}
            drop={drop}
            onDay={openDay}
            onOpen={openTask}
            picked={picked}
            resize={update && ((it, est) => move(it, { est }))}
            ghost={ghost}
          />
        )}
        {update && (
          <aside
            className={s.tray}
            aria-label="To plan"
            {...drop(timed ? "tray" : "tray-date")}
          >
            <h3>
              To plan {toPlan.length > 0 && <span className={s.trayCount}>{toPlan.length}</span>}
            </h3>
            <p>
              {!toPlan.length
                ? "All planned. Nice."
                : timed
                  ? "Drag onto a time. Drop a block back here to take its time off."
                  : "Drag onto a day. Drop a task back here to take its date off."}
            </p>
            {/* A step waits under its parent's sticker when the parent is waiting too; it folds like the list's. */}
            {toPlan
              .filter((it) => !toPlan.some((p) => p.list === it.list && p.task.sub.includes(it.task)))
              .map((it) => (
                <TrayItem
                  key={it.task.id}
                  it={it}
                  steps={toPlan.filter((x) => x.list === it.list && it.task.sub.includes(x.task))}
                  drag={drag}
                  onOpen={openTask}
                  picked={picked}
                />
              ))}
          </aside>
        )}
      </div>
    </div>
  );
}

function TrayItem({
  it,
  steps,
  drag,
  onOpen,
  picked,
}: {
  it: Item;
  steps: Item[];
  drag: (it: Item) => object | undefined;
  onOpen: (it: Item, e?: React.MouseEvent) => void;
  picked: Set<string>;
}) {
  const [folded, setFolded] = useFolded(it.task.id);
  const sticker = (x: Item, fold?: React.ReactNode) => (
    <div
      key={x.task.id}
      className={s.trayItem}
      data-key={`${x.list.id}:${x.task.id}`}
      data-picked={picked.has(`${x.list.id}:${x.task.id}`) || undefined}
      style={{ "--fill": listColor(x.list.id) } as React.CSSProperties}
      onClick={(e) => !(e.target as HTMLElement).closest("button") && onOpen(x, e)}
      title="Click to open, or drag onto a day"
      {...drag(x)}
    >
      {x.task.title}
      <span>
        {x.list.name}
        {x.task.est ? ` · ${fmtMinutes(x.task.est)}` : ""}
        {x.task.due ? ` · ${label(x.task.due, { month: "short", day: "numeric" })}` : ""}
        {fold}
      </span>
    </div>
  );
  if (!steps.length) return sticker(it);
  return (
    <div className={s.trayGroup}>
      {sticker(
        it,
        <button
          className={`${s.trayFold} ${s.fold}`}
          onClick={() => setFolded(!folded)}
          aria-expanded={!folded}
          aria-label={`${folded ? "Show" : "Hide"} ${steps.length} step${steps.length === 1 ? "" : "s"}`}
          title={folded ? "Show steps" : "Fold steps"}
        >
          <ChevronDown size={12} strokeWidth={3} aria-hidden />
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </button>,
      )}
      {!folded && <div className={s.traySteps}>{steps.map((x) => sticker(x))}</div>}
    </div>
  );
}

function TimeGrid({
  days,
  today,
  byDay,
  chip,
  drag,
  drop,
  onDay,
  onOpen,
  picked,
  resize,
  ghost,
}: {
  days: string[];
  today: string;
  byDay: Map<string, Item[]>;
  chip: (it: Item, withTime: boolean) => React.ReactNode;
  drag: (it: Item) => object | undefined;
  drop: Drop;
  onDay: (d: string) => void;
  onOpen: (it: Item, e?: React.MouseEvent) => void;
  picked: Set<string>;
  resize?: (it: Item, est: number) => void;
  ghost: { day: string; start: number; est: number } | null;
}) {
  // Dragging a block's bottom edge stretches it; the new length becomes the task's estimate.
  const [stretch, setStretch] = useState<{ id: string; est: number } | null>(
    null,
  );
  const startStretch = (e: React.PointerEvent, it: Item, start: number) => {
    e.stopPropagation(); // not a move of the whole block
    e.preventDefault();
    const y0 = e.clientY;
    const est0 = it.task.est || 30;
    const at = (y: number) =>
      Math.max(
        SNAP,
        Math.min(
          24 * 60 - start,
          Math.round((est0 + ((y - y0) / HOUR) * 60) / SNAP) * SNAP,
        ),
      );
    let est = est0;
    const onMove = (ev: PointerEvent) =>
      setStretch({ id: it.task.id, est: (est = at(ev.clientY)) });
    const onUp = () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      setStretch(null);
      if (est !== est0) resize?.(it, est);
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
  };
  const [now, setNow] = useState<number | null>(null);
  // "All day" shows a few per day (open ones first) so the hours stay in view; "+N more" opens every day.
  const [allOpen, setAllOpen] = useState(false);
  const ALL_DAY = 3;
  const allDay = (d: string) =>
    (byDay.get(d) ?? [])
      .filter((it) => !it.task.at)
      .sort((x, y) => Number(x.task.done) - Number(y.task.done));
  const folds = days.some((d) => allDay(d).length > ALL_DAY);
  useEffect(() => {
    const tick = () =>
      setNow(new Date().getHours() * 60 + new Date().getMinutes());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  // Opening a day or week lands on now (today's red line, centred) instead of midnight; other weeks start at 08:00.
  // Once per view, so scrolling around isn't fought; the header stays pinned above.
  const grid = useRef<HTMLDivElement>(null);
  const shownToday = days.includes(today);
  const placed = now !== null;
  const first = days[0];
  useEffect(() => {
    if (!placed) return;
    const el = grid.current?.querySelector<HTMLElement>(shownToday ? `.${s.now}` : "[data-hour='8']");
    el?.scrollIntoView({ block: shownToday ? "center" : "start", behavior: "instant" });
  }, [placed, shownToday, first]);

  return (
    <div
      ref={grid}
      className={s.tg}
      style={{ "--days": days.length } as React.CSSProperties}
    >
      <div className={s.tgHead}>
        <div className={s.tgRow}>
          <span />
          {days.map((d) => (
            <button
              key={d}
              className={s.tgDay}
              data-today={d === today}
              onClick={() => onDay(d)}
            >
              {label(d, { weekday: "short" })} <b>{+d.slice(8)}</b>
            </button>
          ))}
        </div>
        <div className={s.tgRow}>
          <span className={s.tgLabel}>
            all day
            {folds && allOpen && (
              <button className={s.allMore} onClick={() => setAllOpen(false)}>
                Show less
              </button>
            )}
          </span>
          {days.map((d) => {
            const items = allDay(d);
            const hidden = allOpen ? 0 : Math.max(0, items.length - ALL_DAY);
            return (
              <div key={d} className={s.allDay} {...drop(`all:${d}`)}>
                {(hidden ? items.slice(0, ALL_DAY) : items).map((it) =>
                  chip(it, false),
                )}
                {hidden > 0 && (
                  <button
                    className={s.allMore}
                    onClick={() => setAllOpen(true)}
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className={s.tgRow} style={{ height: 24 * HOUR }}>
        <div className={s.hours}>
          {Array.from({ length: 23 }, (_, h) => (
            <span key={h} data-hour={h + 1} style={{ top: (h + 1) * HOUR }}>
              {toClock((h + 1) * 60)}
            </span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className={s.col} {...drop(`col:${d}`)}>
            {d === today && now !== null && (
              <i className={s.now} style={{ top: (now / 60) * HOUR }} />
            )}
            {ghost?.day === d && (
              <span
                className={s.ghostBlock}
                style={{
                  top: (ghost.start / 60) * HOUR,
                  height: Math.max((ghost.est / 60) * HOUR - 2, 18),
                }}
                aria-hidden
              >
                {toClock(ghost.start)}–
                {toClock(Math.min(24 * 60, ghost.start + ghost.est))}
              </span>
            )}
            {lanes(
              (byDay.get(d) ?? [])
                .filter((it) => it.task.at)
                .map((it) => {
                  const start = toMinutes(it.task.at!);
                  const est =
                    stretch?.id === it.task.id
                      ? stretch.est
                      : it.task.est || 30;
                  return { it, start, end: Math.min(24 * 60, start + est) };
                }),
            ).map(({ it, start, end, lane, lanes: n }) => (
              <button
                key={it.task.id}
                className={s.block}
                data-done={it.task.done}
                data-key={`${it.list.id}:${it.task.id}`}
                data-picked={picked.has(`${it.list.id}:${it.task.id}`) || undefined}
                style={{
                  top: (start / 60) * HOUR,
                  height: Math.max(((end - start) / 60) * HOUR - 2, 18),
                  left: `${(lane / n) * 100}%`,
                  width: `calc(${100 / n}% - 4px)`,
                  "--fill": listColor(it.list.id),
                } as React.CSSProperties}
                onClick={(e) => onOpen(it, e)}
                title={`${it.task.at}–${toClock(end)} ${it.task.title} · ${it.list.name}`}
                {...drag(it)}
              >
                <b>{it.task.title}</b>
                <span>
                  {it.task.at}–{toClock(end)} · {it.list.name}
                </span>
                {resize && (
                  <i
                    className={s.stretch}
                    onPointerDown={(e) => startStretch(e, it, start)}
                    onClick={(e) => e.stopPropagation()}
                    aria-hidden
                    title="Drag to change how long"
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
