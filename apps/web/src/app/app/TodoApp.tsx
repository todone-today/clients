"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Download, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAME } from "@/lib/brand";
import { authClient } from "@/lib/auth-client";
import { draggable, useDrop } from "@/lib/drag";
import { mapTask, refresh, reload, useLists } from "@/lib/store";
import { AiImport } from "./AiImport";
import { Brainstorm, ideaToTask } from "./Brainstorm";
import { CalendarView } from "./CalendarView";
import { Integrations } from "./Integrations";
import { Stickers, sticker } from "./Stickers";
import { Members, type Panel, Workspaces } from "./Workspaces";
import {
  type List,
  type Task,
  fmtMinutes,
  nestUnder,
  relDue,
  serialize,
  todayISO,
  uid,
  unnest,
  locate,
  putBack,
  type Spot,
} from "@/lib/tasks";
import s from "./app.module.css";

// Each main task is a sticky note; its colour comes from its id, so it stays put when tasks move.
const NOTES = ["var(--butter)", "var(--pink)", "var(--cyan)", "var(--lime)", "var(--peri)"];
const noteColor = (id: string) => NOTES[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % NOTES.length];
const findTask = (ts: Task[], id: string | null) => ts.flatMap((t) => [t, ...t.sub]).find((t) => t.id === id);

const count = (ts: Task[]) => {
  const all = ts.flatMap((t) => [t, ...t.sub]);
  return { open: all.filter((t) => !t.done).length, done: all.filter((t) => t.done).length, all: all.length };
};

export function TodoApp() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id;
  const { lists, error, update, add } = useLists();
  const [picked, setPicked] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const sorted = useMemo(() => (lists ?? []).filter((l) => !l.kind).sort((a, b) => b.updated - a.updated), [lists]);
  const list = sorted.find((l) => l.id === picked) ?? sorted[0];
  // Idea cards dropped on a list in the sidebar become tasks there.
  const dropOnList = useDrop("sidebar", {
    accept: (p) => p.kind === "idea",
    drop: (p, listId) => p.kind === "idea" && lists && ideaToTask(lists, p.id, listId, update),
  });
  const open = (id: string) => {
    setPicked(id);
    setPanel(null);
  };

  useEffect(() => {
    if (!isPending && !userId) router.replace("/login?next=/app");
  }, [isPending, userId, router]);
  useEffect(() => {
    if (!userId) return;
    // Back from connecting a service (e.g. Google's sign-in): show Integrations once lists are in.
    reload(!orgId).then(() => new URLSearchParams(location.search).has("connect") && setPanel("integrations"));
  }, [userId, orgId]);
  useEffect(() => {
    addEventListener("focus", refresh);
    return () => removeEventListener("focus", refresh);
  }, []);

  return (
    <div className={s.shell}>
      <header className={s.top}>
        <Link href="/" className={`display ${s.mark}`}>
          {NAME}
        </Link>
        <nav className={s.tabs} aria-label="Views">
          {(
            [
              [null, "Lists"],
              ["calendar", "Calendar"],
              ["ideas", "Brainstorm"],
            ] as const
          ).map(([p, name]) => (
            <button key={name} aria-pressed={panel === p} onClick={() => setPanel(p)}>
              {name}
            </button>
          ))}
        </nav>
        <p className={s.local} role="status">
          {error ? <span className={s.err}>{error}</span> : session?.user.email}
        </p>
        <ThemeToggle />
        <button
          className={s.ghost}
          onClick={async () => {
            await authClient.signOut();
            router.replace("/login");
          }}
        >
          <LogOut size={16} strokeWidth={2.5} /> Sign out
        </button>
      </header>

      <aside className={s.side} aria-label="Lists">
        <Workspaces
          orgId={orgId}
          panel={panel}
          onPanel={setPanel}
          onSwitch={() => {
            setPicked(null);
            setPanel(null);
          }}
        />
        <h2 className={s.sideHead}>Lists</h2>
        {lists && (
          <ul className={s.lists}>
            {sorted.map((l) => {
              const c = count(l.tasks);
              return (
                <li key={l.id}>
                  <button
                    className={s.listBtn}
                    aria-current={!panel && l.id === list?.id}
                    onClick={() => open(l.id)}
                    {...dropOnList(l.id)}
                  >
                    <span>{l.name}</span>
                    <span className={s.open}>{c.open}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={s.sideTools}>
          <NewList onAdd={(name) => open(add(name))} taken={(n) => !!lists?.some((l) => l.name === n)} />
          <AiImport
            lists={sorted}
            current={list?.id ?? null}
            onAdd={(name, tasks) => open(add(name, tasks))}
            onAppend={(id, tasks) => {
              update(id, (l) => ({ ...l, tasks: [...l.tasks, ...tasks] }));
              open(id);
            }}
          />
        </div>
      </aside>

      <main className={s.main} data-wide={panel === "calendar"}>
        {panel === "calendar" ? (
          lists && <CalendarView lists={lists.filter((l) => !l.kind)} update={update} onOpen={open} />
        ) : panel === "ideas" ? (
          lists && <Brainstorm lists={lists} add={add} update={update} />
        ) : panel === "members" && orgId ? (
          <Members key={orgId} />
        ) : panel === "integrations" ? (
          <Integrations key={orgId} />
        ) : !lists ? null : list ? (
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

function ListView({ list, update }: { list: List; update: (id: string, f: (l: List) => List | null) => void }) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [armed, setArmed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // A task card lands on a main task (becoming its subtask) or on "unnest" (becoming a main task again).
  // A sticker lands on any task. A task card lands on a main task (becoming its subtask) or on "unnest".
  const drop = useDrop(`list-${list.id}`, {
    accept: (p, arg) =>
      p.kind === "sticker"
        ? arg !== "unnest"
        : p.kind === "task" &&
          p.listId === list.id &&
          p.id !== arg &&
          (arg === "unnest" ? !list.tasks.some((t) => t.id === p.id) : list.tasks.some((t) => t.id === arg)),
    drop: (p, arg) => {
      if (p.kind === "sticker") {
        const patch = sticker(p.key, today);
        if (patch) setTasks((ts) => mapTask(ts, arg, (t) => ({ ...t, ...patch })));
      } else if (p.kind === "task") setTasks((ts) => (arg === "unnest" ? unnest(ts, p.id) : nestUnder(ts, p.id, arg)));
    },
  });
  const today = todayISO();
  const c = count(list.tasks);
  const setTasks = (f: (ts: Task[]) => Task[]) => update(list.id, (l) => ({ ...l, tasks: f(l.tasks) }));
  const [binned, setBinned] = useState<Spot | null>(null);
  const binDrop = useDrop(`bin-${list.id}`, {
    accept: (p) => p.kind === "task" && p.listId === list.id,
    drop: (p) => {
      if (p.kind !== "task") return;
      const spot = locate(list.tasks, p.id);
      if (!spot) return;
      setTasks((ts) => mapTask(ts, p.id, () => null));
      setBinned(spot);
    },
  });
  useEffect(() => {
    if (!binned) return;
    const t = setTimeout(() => setBinned(null), 10_000);
    return () => clearTimeout(t);
  }, [binned]);

  const exportMd = () => {
    const url = URL.createObjectURL(new Blob([serialize(list.tasks)], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${list.name}.md` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className={s.listHead}>
        {/* The bin: drop a task to delete it (with undo); click twice to delete the whole list. */}
        <button
          className={s.bin}
          data-armed={armed}
          {...binDrop("bin")}
          onClick={() => (armed ? update(list.id, () => null) : setArmed(true))}
          onBlur={() => setArmed(false)}
          aria-label={armed ? "Click again to delete this list" : "Delete list, or drop a task here to delete it"}
          title={armed ? "Click again to delete this list" : "Drop a task here to delete it. Click to delete the list."}
        >
          <Trash2 size={28} strokeWidth={2.5} />
          <span>{armed ? "Delete list?" : "Bin"}</span>
        </button>
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
        </div>
      </div>

      {binned && (
        <div className={s.undo} role="status">
          Deleted “{binned.task.title}”{binned.task.sub.length ? " and its subtasks" : ""}.
          <button
            className={s.ghost}
            onClick={() => {
              setTasks((ts) => putBack(ts, binned));
              setBinned(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      <div className={s.listBody}>
        <div>
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
                <TaskRow
                  key={t.id}
                  listId={list.id}
                  task={t}
                  today={today}
                  setTasks={setTasks}
                  selected={selected}
                  onSelect={setSelected}
                  drop={drop}
                  top
                />
              ))}
              {list.tasks.some((t) => t.sub.length) && (
                <li className={s.unnest} {...drop("unnest")}>
                  Drop a subtask here to make it a main task
                </li>
              )}
            </ul>
          ) : (
            <div className={s.empty}>
              <p className="display">Nothing here.</p>
              <p>Add the first task above. Enjoy the quiet while it lasts.</p>
            </div>
          )}
        </div>
        <Stickers
          selected={findTask(list.tasks, selected)?.title ?? null}
          onApply={(key, taskId = selected ?? "") => {
            const patch = sticker(key, today);
            if (taskId && patch) setTasks((ts) => mapTask(ts, taskId, (t) => ({ ...t, ...patch })));
          }}
        />
      </div>
    </>
  );
}

function TaskRow({
  listId,
  task,
  today,
  setTasks,
  selected,
  onSelect,
  drop,
  top = false,
}: {
  listId: string;
  task: Task;
  today: string;
  setTasks: (f: (ts: Task[]) => Task[]) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  drop: (arg: string) => object;
  top?: boolean;
}) {
  const [sub, setSub] = useState("");
  const open = selected === task.id;
  const edit = (f: (t: Task) => Task | null) => setTasks((ts) => mapTask(ts, task.id, f));
  const late = task.due && !task.done && task.due < today;

  return (
    <li
      className={top ? s.note : s.taskItem}
      data-open={open || undefined}
      style={top ? ({ "--fill": noteColor(task.id) } as React.CSSProperties) : undefined}
    >
      <div
        className={s.row}
        data-done={task.done}
        {...drop(task.id)}
        {...draggable({ kind: "task", listId, id: task.id }, task.title)}
      >
        <button
          className={s.check}
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.title}
          onClick={() => edit((t) => ({ ...t, done: !t.done }))}
        >
          {task.done && <Check size={16} strokeWidth={3.5} />}
        </button>
        <button className={s.taskTitle} onClick={() => onSelect(open ? null : task.id)} aria-expanded={open}>
          {task.title}
        </button>
        {/* Tasks start with no date or estimate; clicking a chip takes it off again. */}
        <span className={s.chips}>
          {task.est ? (
            <button
              className={s.chip}
              onClick={() => edit((t) => ({ ...t, est: undefined }))}
              aria-label={`Remove estimate ${fmtMinutes(task.est)}`}
              title="Remove estimate"
            >
              {fmtMinutes(task.est)}
            </button>
          ) : null}
          {task.spent ? <span title="Time spent in focus">⏳ {fmtMinutes(task.spent)}</span> : null}
          {task.due ? (
            <button
              className={`${s.chip} ${late ? s.late : s.due}`}
              onClick={() => edit((t) => ({ ...t, due: undefined, at: undefined }))}
              aria-label={`Remove date ${relDue(task.due, today)}`}
              title="Remove date"
            >
              {relDue(task.due, today)}
              {task.at ? ` ${task.at}` : ""}
            </button>
          ) : null}
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
            <span>Exact date</span>
            <input
              key={task.due}
              type="date"
              defaultValue={task.due ?? ""}
              onChange={(e) => edit((t) => ({ ...t, due: e.target.value || undefined }))}
            />
          </label>
          {top ? (
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
          ) : (
            <button className={`${s.ghost} ${s.subForm}`} onClick={() => setTasks((ts) => unnest(ts, task.id))}>
              Make it a main task
            </button>
          )}
          <div className={s.editorEnd}>
            <button className={`${s.ghost} ${s.danger}`} onClick={() => edit(() => null)}>
              <Trash2 size={16} strokeWidth={2.5} /> Delete{task.sub.length ? " with its subtasks" : ""}
            </button>
            <button className={s.ghost} onClick={() => onSelect(null)}>
              <X size={16} strokeWidth={2.5} /> Close
            </button>
          </div>
        </div>
      )}

      {task.sub.length > 0 && (
        <ul className={s.subs}>
          {task.sub.map((x) => (
            <TaskRow
              key={x.id}
              task={x}
              today={today}
              setTasks={setTasks}
              selected={selected}
              onSelect={onSelect}
              listId={listId}
              drop={drop}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
