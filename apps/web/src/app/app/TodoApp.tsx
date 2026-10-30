"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Download, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAME } from "@/lib/brand";
import { mapTask, useLists } from "@/lib/store";
import { type List, type Task, fmtMinutes, parse, parseMinutes, relDue, serialize, todayISO, uid } from "@/lib/tasks";
import s from "./app.module.css";

const count = (ts: Task[]) => {
  const all = ts.flatMap((t) => [t, ...t.sub]);
  return { open: all.filter((t) => !t.done).length, done: all.filter((t) => t.done).length, all: all.length };
};

export function TodoApp() {
  const { lists, update, add } = useLists();
  const [picked, setPicked] = useState<string | null>(null);
  const sorted = useMemo(() => [...(lists ?? [])].sort((a, b) => b.updated - a.updated), [lists]);
  const list = sorted.find((l) => l.id === picked) ?? sorted[0];

  return (
    <div className={s.shell}>
      <header className={s.top}>
        <Link href="/" className={`display ${s.mark}`}>
          {NAME}
        </Link>
        <p className={s.local}>Saved in this browser · cloud sync coming</p>
        <ThemeToggle />
      </header>

      <aside className={s.side} aria-label="Lists">
        <h2 className={s.sideHead}>Lists</h2>
        {lists && (
          <ul className={s.lists}>
            {sorted.map((l) => {
              const c = count(l.tasks);
              return (
                <li key={l.id}>
                  <button className={s.listBtn} aria-current={l.id === list?.id} onClick={() => setPicked(l.id)}>
                    <span>{l.name}</span>
                    <span className={s.open}>{c.open}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={s.sideTools}>
          <NewList onAdd={(name) => setPicked(add(name))} taken={(n) => !!lists?.some((l) => l.name === n)} />
          <ImportList onImport={(name, tasks) => setPicked(add(name, tasks))} />
        </div>
      </aside>

      <main className={s.main}>
        {!lists ? null : list ? (
          <ListView key={list.id} list={list} update={update} />
        ) : (
          <div className={s.empty}>
            <p className="display">No lists yet.</p>
            <p>Make one on the left: inbox, groceries, this week.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function NewList({ onAdd, taken }: { onAdd: (name: string) => void; taken: (name: string) => boolean }) {
  const [name, setName] = useState("");
  const clean = name.trim();
  const clash = clean !== "" && taken(clean);
  return (
    <form
      className={s.newList}
      onSubmit={(e) => {
        e.preventDefault();
        if (!clean || clash) return;
        onAdd(clean);
        setName("");
      }}
    >
      <label className="sr-only" htmlFor="new-list">
        New list
      </label>
      <input id="new-list" value={name} onChange={(e) => setName(e.target.value)} placeholder="New list" maxLength={60} />
      <button aria-label="Create list" disabled={!clean || clash}>
        <Plus size={18} strokeWidth={2.5} />
      </button>
      {clash && <p className={s.err}>There is already a list called “{clean}”.</p>}
    </form>
  );
}

function ImportList({ onImport }: { onImport: (name: string, tasks: Task[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  return (
    <div className={s.import}>
      <button className={s.ghost} onClick={() => input.current?.click()}>
        <Upload size={16} strokeWidth={2.5} /> Import<span className={s.long}> a Markdown list</span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const tasks = parse(await f.text());
          if (!tasks.length) return setErr(`No tasks found in ${f.name}. Tasks look like “- [ ] buy milk”.`);
          setErr("");
          onImport(f.name.replace(/\.(md|markdown|txt)$/i, ""), tasks);
        }}
      />
      {err && <p className={s.err}>{err}</p>}
    </div>
  );
}

function ListView({ list, update }: { list: List; update: (id: string, f: (l: List) => List | null) => void }) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [armed, setArmed] = useState(false);
  const today = todayISO();
  const c = count(list.tasks);
  const setTasks = (f: (ts: Task[]) => Task[]) => update(list.id, (l) => ({ ...l, tasks: f(l.tasks) }));

  const exportMd = () => {
    const url = URL.createObjectURL(new Blob([serialize(list.tasks)], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${list.name}.md` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className={s.listHead}>
        {renaming ? (
          <form
            className={s.rename}
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get("name")?.toString().trim();
              if (v) update(list.id, (l) => ({ ...l, name: v }));
              setRenaming(false);
            }}
          >
            <label className="sr-only" htmlFor="list-name">
              List name
            </label>
            <input id="list-name" name="name" defaultValue={list.name} autoFocus maxLength={60} className="display" />
            <button className="btn">Save</button>
            <button type="button" className={s.ghost} onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <h1 className={`display ${s.title}`}>{list.name}</h1>
        )}
        <p className={s.progress}>
          {c.all ? `${c.done} of ${c.all} done` : "Empty"}
          <span className={s.bar} aria-hidden>
            <i style={{ transform: `scaleX(${c.all ? c.done / c.all : 0})` }} />
          </span>
        </p>
        <div className={s.tools}>
          <button className={s.ghost} onClick={() => setRenaming(true)}>
            <Pencil size={16} strokeWidth={2.5} /> Rename
          </button>
          <button className={s.ghost} onClick={exportMd}>
            <Download size={16} strokeWidth={2.5} /> Export .md
          </button>
          <button
            className={`${s.ghost} ${armed ? s.danger : ""}`}
            onClick={() => (armed ? update(list.id, () => null) : setArmed(true))}
            onBlur={() => setArmed(false)}
          >
            <Trash2 size={16} strokeWidth={2.5} /> {armed ? "Click again to delete" : "Delete list"}
          </button>
        </div>
      </div>

      <form
        className={s.add}
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          setTasks((ts) => [...ts, { id: uid(), title: t, done: false, sub: [] }]);
          setDraft("");
        }}
      >
        <label className="sr-only" htmlFor="new-task">
          New task
        </label>
        <input
          id="new-task"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task, press enter"
          autoComplete="off"
        />
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!draft.trim()}>
          Add
        </button>
      </form>

      {list.tasks.length ? (
        <ul className={s.tasks}>
          {list.tasks.map((t) => (
            <TaskRow key={t.id} task={t} today={today} setTasks={setTasks} top />
          ))}
        </ul>
      ) : (
        <div className={s.empty}>
          <p className="display">Nothing here.</p>
          <p>Add the first task above. Enjoy the quiet while it lasts.</p>
        </div>
      )}
    </>
  );
}

function TaskRow({
  task,
  today,
  setTasks,
  top = false,
}: {
  task: Task;
  today: string;
  setTasks: (f: (ts: Task[]) => Task[]) => void;
  top?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState("");
  const [estErr, setEstErr] = useState(false);
  const edit = (f: (t: Task) => Task | null) => setTasks((ts) => mapTask(ts, task.id, f));
  const late = task.due && !task.done && task.due < today;

  return (
    <li className={s.taskItem}>
      <div className={s.row} data-done={task.done}>
        <button
          className={s.check}
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.title}
          onClick={() => edit((t) => ({ ...t, done: !t.done }))}
        >
          {task.done && <Check size={16} strokeWidth={3.5} />}
        </button>
        <button className={s.taskTitle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {task.title}
        </button>
        <span className={s.chips}>
          {task.est ? <span>{fmtMinutes(task.est)}</span> : null}
          {task.spent ? <span title="Time spent in focus">⏳ {fmtMinutes(task.spent)}</span> : null}
          {task.due ? <span className={late ? s.late : s.due}>{relDue(task.due, today)}</span> : null}
        </span>
      </div>

      {open && (
        <div className={s.editor}>
          <label>
            <span>Task</span>
            <input
              defaultValue={task.title}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== task.title) edit((t) => ({ ...t, title: v }));
              }}
            />
          </label>
          <label>
            <span>Due</span>
            <input
              type="date"
              defaultValue={task.due ?? ""}
              onChange={(e) => edit((t) => ({ ...t, due: e.target.value || undefined }))}
            />
          </label>
          <label>
            <span>Estimate</span>
            <input
              defaultValue={task.est ? fmtMinutes(task.est) : ""}
              placeholder="2h, 30m, 1h30m"
              aria-invalid={estErr}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const m = v ? parseMinutes(v) : 0;
                setEstErr(m === null);
                if (m !== null) edit((t) => ({ ...t, est: m || undefined }));
              }}
            />
            {estErr && <em className={s.err}>Try 2h, 30m or 1h30m.</em>}
          </label>
          {top && (
            <form
              className={s.subForm}
              onSubmit={(e) => {
                e.preventDefault();
                const v = sub.trim();
                if (!v) return;
                edit((t) => ({ ...t, sub: [...t.sub, { id: uid(), title: v, done: false, sub: [] }] }));
                setSub("");
              }}
            >
              <label>
                <span>Subtask</span>
                <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Add a step, press enter" />
              </label>
            </form>
          )}
          <div className={s.editorEnd}>
            <button className={`${s.ghost} ${s.danger}`} onClick={() => edit(() => null)}>
              <Trash2 size={16} strokeWidth={2.5} /> Delete{task.sub.length ? " with its subtasks" : ""}
            </button>
            <button className={s.ghost} onClick={() => setOpen(false)}>
              <X size={16} strokeWidth={2.5} /> Close
            </button>
          </div>
        </div>
      )}

      {task.sub.length > 0 && (
        <ul className={s.subs}>
          {task.sub.map((x) => (
            <TaskRow key={x.id} task={x} today={today} setTasks={setTasks} />
          ))}
        </ul>
      )}
    </li>
  );
}
