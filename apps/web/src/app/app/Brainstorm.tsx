"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { draggable, placeOn, useDrop } from "@/lib/drag";
import { useGlide } from "@/lib/glide";
import { binSound } from "@/lib/sound";
import { mapTask } from "@/lib/store";
import { type List, type Task, moveTasks, uid } from "@todone/sdk/tasks";
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
// Cards drag onto a list (to become a task) or into the bin; double-click a card's text to edit it.
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
  const [binned, setBinned] = useState<{ before: Task[]; title: string } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // Ctrl/Cmd-click selection
  const pick = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPicked(new Set());
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);
  const setIdeas = (f: (ts: Task[]) => Task[]) => board && update(board.id, (l) => ({ ...l, tasks: f(l.tasks) }));
  const [armed, setArmed] = useState(false);
  const remove = (ids: string[]) => {
    const gone = ideas.filter((t) => ids.includes(t.id));
    if (!gone.length) return;
    setBinned({ before: ideas, title: gone.length > 1 ? `${gone.length} ideas` : `“${gone[0].title}”` });
    setIdeas((ts) => ts.filter((t) => !ids.includes(t.id)));
    setPicked(new Set());
  };
  // Dragging an idea over another's left or right half opens a slot there and the others slide aside, as on
  // a list's board; the slot is a drop target too, so the gap holds while the pointer is in it.
  const glide = useGlide<HTMLUListElement>();
  const [gap, setGap] = useState<{ target: string; place: "before" | "after"; ids: string[] } | null>(null);
  const dropOnIdea = useDrop("ideas", {
    accept: (p, id) => p.kind === "idea" && (id === "gap" ? !!gap : !p.ids.includes(id)),
    where: (p, id, at) => {
      if (p.kind !== "idea" || id === "gap") return "inside";
      const place = placeOn(at, "x", false) as "before" | "after";
      setGap((g) => (g?.target === id && g.place === place ? g : { target: id, place, ids: p.ids }));
      return place;
    },
    leave: () => setGap(null),
    drop: (p, id, at) => {
      setGap(null);
      if (p.kind !== "idea") return;
      const to = id === "gap" && gap ? gap : { target: id, place: placeOn(at, "x", false) };
      setIdeas((ts) => moveTasks(ts, p.ids, to.target, to.place));
      setPicked(new Set());
    },
  });
  // Colours follow each idea, not its place, so moving one doesn't repaint the rest.
  const colors = new Map([...ideas.map((t) => t.id)].sort().map((id, i) => [id, COLORS[i % COLORS.length]]));
  const binDrop = useDrop("ideas-bin", {
    accept: (p) => p.kind === "idea",
    drop: (p) => {
      if (p.kind !== "idea") return;
      remove(p.ids);
      binSound();
    },
  });
  useEffect(() => {
    if (!binned) return;
    const t = setTimeout(() => setBinned(null), 10_000);
    return () => clearTimeout(t);
  }, [binned]);

  return (
    <>
      <div className={s.listHead}>
        {/* Drop ideas here to delete them; click twice to clear them all. Undo brings them back either way. */}
        <button
          className={s.bin}
          data-bin
          data-armed={armed}
          {...binDrop("bin")}
          disabled={!ideas.length}
          onClick={() => {
            if (!armed) return setArmed(true);
            remove(ideas.map((t) => t.id));
            binSound();
            setArmed(false);
          }}
          onBlur={() => setArmed(false)}
          aria-label={armed ? "Click again to delete every idea" : "Delete all ideas, or drop ideas here to delete them"}
          title={armed ? "Click again to delete every idea" : "Drop ideas here to delete them. Click to clear them all."}
        >
          <Trash2 size={28} strokeWidth={2.5} />
          <span>{armed ? "Clear all?" : "Bin"}</span>
        </button>
        <h1 className={`display ${s.title}`}>Brainstorm</h1>
        <p className={s.progress}>Dump ideas here, half-formed is fine. Drag a good one onto a list to make it a task.</p>
      </div>
      {binned && (
        <div className={s.undo} role="status">
          Deleted {binned.title}.
          <button
            className={s.ghost}
            onClick={() => {
              setIdeas(() => binned.before);
              setBinned(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      {picked.size > 0 && (
        <div className={s.pickBar} role="status">
          <b>{picked.size} selected.</b> Drag them onto a list or into the bin.
          <button className={s.ghost} onClick={() => setPicked(new Set())}>
            Clear <kbd>Esc</kbd>
          </button>
        </div>
      )}
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
        <ul className={s.board} ref={glide}>
          {ideas.flatMap((idea) => {
            const card = (
              <Idea
                key={idea.id}
                idea={idea}
                color={colors.get(idea.id)!}
                drop={dropOnIdea(idea.id)}
                dragged={!!gap?.ids.includes(idea.id)}
                targets={targets}
                onRename={(title) => setIdeas((ts) => mapTask(ts, idea.id, (t) => ({ ...t, title })))}
                onMove={(listId) => ideaToTask(lists, idea.id, listId, update)}
                onDelete={() => remove([idea.id])}
                picked={picked}
                onPick={pick}
              />
            );
            if (gap?.target !== idea.id) return [card];
            const slot = <li key="gap" className={s.slot} {...dropOnIdea("gap")} aria-hidden />;
            return gap.place === "before" ? [slot, card] : [card, slot];
          })}
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

function Idea({
  idea,
  color,
  targets,
  onRename,
  onMove,
  onDelete,
  picked,
  onPick,
  drop,
  dragged,
}: {
  drop: { "data-drop": string };
  dragged: boolean;
  idea: Task;
  color: string;
  targets: List[];
  onRename: (title: string) => void;
  onMove: (listId: string) => void;
  onDelete: () => void;
  picked: Set<string>;
  onPick: (id: string) => void;
}) {
  // Dragging a selected idea carries the whole selection.
  const ids = picked.has(idea.id) ? [...picked] : [idea.id];
  const [editing, setEditing] = useState(false);
  return (
    <li
      className={s.idea}
      data-id={idea.id}
      data-dragged={dragged || undefined}
      {...drop}
      style={{ "--fill": color } as React.CSSProperties}
      data-picked={picked.has(idea.id) || undefined}
      {...draggable({ kind: "idea", id: idea.id, ids }, ids.length > 1 ? `${ids.length} ideas` : idea.title)}
      // Ctrl/Cmd-click selects instead of anything else.
      onClickCapture={(e) => {
        if (!e.metaKey && !e.ctrlKey) return;
        e.preventDefault();
        e.stopPropagation();
        onPick(idea.id);
      }}
    >
      {editing ? (
        <>
          <label className="sr-only" htmlFor={`idea-${idea.id}`}>
            Idea
          </label>
          <textarea
            id={`idea-${idea.id}`}
            defaultValue={idea.title}
            maxLength={500}
            rows={3}
            autoFocus
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                e.currentTarget.value = idea.title;
                setEditing(false);
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== idea.title) onRename(v);
              setEditing(false);
            }}
          />
        </>
      ) : (
        // Double-click (or Enter when focused) to edit; a single press is free to start a drag.
        <button
          className={s.ideaText}
          onDoubleClick={() => setEditing(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === "F2") && setEditing(true)}
          title="Double-click to edit"
        >
          {idea.title}
        </button>
      )}
      <div className={s.ideaTools}>
        {/* Keyboard path to the same moves; shown when it's tabbed to. */}
        <label className="sr-only" htmlFor={`to-${idea.id}`}>
          Make it a task in, or delete
        </label>
        <select
          id={`to-${idea.id}`}
          className={s.moveTo}
          value=""
          onChange={(e) => (e.target.value === "bin" ? onDelete() : e.target.value && onMove(e.target.value))}
        >
          <option value="">Move to…</option>
          {targets.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
          <option value="bin">Delete</option>
        </select>
      </div>
    </li>
  );
}
