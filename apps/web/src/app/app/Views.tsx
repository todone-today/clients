"use client";

// The board's views: "All", and any the person saved (a name and a filter: done or not, when, how urgent). One tab
// each, and a + to make another. Tap a chosen view again to change or delete it. Kept in this browser.
import { useState } from "react";
import { Plus } from "lucide-react";
import { type Task, uid } from "@todone/sdk/tasks";
import { ALL, type View, WHENS, board } from "@/lib/board";
import { Modal } from "./Goals";
import s from "./app.module.css";

const KEY = "todone:views";
const load = (): View[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};

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
  const [views, setViews] = useState<View[]>(() => (typeof localStorage === "undefined" ? [] : load()));
  const [editing, setEditing] = useState<View | null>(null);
  const keep = (vs: View[]) => {
    setViews(vs);
    try {
      localStorage.setItem(KEY, JSON.stringify(vs));
    } catch {}
  };
  // A view shown for a moment (e.g. "Done", from "look back at what you did") gets a tab while it's on.
  const tabs = [ALL, ...views, ...(view.id !== ALL.id && !views.some((v) => v.id === view.id) ? [view] : [])];
  return (
    <>
      <div className={s.views} role="tablist" aria-label="Views">
        {tabs.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view.id === v.id}
            onClick={() => (view.id === v.id && views.some((x) => x.id === v.id) ? setEditing(v) : onView(v))}
          >
            {v.name}
          </button>
        ))}
        <button
          className={s.viewAdd}
          aria-label="Make a view"
          data-tip="Make a view"
          onClick={() => setEditing({ id: uid(), name: "", status: "open", when: "any" })}
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
  const [v, setV] = useState(view);
  const n = count(v);
  const chips = <K extends keyof View>(k: K, options: [View[K], string][], label: string) => (
    <div className={s.viewField}>
      <span>{label}</span>
      <div className={s.viewChips} role="radiogroup" aria-label={label}>
        {options.map(([value, name]) => (
          <button key={String(value)} type="button" role="radio" aria-checked={v[k] === value} onClick={() => setV((x) => ({ ...x, [k]: value }))}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
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
          onChange={(e) => setV((x) => ({ ...x, name: e.target.value }))}
          maxLength={30}
          placeholder="Name it: Due soon"
          aria-label="Name"
          autoFocus
          required
        />
        {chips(
          "status",
          [
            ["open", "To do"],
            ["done", "Done"],
            ["all", "Both"],
          ],
          "Show",
        )}
        {chips("when", WHENS, "When")}
        {chips(
          "high",
          [
            [undefined, "Any"],
            [true, "High only"],
          ],
          "Priority",
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
