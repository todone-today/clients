"use client";

import { useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { draggable } from "@/lib/drag";
import { mapTask } from "@/lib/store";
import { type List, type Task, uid } from "@/lib/tasks";
import s from "./app.module.css";

type Update = (id: string, f: (l: List) => List | null) => void;
const COLORS = ["var(--butter)", "var(--pink)", "var(--cyan)", "var(--lime)", "var(--peri)"];

// Moves an idea off the board into a list as a new task.
export function ideaToTask(lists: List[], ideaId: string, listId: string, update: Update) {
  const board = lists.find((l) => l.kind === "ideas");
  const idea = board?.tasks.find((t) => t.id === ideaId);
  if (!board || !idea) return;
  update(board.id, (l) => ({ ...l, tasks: l.tasks.filter((t) => t.id !== ideaId) }));
  update(listId, (l) => ({ ...l, tasks: [...l.tasks, { id: uid(), title: idea.title, done: false, sub: [] }] }));
}

// A board for loose ideas. They live in the workspace's "ideas" list until one is turned into a task.
export function Brainstorm({
  lists,
  add,
  update,
}: {
  lists: List[];
  add: (name: string, tasks: Task[], kind: "ideas") => string;
  update: Update;
}) {
  const board = lists.find((l) => l.kind === "ideas");
  const targets = lists.filter((l) => !l.kind);
  const ideas = board?.tasks ?? [];
  const [draft, setDraft] = useState("");
  const setIdeas = (f: (ts: Task[]) => Task[]) => board && update(board.id, (l) => ({ ...l, tasks: f(l.tasks) }));

  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Brainstorm</h1>
        <p className={s.progress}>Dump ideas here, half-formed is fine. Drag a good one onto a list to make it a task.</p>
      </div>
      <form
        className={s.add}
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          const idea: Task = { id: uid(), title: t, done: false, sub: [] };
          if (board) setIdeas((ts) => [idea, ...ts]);
          else add("Brainstorm", [idea], "ideas");
          setDraft("");
        }}
      >
        <label className="sr-only" htmlFor="new-idea">
          New idea
        </label>
        <input
          id="new-idea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What if…"
          maxLength={500}
          autoComplete="off"
        />
        <button className="btn" style={{ "--fill": "var(--pink)" } as React.CSSProperties} disabled={!draft.trim()}>
          Add idea
        </button>
      </form>

      {ideas.length ? (
        <ul className={s.board}>
          {ideas.map((idea, i) => (
            <li
              key={idea.id}
              className={s.idea}
              style={{ "--fill": COLORS[i % COLORS.length] } as React.CSSProperties}
              {...draggable({ kind: "idea", id: idea.id }, idea.title)}
            >
              <label className="sr-only" htmlFor={`idea-${idea.id}`}>
                Idea
              </label>
              <textarea
                id={`idea-${idea.id}`}
                defaultValue={idea.title}
                maxLength={500}
                rows={3}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== idea.title) setIdeas((ts) => mapTask(ts, idea.id, (t) => ({ ...t, title: v })));
                }}
              />
              <div className={s.ideaTools}>
                <span className={s.grip} aria-hidden>
                  <GripVertical size={14} strokeWidth={2.5} /> drag onto a list
                </span>
                {/* Keyboard path to the same move; shown when the card has focus. */}
                <label className="sr-only" htmlFor={`to-${idea.id}`}>
                  Make it a task in
                </label>
                <select
                  id={`to-${idea.id}`}
                  className={s.moveTo}
                  value=""
                  onChange={(e) => e.target.value && ideaToTask(lists, idea.id, e.target.value, update)}
                >
                  <option value="">Move to…</option>
                  {targets.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Delete idea"
                  onClick={() => setIdeas((ts) => ts.filter((t) => t.id !== idea.id))}
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.empty}>
          <p className="display">Blank page.</p>
          <p>Type anything above. Nothing here is a commitment until you make it a task.</p>
        </div>
      )}
    </>
  );
}
