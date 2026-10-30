"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Welcome } from "@/components/Welcome";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Lightbulb, Check, Clock, LogOut, Plus, Timer, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { authClient } from "@/lib/auth-client";
import { SHOWS, SORTS, type Show, type Sort, board } from "@/lib/board";
import { type At, draggable, placeOn, useDrop } from "@/lib/drag";
import { mapTask, moveToList, refresh, reload, reorder, useLists } from "@/lib/store";
import { AiImport } from "./AiImport";
import { Brainstorm, ideaToTask } from "./Brainstorm";
import { CalendarView } from "./CalendarView";
import { Integrations } from "./Integrations";
import { shareCalendar } from "./integration-actions";
import { Stickers, sticker } from "./Stickers";
import { Members, type Panel, Workspaces } from "./Workspaces";
import {
  type List,
  type Task,
  fmtMinutes,
  lateBy,
  lateLabel,
  moveTasks,
  parseMinutes,
  relDue,
  todayISO,
  uid,
  takeTasks,
  unnest,
} from "@/lib/tasks";
import s from "./app.module.css";

// Each main task is a sticky note; its colour comes from its id, so it stays put when tasks move.
// Sticky colours. Each note in a list gets its own, ranked by id, so no two match until there are more
// notes than colours, and dragging notes around doesn't reshuffle them.
const NOTES = [
  "var(--butter)",
  "var(--pink)",
  "var(--cyan)",
  "var(--lime)",
  "var(--peri)",
  "var(--orange)",
  "#c9b3ff", // lavender
  "#8fe3b0", // mint
];
const noteColors = (tasks: Task[]) =>
  new Map(
    [...tasks]
      .map((t) => t.id)
      .sort()
      .map((id, i) => [id, NOTES[i % NOTES.length]]),
  );
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
  // Dragged lists keep their order; lists never dragged come first, newest first.
  const sorted = useMemo(
    () =>
      (lists ?? [])
        .filter((l) => !l.kind)
        .sort((a, b) =>
          a.position == null || b.position == null
            ? (a.position == null ? 0 : 1) - (b.position == null ? 0 : 1) || b.updated - a.updated
            : a.position - b.position,
        ),
    [lists],
  );
  const list = sorted.find((l) => l.id === picked) ?? sorted[0];
  // The sidebar's lists take ideas (they become tasks), tasks from another list (they move there),
  // and other lists (dropped above or below to reorder).
  const dropOnList = useDrop("sidebar", {
    accept: (p, listId) =>
      p.kind === "idea" || (p.kind === "task" && p.listId !== listId) || (p.kind === "list" && p.id !== listId),
    where: (p, _, at) => (p.kind === "list" ? placeOn(at, "y", false) : "inside"),
    drop: (p, listId, at) => {
      if (p.kind === "idea" && lists) ideaToTask(lists, p.id, listId, update);
      else if (p.kind === "task") moveToList(p.listId, listId, (ts) => takeTasks(ts, p.ids));
      else if (p.kind === "list") {
        const ids = sorted.map((l) => l.id).filter((id) => id !== p.id);
        ids.splice(ids.indexOf(listId) + (placeOn(at, "y", false) === "after" ? 1 : 0), 0, p.id);
        reorder(ids);
      }
    },
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
      <Welcome />
      <header className={s.top}>
        <Link href="/" className={s.mark} aria-label="todone home">
          <Logo size={26} />
        </Link>
        <nav className={s.tabs} aria-label="Views">
          {(
            [
              [null, "Lists"],
              ["calendar", "Calendar"],
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
        {/* Brainstorm lives above the lists: a place for loose ideas that isn't a list itself. */}
        <button className={`${s.listBtn} ${s.ideasBtn}`} aria-current={panel === "ideas"} onClick={() => setPanel("ideas")}>
          <span>
            <Lightbulb size={16} strokeWidth={2.5} aria-hidden /> Brainstorm
          </span>
          <span className={s.open}>{lists?.find((l) => l.kind === "ideas")?.tasks.length || ""}</span>
        </button>
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
                    {...draggable({ kind: "list", id: l.id }, l.name)}
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
          lists && <CalendarView lists={lists.filter((l) => !l.kind)} update={update} onOpen={open} share={shareCalendar} />
        ) : panel === "ideas" ? (
          lists && <Brainstorm lists={lists} add={add} update={update} />
        ) : panel === "members" && orgId ? (
          <Members key={orgId} />
        ) : panel === "integrations" ? (
          <Integrations key={orgId} />
        ) : !lists ? null : list ? (
          <ListView key={list.id} list={list} update={update} />
        ) : (
          // No lists yet: start in Brainstorm, where ideas can become the first tasks.
          <Brainstorm lists={lists} add={add} update={update} />
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

type Update = (id: string, f: (l: List) => List | null) => void;

const flatten = (ts: Task[]) => ts.flatMap((t) => [t, ...t.sub]);

function ListView({ list, update }: { list: List; update: Update }) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [armed, setArmed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null); // the task whose editor is open
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("mine");
  const [picked, setPicked] = useState<Set<string>>(new Set()); // Ctrl/Cmd-click selection
  const [binned, setBinned] = useState<{ before: Task[]; text: string } | null>(null);
  const today = todayISO();
  // The minute of the day, kept current so a task turns late when its time passes.
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  useEffect(() => {
    const t = setInterval(() => setNowMin(new Date().getHours() * 60 + new Date().getMinutes()), 30_000);
    return () => clearInterval(t);
  }, []);
  const c = count(list.tasks);
  const setTasks = (f: (ts: Task[]) => Task[]) => update(list.id, (l) => ({ ...l, tasks: f(l.tasks) }));
  const isTop = (id: string) => list.tasks.some((t) => t.id === id);
  const pick = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const applySticker = (key: string, ids: string[]) => {
    const patch = sticker(key, today);
    if (patch) setTasks((ts) => ids.reduce((acc, id) => mapTask(acc, id, (t) => ({ ...t, ...patch })), ts));
  };
  // Dropping a task: on a note's left or right edge puts it before or after; in the middle nests it.
  // Among subtasks, the top or bottom half puts it above or below.
  // While sorted, the screen isn't your order, so edges nest too instead of reordering.
  const place = (arg: string, at: At) =>
    !isTop(arg) ? placeOn(at, "y", false) : sort === "mine" ? placeOn(at, "x") : ("inside" as const);
  const drop = useDrop(`list-${list.id}`, {
    accept: (p, arg) =>
      p.kind === "sticker"
        ? arg !== "unnest"
        : p.kind === "task" &&
          p.listId === list.id &&
          !p.ids.includes(arg) &&
          (arg === "unnest" ? p.ids.some((id) => !isTop(id)) : !!findTask(list.tasks, arg)),
    where: (p, arg, at) => (p.kind === "task" && arg !== "unnest" ? place(arg, at) : "inside"),
    drop: (p, arg, at) => {
      if (p.kind === "sticker") applySticker(p.key, picked.has(arg) ? [...picked] : [arg]);
      else if (p.kind === "task") {
        setTasks((ts) =>
          arg === "unnest" ? p.ids.reduce((acc, id) => unnest(acc, id), ts) : moveTasks(ts, p.ids, arg, place(arg, at)),
        );
        setPicked(new Set());
      }
    },
  });
  // The bin takes tasks, or a date sticker: then every task due that day goes. Either way, undo puts the list back.
  const binDrop = useDrop(`bin-${list.id}`, {
    accept: (p) => (p.kind === "task" && p.listId === list.id) || (p.kind === "sticker" && !!sticker(p.key, today)?.due),
    drop: (p) => {
      const before = list.tasks;
      if (p.kind === "task") {
        const gone = flatten(before).filter((t) => p.ids.includes(t.id));
        setTasks((ts) => p.ids.reduce((acc, id) => mapTask(acc, id, () => null), ts));
        setBinned({ before, text: gone.length > 1 ? `Deleted ${gone.length} tasks.` : `Deleted “${gone[0]?.title}”.` });
        setPicked(new Set());
      } else if (p.kind === "sticker") {
        const due = sticker(p.key, today)!.due!;
        const gone = flatten(before).filter((t) => t.due === due);
        const day = relDue(due, today);
        if (!gone.length) return setBinned({ before, text: `Nothing is due ${day}.` });
        setTasks((ts) => gone.reduce((acc, t) => mapTask(acc, t.id, () => null), ts));
        setBinned({ before, text: `Deleted ${gone.length} task${gone.length === 1 ? "" : "s"} due ${day}.` });
      }
    },
  });
  useEffect(() => {
    if (!binned) return;
    const t = setTimeout(() => setBinned(null), 10_000);
    return () => clearTimeout(t);
  }, [binned]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPicked(new Set());
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);

  const colors = noteColors(list.tasks);
  const row = {
    listId: list.id,
    today,
    nowMin,
    setTasks,
    selected,
    onSelect: setSelected,
    picked,
    onPick: pick,
    drop,
    colors,
  };

  return (
    <>
      <div className={s.listHead}>
        {/* The bin: drop tasks (or a date sticker) to delete them, with undo; click twice to delete the whole list. */}
        <button
          className={s.bin}
          data-armed={armed}
          {...binDrop("bin")}
          onClick={() => (armed ? update(list.id, () => null) : setArmed(true))}
          onBlur={() => setArmed(false)}
          aria-label={armed ? "Click again to delete this list" : "Delete list, or drop tasks here to delete them"}
          title={armed ? "Click again to delete this list" : "Drop tasks here to delete them. Click to delete the list."}
        >
          <Trash2 size={28} strokeWidth={2.5} />
          <span>{armed ? "Delete list?" : "Bin"}</span>
        </button>
        {/* Click the name to rename; Enter or clicking away saves, Esc cancels. */}
        {renaming ? (
          <>
            <label className="sr-only" htmlFor="list-name">
              List name
            </label>
            <input
              id="list-name"
              defaultValue={list.name}
              autoFocus
              maxLength={60}
              className={`display ${s.title} ${s.titleEdit}`}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  e.currentTarget.value = list.name;
                  setRenaming(false);
                }
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== list.name) update(list.id, (l) => ({ ...l, name: v }));
                setRenaming(false);
              }}
            />
          </>
        ) : (
          <h1 className={`display ${s.title}`}>
            <button className={s.titleBtn} onClick={() => setRenaming(true)} title="Click to rename">
              {list.name}
            </button>
          </h1>
        )}
        <p className={s.progress}>
          {c.all ? `${c.done} of ${c.all} done` : "Empty"}
          <span className={s.bar} aria-hidden>
            <i style={{ transform: `scaleX(${c.all ? c.done / c.all : 0})` }} />
          </span>
        </p>
      </div>

      {binned && (
        <div className={s.undo} role="status">
          {binned.text}
          {binned.before !== list.tasks && (
            <button
              className={s.ghost}
              onClick={() => {
                setTasks(() => binned.before);
                setBinned(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
      {picked.size > 0 && (
        <div className={s.pickBar} role="status">
          <b>{picked.size} selected.</b> Drag them onto a sticker, the bin or another list, or click a sticker.
          <button className={s.ghost} onClick={() => setPicked(new Set())}>
            Clear <kbd>Esc</kbd>
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

          {list.tasks.length > 1 && (
            <div className={s.boardBar}>
              <div className={s.seg} role="group" aria-label="Show">
                {SHOWS.map(([k, name]) => (
                  <button key={k} aria-pressed={show === k} onClick={() => setShow(k)}>
                    {name}
                  </button>
                ))}
              </div>
              <label className={s.sortBy}>
                <span>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  {SORTS.map(([k, name]) => (
                    <option key={k} value={k}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {list.tasks.length ? (
            <ul className={s.tasks}>
              {board(list.tasks, show, sort, today, nowMin).map((t) => (
                <TaskRow key={t.id} task={t} {...row} top />
              ))}
              {!board(list.tasks, show, sort, today, nowMin).length && (
                <li className={s.noMatch}>
                  No tasks here.{" "}
                  <button className={s.link} onClick={() => setShow("all")}>
                    Show all
                  </button>
                </li>
              )}
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
          selected={
            picked.size > 1 ? `${picked.size} tasks` : (findTask(list.tasks, [...picked][0] ?? selected)?.title ?? null)
          }
          onApply={(key, taskIds) => applySticker(key, taskIds ?? (picked.size ? [...picked] : selected ? [selected] : []))}
        />
      </div>
    </>
  );
}

function TaskRow({
  listId,
  task,
  today,
  nowMin,
  setTasks,
  selected,
  onSelect,
  picked,
  onPick,
  drop,
  colors,
  top = false,
}: {
  listId: string;
  task: Task;
  today: string;
  nowMin: number;
  setTasks: (f: (ts: Task[]) => Task[]) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  picked: Set<string>;
  onPick: (id: string) => void;
  drop: (arg: string) => object;
  colors: Map<string, string>;
  top?: boolean;
}) {
  const open = selected === task.id;
  const edit = (f: (t: Task) => Task | null) => setTasks((ts) => mapTask(ts, task.id, f));
  const late = lateBy(task, today, nowMin);
  // Dragging a selected task carries the whole selection.
  const ids = picked.has(task.id) ? [...picked] : [task.id];
  const row = { listId, today, nowMin, setTasks, selected, onSelect, picked, onPick, drop, colors };

  return (
    <li
      className={top ? s.note : s.taskItem}
      data-open={open || undefined}
      style={top ? ({ "--fill": colors.get(task.id) } as React.CSSProperties) : undefined}
    >
      <div
        className={s.row}
        data-done={task.done}
        data-picked={picked.has(task.id) || undefined}
        {...drop(task.id)}
        {...draggable({ kind: "task", listId, id: task.id, ids }, ids.length > 1 ? `${ids.length} tasks` : task.title)}
        // Ctrl/Cmd-click selects instead of ticking or opening.
        onClickCapture={(e) => {
          if (!e.metaKey && !e.ctrlKey) return;
          e.preventDefault();
          e.stopPropagation();
          onPick(task.id);
        }}
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
              className={`${s.chip} ${late !== null ? s.late : s.due}`}
              onClick={() => edit((t) => ({ ...t, due: undefined, at: undefined }))}
              aria-label={`Remove date ${relDue(task.due, today)}`}
              title="Remove date"
            >
              {late !== null && late !== Infinity
                ? `${lateLabel(late)} · ${task.at}`
                : `${relDue(task.due, today)}${task.at ? ` ${task.at}` : ""}`}
            </button>
          ) : null}
        </span>
      </div>

      {open && <Editor task={task} top={top} edit={edit} setTasks={setTasks} onClose={() => onSelect(null)} />}

      {task.sub.length > 0 && (
        <ul className={s.subs}>
          {task.sub.map((x) => (
            <TaskRow key={x.id} task={x} {...row} />
          ))}
        </ul>
      )}
    </li>
  );
}

// Everything about one task in one place; changes save as you go. Esc or Done closes it.
function Editor({
  task,
  top,
  edit,
  setTasks,
  onClose,
}: {
  task: Task;
  top: boolean;
  edit: (f: (t: Task) => Task | null) => void;
  setTasks: (f: (ts: Task[]) => Task[]) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState("");
  const [estErr, setEstErr] = useState(false);
  return (
    <div
      className={s.editor}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        onClose();
      }}
    >
      <label className="sr-only" htmlFor={`title-${task.id}`}>
        Task name
      </label>
      <input
        id={`title-${task.id}`}
        className={s.edTitle}
        defaultValue={task.title}
        autoFocus
        maxLength={500}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== task.title) edit((t) => ({ ...t, title: v }));
        }}
      />
      <div className={s.edFields}>
        <label>
          <span>
            <CalendarDays size={14} strokeWidth={2.5} /> Day
          </span>
          <input
            key={task.due}
            type="date"
            defaultValue={task.due ?? ""}
            onChange={(e) =>
              edit((t) => ({ ...t, due: e.target.value || undefined, ...(e.target.value ? {} : { at: undefined }) }))
            }
          />
        </label>
        <label>
          <span>
            <Clock size={14} strokeWidth={2.5} /> Time
          </span>
          <input
            key={task.at}
            type="time"
            step={900}
            disabled={!task.due}
            title={task.due ? undefined : "Give it a day first"}
            defaultValue={task.at ?? ""}
            onChange={(e) => edit((t) => ({ ...t, at: e.target.value || undefined }))}
          />
        </label>
        <label>
          <span>
            <Timer size={14} strokeWidth={2.5} /> How long
          </span>
          <input
            key={task.est}
            defaultValue={task.est ? fmtMinutes(task.est) : ""}
            placeholder="45m, 1h30m"
            aria-invalid={estErr}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const m = v ? parseMinutes(v) : 0;
              setEstErr(m === null);
              if (m !== null && m !== (task.est ?? 0)) edit((t) => ({ ...t, est: m || undefined }));
            }}
          />
        </label>
      </div>
      {top ? (
        <form
          className={s.edStep}
          onSubmit={(e) => {
            e.preventDefault();
            const v = step.trim();
            if (!v) return;
            edit((t) => ({ ...t, sub: [...t.sub, { id: uid(), title: v, done: false, sub: [] }] }));
            setStep("");
          }}
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          <label className="sr-only" htmlFor={`step-${task.id}`}>
            Add a step
          </label>
          <input
            id={`step-${task.id}`}
            value={step}
            onChange={(e) => setStep(e.target.value)}
            placeholder="Add a step, press enter"
            autoComplete="off"
          />
        </form>
      ) : (
        <button className={s.ghost} onClick={() => setTasks((ts) => unnest(ts, task.id))}>
          Make it a main task
        </button>
      )}
      {estErr && <p className={s.err}>How long reads like 30m, 2h or 1h30m.</p>}
      <div className={s.edEnd}>
        <button className={`${s.ghost} ${s.danger}`} onClick={() => edit(() => null)}>
          <Trash2 size={16} strokeWidth={2.5} /> Delete{task.sub.length ? " with steps" : ""}
        </button>
        <span className={s.open}>Saves as you go</span>
        <button className="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
