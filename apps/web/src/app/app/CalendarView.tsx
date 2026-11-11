"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
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
import { mapTask } from "@/lib/store";
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
  const drag = (it: Item) =>
    update &&
    draggable(
      { kind: "task", listId: it.list.id, id: it.task.id, ids: [it.task.id] },
      it.task.title,
    );
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
      const [spot, d] = arg.split(":");
      if (arg === "tray") move(it, { at: undefined });
      else if (arg === "tray-date") move(it, { due: undefined, at: undefined });
      else if (spot === "day") move(it, { due: d });
      else if (spot === "all") move(it, { due: d, at: undefined });
      else if (spot === "col") move(it, { due: d, at: toClock(minuteAt(at)) });
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

  const chip = (it: Item, withTime: boolean) => (
    <div
      key={it.task.id}
      className={s.calTask}
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
        onClick={() => onOpen?.(it.list.id)}
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
    <div className={s.calendar}>
      <div className={s.listHead}>
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
            onOpen={onOpen}
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
}: {
  it: Item;
  steps: Item[];
  drag: (it: Item) => object | undefined;
}) {
  const [folded, setFolded] = useFolded(it.task.id);
  const sticker = (x: Item, fold?: React.ReactNode) => (
    <div
      key={x.task.id}
      className={s.trayItem}
      style={{ "--fill": listColor(x.list.id) } as React.CSSProperties}
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
  onOpen?: (listId: string) => void;
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
                style={{
                  top: (start / 60) * HOUR,
                  height: Math.max(((end - start) / 60) * HOUR - 2, 18),
                  left: `${(lane / n) * 100}%`,
                  width: `calc(${100 / n}% - 4px)`,
                  "--fill": listColor(it.list.id),
                } as React.CSSProperties}
                onClick={() => onOpen?.(it.list.id)}
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
