"use client";

// The board's views: "All" and "Open" (always there), and any the person saved (a name and the rules it filters by:
// done or not, date, time, priority, effort, how long). One tab each, and a + to make another. Tap a chosen view
// again to change or delete it; drag a tab (or Alt+arrow) to move it. Kept in this browser, in the order shown.
import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { EFFORTS, type Effort, type Task, uid } from "@todone/sdk/tasks";
import { ALL, type View, WHENS, board } from "@/lib/board";
import { Modal } from "./Goals";
import s from "./app.module.css";

const KEY = "todone:views";
const OPEN: View = { id: "open", name: "Open", status: "open", when: "any" };
const BUILT_IN = [ALL, OPEN];
const builtIn = (id: string) => BUILT_IN.some((b) => b.id === id);
// Saved views, with All and Open in their places (added at the front if missing; a saved "Open" makes way for the real one).
const load = (): View[] => {
  let vs: View[] = [];
  try {
    vs = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {}
  vs = vs.filter((v) => builtIn(v.id) || v.name.trim().toLowerCase() !== "open" || v.status !== "open");
  const missing = BUILT_IN.filter((b) => !vs.some((v) => v.id === b.id));
  return [...missing, ...vs.map((v) => BUILT_IN.find((b) => b.id === v.id) ?? v)];
};

// Each list opens on the view last picked there (All if none, or if that view is gone).
const LAST = "todone:list-view";
export function lastView(list: string): View {
  try {
    const id = (JSON.parse(localStorage.getItem(LAST) ?? "{}") as Record<string, string>)[list];
    return load().find((v) => v.id === id) ?? ALL;
  } catch {
    return ALL;
  }
}
export function rememberView(list: string, view: string) {
  try {
    const all = JSON.parse(localStorage.getItem(LAST) ?? "{}") as Record<string, string>;
    localStorage.setItem(LAST, JSON.stringify({ ...all, [list]: view }));
  } catch {}
}

export function Views({
  view,
  onView,
  tasks,
  today,
  nowMin,
}: {
  view: View;
  onView: (v: View) => void;
  tasks: Task[];
  today: string;
  nowMin: number;
}) {
  const [views, setViews] = useState<View[]>(() => (typeof localStorage === "undefined" ? BUILT_IN : load()));
  const [editing, setEditing] = useState<View | null>(null);
  const [held, setHeld] = useState<string | null>(null); // the tab being dragged
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const keep = (vs: View[]) => {
    setViews(vs);
    try {
      localStorage.setItem(KEY, JSON.stringify(vs));
    } catch {}
  };
  const moveTo = (id: string, to: number) => {
    const from = views.findIndex((v) => v.id === id);
    if (from < 0 || to < 0 || to >= views.length || from === to) return views;
    const vs = [...views];
    vs.splice(to, 0, vs.splice(from, 1)[0]);
    return vs;
  };
  // A view shown for a moment (e.g. "Done", from "look back at what you did") gets a tab while it's on.
  const tabs = [...views, ...(!views.some((v) => v.id === view.id) ? [view] : [])];
  const mine = (id: string) => views.some((x) => x.id === id);
  return (
    <>
      <div className={s.views} role="tablist" aria-label="Views (drag to reorder)">
        {tabs.map((v) => (
          <button
            key={v.id}
            role="tab"
            data-view={v.id}
            data-held={held === v.id || undefined}
            aria-selected={view.id === v.id}
            onPointerDown={(e) => {
              if (!mine(v.id) || e.button) return;
              drag.current = { id: v.id, x: e.clientX, y: e.clientY, moved: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
              d.moved = true;
              setHeld(d.id);
              // Over another tab: this one takes its place, and the rest shift along.
              const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-view]");
              const to = views.findIndex((x) => x.id === over?.dataset.view);
              if (to >= 0) setViews(moveTo(d.id, to));
            }}
            onPointerUp={() => {
              if (drag.current?.moved) keep(views);
              setHeld(null);
            }}
            onPointerCancel={() => ((drag.current = null), setHeld(null))}
            onKeyDown={(e) => {
              if (!e.altKey || !mine(v.id) || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
              e.preventDefault();
              keep(moveTo(v.id, views.findIndex((x) => x.id === v.id) + (e.key === "ArrowLeft" ? -1 : 1)));
            }}
            onClick={() => {
              const dragged = drag.current?.moved;
              drag.current = null;
              if (dragged) return;
              if (view.id === v.id && mine(v.id) && !builtIn(v.id)) setEditing(v);
              else onView(v);
            }}
          >
            {v.name}
          </button>
        ))}
        <button
          className={s.viewAdd}
          aria-label="Make a view"
          data-tip="Make a view"
          onClick={() => setEditing({ id: uid(), name: "", status: "all", when: "any" })}
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
      {editing && (
        <ViewEditor
          view={editing}
          isNew={!views.some((v) => v.id === editing.id)}
          count={(v) => board(tasks, v, "mine", today, nowMin).length}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            keep(views.some((x) => x.id === v.id) ? views.map((x) => (x.id === v.id ? v : x)) : [...views, v]);
            onView(v);
            setEditing(null);
          }}
          onDelete={() => {
            keep(views.filter((x) => x.id !== editing.id));
            onView(ALL);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

// The rules a view can add, beyond to do / done. None is on at first: a new view shows everything, and each rule
// added narrows it.
type Rule = "date" | "time" | "pri" | "effort" | "est";
const RULES: [Rule, string, (v: View) => boolean, Partial<View>][] = [
  ["date", "Date", (v) => v.when !== "any" && v.when !== "timed", { when: "any", from: undefined, to: undefined }],
  ["time", "Time", (v) => !!v.time || v.when === "timed", { time: undefined }],
  ["pri", "Priority", (v) => !!v.pri?.length || !!v.high, { pri: undefined, high: undefined }],
  ["effort", "Effort", (v) => !!v.effort?.length, { effort: undefined }],
  ["est", "How long", (v) => !!v.est, { est: undefined }],
];
const PRIS: [number, string][] = [
  [1, "High"],
  [2, "Medium"],
  [3, "Low"],
  [0, "None"],
];
const ESTS: [number, string][] = [
  [15, "15 min or less"],
  [30, "30 min or less"],
  [60, "1 hour or less"],
  [120, "2 hours or less"],
];

function ViewEditor({
  view,
  isNew,
  count,
  onClose,
  onSave,
  onDelete,
}: {
  view: View;
  isNew: boolean;
  count: (v: View) => number;
  onClose: () => void;
  onSave: (v: View) => void;
  onDelete: () => void;
}) {
  // Older views: "Has a time" was a date choice, "High only" a switch. They open as the rules they are now.
  const [v, setV] = useState<View>(() => ({
    ...view,
    ...(view.when === "timed" ? { when: "any" as const, time: "timed" as const } : {}),
    ...(view.high ? { pri: [1], high: undefined } : {}),
  }));
  const [on, setOn] = useState<Rule[]>(() => RULES.filter(([, , has]) => has(v)).map(([k]) => k));
  const set = (p: Partial<View>) => setV((x) => ({ ...x, ...p }));
  const n = count(v);
  const one = <T,>(label: string, options: [T, string][], value: T | undefined, pick: (x: T) => void) => (
    <div className={s.viewChips} role="radiogroup" aria-label={label}>
      {options.map(([x, name]) => (
        <button key={String(x)} type="button" role="radio" aria-checked={value === x} onClick={() => pick(x)}>
          {name}
        </button>
      ))}
    </div>
  );
  const many = <T,>(label: string, options: [T, string][], value: T[] | undefined, pick: (x: T[]) => void) => (
    <div className={s.viewChips} role="group" aria-label={label}>
      {options.map(([x, name]) => {
        const has = !!value?.includes(x);
        return (
          <button
            key={String(x)}
            type="button"
            role="checkbox"
            aria-checked={has}
            onClick={() => pick(has ? value!.filter((y) => y !== x) : [...(value ?? []), x])}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
  const body: Record<Rule, React.ReactNode> = {
    date: (
      <>
        {one("Date", WHENS, v.when, (when) => set({ when }))}
        {v.when === "between" && (
          <div className={s.viewDates}>
            <label>
              From
              <input type="date" value={v.from ?? ""} max={v.to} onChange={(e) => set({ from: e.target.value || undefined })} />
            </label>
            <label>
              To
              <input type="date" value={v.to ?? ""} min={v.from} onChange={(e) => set({ to: e.target.value || undefined })} />
            </label>
          </div>
        )}
      </>
    ),
    time: one(
      "Time",
      [
        ["timed", "Has a time"],
        ["untimed", "No time"],
      ] as [NonNullable<View["time"]>, string][],
      v.time,
      (time) => set({ time }),
    ),
    pri: many("Priority", PRIS, v.pri, (pri) => set({ pri })),
    effort: many(
      "Effort",
      [...EFFORTS.map((e) => [e, e.toUpperCase()] as [Effort | "none", string]), ["none", "None"]],
      v.effort,
      (effort) => set({ effort: effort as View["effort"] }),
    ),
    est: one("How long", ESTS, v.est, (est) => set({ est })),
  };
  const add = (k: Rule) => {
    setOn((o) => [...o, k]);
    // A sensible first pick, so adding a rule already does something.
    if (k === "date") set({ when: "week" });
    if (k === "time") set({ time: "timed" });
    if (k === "pri") set({ pri: [1] });
    if (k === "est") set({ est: 30 });
  };
  const drop = (k: Rule) => {
    setOn((o) => o.filter((x) => x !== k));
    set(RULES.find(([x]) => x === k)![3]);
  };
  return (
    <Modal label={isNew ? "New view" : "Change view"} onClose={onClose}>
      <form
        className={s.viewForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (v.name.trim()) onSave({ ...v, name: v.name.trim() });
        }}
      >
        <h2 className="display">{isNew ? "New view" : "Change view"}</h2>
        <input
          className={s.gdTitle}
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
          maxLength={30}
          placeholder="Name it: Due soon"
          aria-label="Name"
          autoFocus
          required
        />
        <div className={s.viewField}>
          <span>Show</span>
          {one(
            "Show",
            [
              ["all", "All"],
              ["open", "To do"],
              ["done", "Done"],
            ] as [View["status"], string][],
            v.status,
            (status) => set({ status }),
          )}
        </div>
        {RULES.filter(([k]) => on.includes(k)).map(([k, label]) => (
          <div key={k} className={s.viewField}>
            <span className={s.viewRuleHead}>
              {label}
              <button type="button" onClick={() => drop(k)} aria-label={`Remove ${label.toLowerCase()}`}>
                <X size={14} strokeWidth={3} />
              </button>
            </span>
            {body[k]}
          </div>
        ))}
        {on.length < RULES.length && (
          <div className={s.viewField}>
            <span>Narrow it down</span>
            <div className={s.viewAddRules}>
              {RULES.filter(([k]) => !on.includes(k)).map(([k, label]) => (
                <button key={k} type="button" onClick={() => add(k)}>
                  <Plus size={14} strokeWidth={3} aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className={s.panelHint} role="status">
          {n} task{n === 1 ? "" : "s"} on this list fit.
        </p>
        <div className={s.gdFoot}>
          {!isNew && (
            <button type="button" className={s.link} onClick={onDelete}>
              Delete view
            </button>
          )}
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!v.name.trim()}>
            Save view
          </button>
        </div>
      </form>
    </Modal>
  );
}
