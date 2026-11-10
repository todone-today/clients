"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Gift,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  balance,
  goalProgress,
  logGoal,
  type Goal,
  type GoalItem,
  type Reward,
  type Win,
} from "@todone/sdk/goals";
import { type List, type Task, todayISO, uid } from "@todone/sdk/tasks";
import { Select } from "@/components/Select";
import { Confetti } from "@/components/Confetti";
import { authClient } from "@/lib/auth-client";
import { useLists } from "@/lib/store";
import { changeGoals, moveGoalItem, useGoalItems } from "./goalStore";
import { draggable, placeOn, useDrop } from "@/lib/drag";
import s from "./app.module.css";

const FILLS = [
  "var(--butter)",
  "var(--pink)",
  "var(--cyan)",
  "var(--lime)",
  "var(--peri)",
  "#c9b3ff",
  "#8fe3b0",
];
const fillFor = (id: string) =>
  FILLS[
    ([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0) %
      FILLS.length
  ];
const kindLabel = (g: Goal) =>
  g.kind === "habit"
    ? `${g.perWeek ?? 1}× a week`
    : g.kind === "target"
      ? `Reach ${g.target ?? "?"}${g.unit ? ` ${g.unit}` : ""}`
      : g.kind === "daily"
        ? `${g.target ?? "?"}${g.unit ? ` ${g.unit}` : ""} a day`
        : "Milestones";
const daysLeft = (by: string) =>
  Math.round((+new Date(by) - +new Date(todayISO())) / 86_400_000);
export const useMe = () => authClient.useSession().data?.user.id;

// A habit is a repeating task. Repeats can't pick days of the week, so "N times a week" takes the nearest rule;
// it can be changed in the task's panel. The goal counts the weeks either way.
export const habitRule = (perWeek = 3) =>
  perWeek >= 6
    ? "every day"
    : perWeek === 5
      ? "every weekday"
      : perWeek >= 3
        ? "every 2 days"
        : perWeek === 2
          ? "every 3 days"
          : "every week";
const goalTask = (g: Goal, title: string, habit: boolean): Task => ({
  id: uid(),
  title,
  done: false,
  sub: [],
  goal: g.id,
  ...(habit ? { rep: habitRule(g.perWeek), due: todayISO() } : {}),
});

// A new or edited goal, and any first steps it came with as tasks (a habit's one step repeats).
// Clicks on a card's own controls don't open its editor.
const onControl = (e: React.MouseEvent) =>
  !!(e.target as HTMLElement).closest(
    "button, input, select, textarea, a, form, details, [role=combobox]",
  );
function saveGoal(
  lists: List[] | null,
  update: (id: string, f: (l: List) => List | null) => void,
  g: Goal,
  steps: string[],
  listId: string | null,
) {
  changeGoals(lists, (xs) =>
    xs.some((x) => x.id === g.id)
      ? xs.map((x) => (x.id === g.id ? g : x))
      : [...xs, g],
  );
  if (steps.length && listId)
    update(listId, (l) => ({
      ...l,
      tasks: [
        ...l.tasks,
        ...(g.kind === "habit"
          ? [goalTask(g, steps[0], true)]
          : steps.map((title) => goalTask(g, title, false))),
      ],
    }));
}

// A list's goals, at the top of the list: a sticky note each, with how it's going and a quick log.
export function ListGoals({ list }: { list: List }) {
  const { lists, update } = useLists();
  const { items } = useGoalItems();
  const [making, setMaking] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  // Drop tasks on a goal's note to link them to it: they become its milestones (or count toward the habit).
  const dropOnGoal = useDrop("goal-notes", {
    accept: (p) => p.kind === "task",
    drop: (p, goalId) => {
      if (p.kind !== "task") return;
      const ids = new Set(p.ids);
      const link = (t: Task): Task => ({
        ...(ids.has(t.id) ? { ...t, goal: goalId } : t),
        sub: t.sub.map(link),
      });
      update(p.listId, (l) => ({ ...l, tasks: l.tasks.map(link) }));
    },
  });
  const all = (lists ?? []).filter((l) => !l.kind);
  const tasks = all.flatMap((l) => l.tasks);
  const goals = items.filter(
    (i): i is Goal => i.t === "goal" && i.list === list.id && !i.done,
  );
  return (
    <div className={s.listGoals}>
      {goals.map((g) => {
        const p = goalProgress(g, tasks, items);
        return (
          <div
            key={g.id}
            className={s.listGoal}
            {...dropOnGoal(g.id)}
            onClick={(e) => !onControl(e) && setEditing(g)}
            title="Click to edit"
            style={{ "--fill": fillFor(g.id) } as React.CSSProperties}
          >
            <header>
              <Target size={14} strokeWidth={2.75} aria-hidden />
              <b>{g.title}</b>
              <span className={s.goalKind}>{kindLabel(g)}</span>
            </header>
            <Meter goal={g} p={p} compact />
            <LogBox goal={g} p={p} />
          </div>
        );
      })}
      <button className={s.listGoalAdd} onClick={() => setMaking(true)}>
        <Plus size={15} strokeWidth={2.75} aria-hidden />{" "}
        {goals.length ? "Goal" : "Add a goal"}
      </button>
      {editing && (
        <GoalDialog
          lists={all}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(g, steps, listId) => {
            saveGoal(lists, update, g, steps, listId);
            setEditing(null);
          }}
        />
      )}
      {making && (
        <GoalDialog
          lists={all}
          list={list.id}
          onClose={() => setMaking(false)}
          onSave={(g, steps, listId) => {
            saveGoal(lists, update, g, steps, listId);
            setMaking(false);
          }}
        />
      )}
    </div>
  );
}

// Goals: why each one matters, how it's going, the next step, and the if-then plan. Outcome goals have milestones
// (their linked tasks); habits count the weeks you showed up. Nothing here ever "fails".
export function Goals({ onOpen }: { onOpen: (listId: string) => void }) {
  const { lists, update } = useLists();
  const { items } = useGoalItems();
  const [making, setMaking] = useState(false);
  const goals = items.filter((i): i is Goal => i.t === "goal");
  // Drag a goal onto another to put it before or after it.
  const dropGoal = useDrop("goals", {
    accept: (p, id) => p.kind === "goal" && p.id !== id,
    where: (_, __, at) => placeOn(at, "x", false),
    drop: (p, id, at) =>
      p.kind === "goal" &&
      moveGoalItem(lists, p.id, id, placeOn(at, "x", false)),
  });
  const dnd = (g: Goal) => ({
    ...draggable({ kind: "goal", id: g.id }, g.title),
    ...dropGoal(g.id),
  });
  const open = goals.filter((g) => !g.done);
  const achieved = goals.filter((g) => g.done);
  const all = (lists ?? []).filter((l) => !l.kind);
  const tasks = all.flatMap((l) => l.tasks);
  // Goals under their lists (in the sidebar's order), then those kept with none.
  const groups = [
    ...all.map((l) => ({
      id: l.id,
      name: l.name,
      goals: open.filter((g) => g.list === l.id),
    })),
    {
      id: "",
      name: "No list",
      goals: open.filter((g) => !all.some((l) => l.id === g.list)),
    },
  ].filter((x) => x.goals.length);
  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Goals</h1>
        <p className={s.progress}>
          {open.length
            ? `${open.length} going, ${achieved.length} achieved`
            : "Something worth working toward."}
        </p>
        <div className={s.tools}>
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() => setMaking(true)}
          >
            <Plus size={16} strokeWidth={2.75} aria-hidden /> New goal
          </button>
        </div>
      </div>
      {groups.map(({ id, name, goals }) => (
        <section key={id} className={s.goalGroup}>
          {groups.length > 1 && (
            <h2 className={s.sideHead}>
              {id ? (
                <button className={s.goalGroupHead} onClick={() => onOpen(id)}>
                  {name}
                </button>
              ) : (
                name
              )}
            </h2>
          )}
          <ul className={s.goalGrid}>
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                dnd={dnd(g)}
                goal={g}
                items={items}
                tasks={tasks}
                lists={all}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      ))}
      {achieved.length > 0 && (
        <>
          <h2 className={s.sideHead}>Achieved</h2>
          <ul className={s.goalGrid}>
            {achieved.map((g) => (
              <GoalCard
                key={g.id}
                dnd={dnd(g)}
                goal={g}
                items={items}
                tasks={tasks}
                lists={all}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </>
      )}
      {making && (
        <GoalDialog
          lists={all}
          onClose={() => setMaking(false)}
          onSave={(g, steps, listId) => {
            saveGoal(lists, update, g, steps, listId);
            setMaking(false);
          }}
        />
      )}
    </>
  );
}

function GoalCard({
  goal,
  items,
  tasks,
  lists,
  onOpen,
  dnd,
}: {
  goal: Goal;
  items: GoalItem[];
  tasks: List["tasks"];
  lists: List[];
  onOpen: (listId: string) => void;
  dnd: object;
}) {
  const { lists: all, update } = useLists();
  const [reflecting, setReflecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const p = goalProgress(goal, tasks, items);
  const set = (f: (g: Goal) => Goal | null) =>
    changeGoals(all, (xs) =>
      xs.flatMap((x) =>
        x.t === "goal" && x.id === goal.id ? (f(x) ?? []) : [x],
      ),
    );
  const nextList =
    p.next &&
    lists.find((l) =>
      l.tasks.some(
        (t) => t.id === p.next!.id || t.sub.some((x) => x.id === p.next!.id),
      ),
    );
  return (
    <li
      {...dnd}
      onClick={(e) => !onControl(e) && setEditing(true)}
      title="Click to edit"
      className={s.goal}
      style={{ "--fill": fillFor(goal.id) } as React.CSSProperties}
      data-done={goal.done ? "" : undefined}
    >
      <header>
        <Target size={18} strokeWidth={2.5} aria-hidden />
        <h3>{goal.title}</h3>
        <span className={s.goalKind}>{kindLabel(goal)}</span>
      </header>
      {goal.why && <p className={s.goalWhy}>{goal.why}</p>}
      {goal.become && <p className={s.goalBecome}>Becoming: {goal.become}</p>}

      <Meter goal={goal} p={p} />
      {!goal.done && <LogBox goal={goal} p={p} />}

      {p.next && !goal.done && (
        <button
          className={s.goalNext}
          onClick={() => nextList && onOpen(nextList.id)}
          title="Open its list"
        >
          Next: <b>{p.next.title}</b>
        </button>
      )}
      {goal.kind === "habit" && !p.next && lists[0] && (
        <button
          className={`btn ${s.claim}`}
          style={{ "--fill": "#fff" } as React.CSSProperties}
          onClick={() => {
            update(lists[0].id, (l) => ({
              ...l,
              tasks: [...l.tasks, goalTask(goal, goal.title, true)],
            }));
            onOpen(lists[0].id);
          }}
          title={`Adds “${goal.title}” to ${lists[0].name}, repeating ${habitRule(goal.perWeek)}`}
        >
          Make it a repeating task
        </button>
      )}
      {!p.total && !goal.done && goal.kind === "outcome" && (
        <p className={s.goalHint}>
          Link tasks to this goal from a task&apos;s panel (Goal field).
        </p>
      )}
      {goal.plan && (
        <p className={s.goalPlan}>
          {goal.obstacle ? `If ${goal.obstacle.replace(/^if\s+/i, "")} → ` : ""}
          {goal.plan}
        </p>
      )}
      {goal.done && goal.reflection && (
        <p className={s.goalWhy}>What helped: {goal.reflection}</p>
      )}

      <footer>
        {goal.kind === "outcome" && !goal.done && (
          <button
            className={`btn ${s.claim}`}
            style={{ "--fill": "#fff" } as React.CSSProperties}
            onClick={() => setReflecting(true)}
          >
            <Check size={15} strokeWidth={2.75} aria-hidden /> Achieved
          </button>
        )}
        {goal.done && (
          <button
            className={`btn ${s.claim}`}
            style={{ "--fill": "#fff" } as React.CSSProperties}
            onClick={() => set((g) => ({ ...g, done: undefined }))}
          >
            Not yet
          </button>
        )}
        <button
          className={s.rewardX}
          onClick={() => set(() => null)}
          aria-label={`Delete goal ${goal.title}`}
        >
          <Trash2 size={15} strokeWidth={2.5} aria-hidden />
        </button>
      </footer>
      {editing && (
        <GoalDialog
          lists={lists}
          initial={goal}
          onClose={() => setEditing(false)}
          onSave={(g, steps, listId) => {
            saveGoal(all, update, g, steps, listId);
            setEditing(false);
          }}
        />
      )}
      {reflecting && (
        <Reflect
          title={goal.title}
          onCancel={() => setReflecting(false)}
          onDone={(reflection) => {
            set((g) => ({
              ...g,
              done: Date.now(),
              ...(reflection ? { reflection } : {}),
            }));
            setReflecting(false);
          }}
        />
      )}
    </li>
  );
}

type Progress = ReturnType<typeof goalProgress>;
const fmt = (n: number) => String(Math.round(n * 10) / 10);

// How a goal is going, the way its kind measures it.
function Meter({
  goal,
  p,
  compact,
}: {
  goal: Goal;
  p: Progress;
  compact?: boolean;
}) {
  const left = goal.by ? daysLeft(goal.by) : null;
  const unit = goal.unit ? ` ${goal.unit}` : "";
  if (goal.kind === "target")
    return (
      <div className={s.goalMeter}>
        <span className={s.bar} aria-hidden>
          <i style={{ transform: `scaleX(${p.towards})` }} />
        </span>
        <b>
          {p.current === undefined
            ? "Log where you are"
            : `${fmt(p.current)}${unit} now`}
          {goal.target !== undefined && ` · goal ${fmt(goal.target)}${unit}`}
        </b>
        {goal.start !== undefined &&
          goal.target !== undefined &&
          p.current !== undefined && (
            <small>
              {p.towards >= 1
                ? "You're there."
                : `${fmt(Math.abs(goal.target - p.current))}${unit} to go, from ${fmt(goal.start)}${unit}`}
            </small>
          )}
      </div>
    );
  if (goal.kind === "daily") {
    const passed = ((new Date().getDay() + 6) % 7) + 1;
    return (
      <div className={s.goalMeter}>
        <span className={s.bar} aria-hidden>
          <i
            style={{
              transform: `scaleX(${goal.target ? Math.min(1, p.today / goal.target) : 0})`,
            }}
          />
        </span>
        <b>
          {fmt(p.today)} of {fmt(goal.target ?? 0)}
          {unit} today
        </b>
        <small>
          Hit on {p.daysHit} of {passed} day{passed === 1 ? "" : "s"} this week
        </small>
      </div>
    );
  }
  // In a list's strip, a habit is just this week's count, as a bar.
  if (compact && goal.kind === "habit")
    return (
      <div className={s.goalMeter}>
        <span className={s.bar} aria-hidden>
          <i
            style={{
              transform: `scaleX(${Math.min(1, p.thisWeek / (goal.perWeek ?? 1))})`,
            }}
          />
        </span>
        <b>
          {p.thisWeek} of {goal.perWeek ?? 1} this week
        </b>
      </div>
    );
  return goal.kind === "outcome" ? (
    <div className={s.goalMeter}>
      <span className={s.bar} aria-hidden>
        <i style={{ transform: `scaleX(${p.total ? p.done / p.total : 0})` }} />
      </span>
      <b>
        {p.done} of {p.total} milestones
      </b>
      {!goal.done && left !== null && (
        <small>
          {left > 1
            ? `${left} days left`
            : left === 1
              ? "Due tomorrow"
              : left === 0
                ? "Due today"
                : "Past the date: still worth it"}
        </small>
      )}
    </div>
  ) : (
    <div
      className={s.goalWeeks}
      aria-label={`${p.thisWeek} of ${goal.perWeek ?? 1} this week`}
    >
      {p.weeks.map((w, i) => (
        <span
          key={w.week}
          title={`Week of ${w.week}: ${w.n}`}
          data-now={i === p.weeks.length - 1 || undefined}
        >
          <i
            style={{
              height: `${Math.min(1, w.n / (goal.perWeek ?? 1)) * 100}%`,
            }}
          />
        </span>
      ))}
      <b>
        {p.thisWeek} of {goal.perWeek ?? 1} this week
      </b>
      {p.thisWeek === 0 && <small>Fresh week. One small one counts.</small>}
    </div>
  );
}

// Logging toward a goal right where it shows: a number (target), an amount (daily) or a check-in (habit).
export function LogBox({ goal, p }: { goal: Goal; p: Progress }) {
  const { lists } = useLists();
  const me = useMe();
  const [v, setV] = useState("");
  const log = (value: number) =>
    changeGoals(lists, (xs) =>
      logGoal(xs, goal, value, Date.now(), () => uid() + uid(), me),
    );
  if (goal.kind === "habit") {
    const today = todayISO();
    const done = p.logs.some(
      (l) => new Date(l.at).toLocaleDateString("en-CA") === today,
    );
    return (
      <button
        className={`btn ${s.claim} ${s.logBtn}`}
        style={
          { "--fill": done ? "#fff" : "var(--lime)" } as React.CSSProperties
        }
        disabled={done}
        onClick={() => log(1)}
      >
        <Check size={15} strokeWidth={3} aria-hidden />{" "}
        {done ? "Done today" : "Did it today"}
      </button>
    );
  }
  if (goal.kind === "outcome") return null;
  const n = Number(v.replace(",", "."));
  return (
    <form
      className={s.logBox}
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim() || !Number.isFinite(n)) return;
        log(n);
        setV("");
      }}
    >
      <input
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={
          goal.kind === "target"
            ? `Today's ${goal.unit || "number"}`
            : `+ ${goal.unit || "amount"}`
        }
        aria-label={
          goal.kind === "target" ? `Log ${goal.title}` : `Add to ${goal.title}`
        }
      />
      <button
        className={`btn ${s.claim}`}
        style={{ "--fill": "var(--lime)" } as React.CSSProperties}
        disabled={!v.trim() || !Number.isFinite(n)}
      >
        {goal.kind === "target" ? "Log" : "Add"}
      </button>
    </form>
  );
}

function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.goalDialog}
      aria-label={label}
      onClose={onClose}
    >
      <button
        className={s.panelClose}
        onClick={() => ref.current?.close()}
        aria-label="Close"
      >
        <X size={18} strokeWidth={2.75} />
      </button>
      {children}
    </dialog>
  );
}

// Finishing an outcome goal: celebrate, then one question, because remembering what worked builds the next one.
function Reflect({
  title,
  onDone,
  onCancel,
}: {
  title: string;
  onDone: (r: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <Modal label="Goal achieved" onClose={onCancel}>
      <Confetti />
      <p className={s.goalCheer}>
        <Sparkles size={22} strokeWidth={2.5} aria-hidden /> You did it
      </p>
      <h2 className="display">{title}</h2>
      <label className={s.goalField}>
        <span>What helped? What would you change next time?</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={3}
          autoFocus
        />
      </label>
      <div className={s.tools}>
        <button
          className="btn"
          style={{ "--fill": "var(--lime)" } as React.CSSProperties}
          onClick={() => onDone(text.trim())}
        >
          Mark achieved
        </button>
      </div>
    </Modal>
  );
}

// A new goal in four short steps (only the first is needed): the wish, why, the obstacle and plan, first steps.
export function GoalDialog({
  lists,
  list,
  initial,
  onClose,
  onSave,
}: {
  lists: List[];
  list?: string;
  initial?: Goal; // editing this goal rather than making one
  onClose: () => void;
  onSave: (g: Goal, steps: string[], listId: string | null) => void;
}) {
  const [step, setStep] = useState(0);
  const editing = !!initial;
  const [g, setG] = useState<Goal>(
    () =>
      initial ?? {
        t: "goal",
        id: uid(),
        title: "",
        kind: "target",
        created: Date.now(),
        ...(list ? { list } : {}),
      },
  );
  const [steps, setSteps] = useState(["", "", ""]);
  const [listId, setListId] = useState(
    initial?.list ?? list ?? lists[0]?.id ?? "",
  );
  const putNum =
    (k: "start" | "target") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.replace(",", ".");
      setG((x) => ({
        ...x,
        [k]: v === "" || !Number.isFinite(+v) ? undefined : +v,
      }));
    };
  const put =
    (k: keyof Goal) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setG((x) => ({ ...x, [k]: e.target.value || undefined }));
  const ready =
    !!g.title.trim() &&
    ((g.kind !== "target" && g.kind !== "daily") || g.target !== undefined);
  const titles = [
    "What do you want?",
    "Why does it matter?",
    "What could get in the way?",
    "First steps",
  ];
  const save = () =>
    onSave(
      {
        ...g,
        title: g.title.trim(),
        // Only the fields this kind uses.
        by: g.kind === "outcome" ? g.by : undefined,
        perWeek: g.kind === "habit" ? (g.perWeek ?? 3) : undefined,
        unit:
          g.kind === "target" || g.kind === "daily"
            ? g.unit?.trim() || undefined
            : undefined,
        start: g.kind === "target" ? g.start : undefined,
        target:
          g.kind === "target" || g.kind === "daily" ? g.target : undefined,
      },
      steps.map((x) => x.trim()).filter(Boolean),
      listId || null,
    );
  return (
    <Modal label={editing ? "Edit goal" : "New goal"} onClose={onClose}>
      <p className={s.goalStep}>
        {editing ? "Edit goal · " : ""}Step {step + 1} of 4
        {step > 0 && " · optional"}
      </p>
      <h2 className="display">{titles[step]}</h2>
      <form
        className={s.goalForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          if (step < 3 && !editing) setStep(step + 1);
          else save();
        }}
      >
        {step === 0 && (
          <>
            <label className={s.goalField}>
              <span>The goal</span>
              <input
                value={g.title}
                onChange={(e) => setG((x) => ({ ...x, title: e.target.value }))}
                maxLength={120}
                placeholder="Run a 5K, ship the app, read 12 books…"
                autoFocus
                required
              />
            </label>
            <div
              className={s.goalKinds}
              role="radiogroup"
              aria-label="Kind of goal"
            >
              {(
                [
                  ["target", "Reach a number", "Weigh 68 kg, save ₹50,000"],
                  ["habit", "Show up", "Gym 5× a week, read most days"],
                  [
                    "daily",
                    "A daily amount",
                    "140 g protein, 8 glasses of water",
                  ],
                  [
                    "outcome",
                    "Get somewhere",
                    "Ship the app: milestones by a date",
                  ],
                ] as const
              ).map(([k, name, hint]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={g.kind === k}
                  onClick={() => setG((x) => ({ ...x, kind: k }))}
                >
                  <b>{name}</b>
                  <small>{hint}</small>
                </button>
              ))}
            </div>
            {g.kind === "target" ? (
              <div className={s.goalNums}>
                <label className={s.goalField}>
                  <span>Unit</span>
                  <input
                    value={g.unit ?? ""}
                    onChange={put("unit")}
                    maxLength={20}
                    placeholder="kg"
                  />
                </label>
                <label className={s.goalField}>
                  <span>Where you are</span>
                  <input
                    inputMode="decimal"
                    value={g.start ?? ""}
                    onChange={putNum("start")}
                    placeholder="74"
                  />
                </label>
                <label className={s.goalField}>
                  <span>The goal</span>
                  <input
                    inputMode="decimal"
                    value={g.target ?? ""}
                    onChange={putNum("target")}
                    placeholder="68"
                    required
                  />
                </label>
              </div>
            ) : g.kind === "daily" ? (
              <div className={s.goalNums}>
                <label className={s.goalField}>
                  <span>A day</span>
                  <input
                    inputMode="decimal"
                    value={g.target ?? ""}
                    onChange={putNum("target")}
                    placeholder="140"
                    required
                  />
                </label>
                <label className={s.goalField}>
                  <span>Unit</span>
                  <input
                    value={g.unit ?? ""}
                    onChange={put("unit")}
                    maxLength={20}
                    placeholder="g"
                  />
                </label>
              </div>
            ) : g.kind === "outcome" ? (
              <label className={s.goalField}>
                <span>By when (optional)</span>
                <input
                  type="date"
                  value={g.by ?? ""}
                  min={todayISO()}
                  onChange={put("by")}
                />
              </label>
            ) : (
              <div className={s.goalField}>
                <span>How often</span>
                <Select
                  label="Times a week"
                  value={String(g.perWeek ?? 3)}
                  options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                    value: String(n),
                    label: n === 7 ? "Every day" : `${n}× a week`,
                  }))}
                  onChange={(v) => setG((x) => ({ ...x, perWeek: +v }))}
                />
              </div>
            )}
            {lists.length > 0 && (
              <div className={s.goalField}>
                <span>Part of which list</span>
                <Select
                  label="List"
                  value={g.list ?? ""}
                  options={[
                    { value: "", label: "No list" },
                    ...lists.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                  onChange={(v) => {
                    setG((x) => ({ ...x, list: v || undefined }));
                    if (v) setListId(v);
                  }}
                />
              </div>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <label className={s.goalField}>
              <span>Why it matters to you</span>
              <textarea
                value={g.why ?? ""}
                onChange={put("why")}
                maxLength={1000}
                rows={3}
                autoFocus
                placeholder="So I have energy for my kids…"
              />
            </label>
            <label className={s.goalField}>
              <span>Who you want to become</span>
              <input
                value={g.become ?? ""}
                onChange={put("become")}
                maxLength={300}
                placeholder="Someone who finishes what they start"
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className={s.goalField}>
              <span>What could get in the way</span>
              <input
                value={g.obstacle ?? ""}
                onChange={put("obstacle")}
                maxLength={500}
                autoFocus
                placeholder="I'm too tired after work"
              />
            </label>
            <label className={s.goalField}>
              <span>Then I&apos;ll…</span>
              <input
                value={g.plan ?? ""}
                onChange={put("plan")}
                maxLength={500}
                placeholder="do the 10-minute version"
              />
            </label>
            <p className={s.goalHint}>
              Deciding now what you&apos;ll do then makes it far more likely you
              will.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <p className={s.goalHint}>
              {g.kind === "habit"
                ? `This becomes a task that repeats ${habitRule(g.perWeek ?? 3)}; change how often in its panel. Keep it small enough to do on a bad day.`
                : "Make the first one tiny: something you could do in 5 minutes."}
            </p>
            {(g.kind === "habit" ? steps.slice(0, 1) : steps).map((v, i) => (
              <input
                key={i}
                className={s.goalStepInput}
                value={v}
                maxLength={500}
                autoFocus={i === 0}
                placeholder={
                  g.kind === "habit"
                    ? g.title || "Go to the gym"
                    : ["Put on running shoes", "Walk 10 minutes", "Run 1 km"][i]
                }
                aria-label={g.kind === "habit" ? "The habit" : `Step ${i + 1}`}
                onChange={(e) =>
                  setSteps((xs) =>
                    xs.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
            ))}
            {lists.length > 0 && (
              <div className={s.goalField}>
                <span>Add them to</span>
                <Select
                  label="List"
                  value={listId}
                  options={lists.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={setListId}
                />
              </div>
            )}
          </>
        )}
        <div className={s.tools}>
          {step > 0 && (
            <button
              type="button"
              className={s.ghost}
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          {editing && step < 3 && (
            <button
              type="button"
              className={s.ghost}
              onClick={() => setStep(step + 1)}
            >
              Next: {titles[step + 1].toLowerCase()}
            </button>
          )}
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            disabled={!ready}
          >
            {editing ? "Save" : step < 3 ? "Next" : "Save goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Rewards you set for yourself, bought with the XP your finished tasks earn. In a team, each person has their own XP.
// Starting points for a first reward, priced in "tasks like yours".
const IDEAS = [
  ["Cheat meal", 10],
  ["20 min of Instagram", 3],
  ["Movie night", 10],
  ["A new book", 30],
] as const;

export function Rewards() {
  const { lists } = useLists();
  const { items } = useGoalItems();
  const me = useMe();
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("100");
  const [claimed, setClaimed] = useState("");
  const xp = balance(items, me);
  const mine = items
    .filter((i): i is Win => i.t === "win" && (i.by ?? undefined) === me)
    .sort((a, b) => b.at - a.at);
  const [week] = useState(() => Date.now() - 7 * 86_400_000);
  const thisWeek = mine
    .filter((w) => !w.spend && w.at > week)
    .reduce((n, w) => n + w.xp, 0);
  const rewards = items.filter((i): i is Reward => i.t === "reward");
  // For pricing a reward: what one of your tasks usually earns, and what you earn in a day lately.
  const earned = mine.filter((w) => !w.spend).slice(0, 30);
  const perTask = earned.length
    ? Math.round(earned.reduce((n, w) => n + w.xp, 0) / earned.length)
    : 15;
  const price = Math.round(+cost);
  const dropReward = useDrop("rewards", {
    accept: (p, id) => p.kind === "reward" && p.id !== id,
    where: (_, __, at) => placeOn(at, "x", false),
    drop: (p, id, at) =>
      p.kind === "reward" &&
      moveGoalItem(lists, p.id, id, placeOn(at, "x", false)),
  });
  const claim = (r: Reward) => {
    changeGoals(lists, (xs) =>
      balance(xs, me) < r.cost
        ? xs
        : [
            ...xs,
            {
              t: "win",
              id: uid() + uid(),
              title: r.title,
              at: Date.now(),
              xp: -r.cost,
              spend: true,
              ...(me ? { by: me } : {}),
            },
          ],
    );
    setClaimed(r.title);
    setTimeout(() => setClaimed(""), 2500);
  };
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const ready = rewards.filter((r) => xp >= r.cost);
  const saving = rewards.filter((r) => xp < r.cost);
  const card = (r: Reward) => (
    <li
      key={r.id}
      {...draggable({ kind: "reward", id: r.id }, r.title)}
      {...dropReward(r.id)}
      onClick={(e) => !onControl(e) && setEditingReward(r)}
      title="Click to edit"
      className={s.reward}
      style={{ "--fill": fillFor(r.id) } as React.CSSProperties}
    >
      <header>
        <Gift size={18} strokeWidth={2.5} aria-hidden />
        <h3>{r.title}</h3>
        <span className={s.goalKind}>
          <Zap size={11} strokeWidth={2.75} aria-hidden /> {r.cost}
        </span>
      </header>
      {xp < r.cost && (
        <div className={s.goalMeter}>
          <span className={s.bar} aria-hidden>
            <i
              style={{
                transform: `scaleX(${Math.min(1, Math.max(0, xp) / r.cost)})`,
              }}
            />
          </span>
          <small>
            {r.cost - xp} XP to go · about{" "}
            {Math.max(1, Math.ceil((r.cost - xp) / perTask))} task
            {Math.ceil((r.cost - xp) / perTask) === 1 ? "" : "s"}
          </small>
        </div>
      )}
      <footer>
        {xp >= r.cost && (
          <button
            className={`btn ${s.claim}`}
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() => claim(r)}
          >
            <Gift size={15} strokeWidth={2.5} aria-hidden /> Claim
          </button>
        )}
        <button
          className={s.rewardX}
          aria-label={`Delete reward ${r.title}`}
          onClick={() =>
            changeGoals(lists, (xs) => xs.filter((x) => x.id !== r.id))
          }
        >
          <Trash2 size={15} strokeWidth={2.5} aria-hidden />
        </button>
      </footer>
    </li>
  );
  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Rewards</h1>
        <div className={s.xpNotes}>
          <p style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
            <small>
              <Zap size={13} strokeWidth={2.75} aria-hidden /> To spend
            </small>
            <span>
              <b>{xp}</b> XP
            </span>
          </p>
          <p style={{ "--fill": "var(--cyan)" } as React.CSSProperties}>
            <small>This week</small>
            <span>
              <b>+{thisWeek}</b> earned
            </span>
          </p>
        </div>
      </div>
      {claimed && <Confetti key={claimed} />}
      {claimed && (
        <p className={s.goalCheer} role="status">
          <Gift size={20} strokeWidth={2.5} aria-hidden /> Enjoy: {claimed}. You
          earned it.
        </p>
      )}
      {editingReward && (
        <RewardDialog
          reward={editingReward}
          perTask={perTask}
          onClose={() => setEditingReward(null)}
          onSave={(r) => {
            changeGoals(lists, (xs) => xs.map((x) => (x.id === r.id ? r : x)));
            setEditingReward(null);
          }}
          onDelete={() => {
            changeGoals(lists, (xs) =>
              xs.filter((x) => x.id !== editingReward.id),
            );
            setEditingReward(null);
          }}
        />
      )}
      <div className={s.rewardsPage}>
        <div>
          {!rewards.length && (
            <div className={s.rewardStart}>
              <p>
                <b>What would feel like a treat?</b> Pick one to start, then
                finish tasks to earn it.
              </p>
              <div className={s.priceChips}>
                {IDEAS.map(([idea, n]) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      setTitle(idea);
                      setCost(String(perTask * n));
                    }}
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
          {ready.length > 0 && (
            <>
              <h2 className={s.sideHead}>Ready to claim</h2>
              <ul className={s.rewardGrid}>{ready.map(card)}</ul>
            </>
          )}
          {saving.length > 0 && (
            <>
              <h2 className={s.sideHead}>Saving up for</h2>
              <ul className={s.rewardGrid}>{saving.map(card)}</ul>
            </>
          )}
        </div>
        <aside className={s.rewardSide}>
          <section className={s.rewardNew}>
            <h2 className={s.sideHead}>New reward</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const c = Math.round(+cost);
                if (!title.trim() || !(c >= 1 && c <= 100_000)) return;
                changeGoals(lists, (xs) => [
                  ...xs,
                  {
                    t: "reward",
                    id: uid() + uid(),
                    title: title.trim(),
                    cost: c,
                  },
                ]);
                setTitle("");
              }}
            >
              <label className={s.goalField}>
                <span>A reward</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Cheat meal, 20 min Instagram…"
                />
              </label>
              <label className={s.goalField}>
                <span>Costs (XP)</span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </label>
              <div className={s.priceChips} role="group" aria-label="Sizes">
                {(
                  [
                    ["Small", 3],
                    ["Medium", 10],
                    ["Big", 30],
                  ] as const
                ).map(([name, n]) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={price === perTask * n}
                    onClick={() => setCost(String(perTask * n))}
                  >
                    {name} · {perTask * n}
                  </button>
                ))}
              </div>
              {price >= 1 && (
                <p className={s.priceHint} role="status">
                  About <b>{Math.max(1, Math.round(price / perTask))}</b> task
                  {Math.round(price / perTask) === 1 ? "" : "s"}
                  {thisWeek > 0 &&
                    ` · about ${Math.max(1, Math.ceil(price / (thisWeek / 7)))} day${Math.ceil(price / (thisWeek / 7)) === 1 ? "" : "s"} at this week's pace`}
                  {earned.length
                    ? `, at ${perTask} XP a task, your average.`
                    : ", at about 15 XP a task."}
                </p>
              )}
              <details className={s.priceHow}>
                <summary>How a task earns XP</summary>
                <ul>
                  <li>
                    <b>5</b> for finishing it
                  </li>
                  <li>
                    <b>+1</b> every 5 minutes it&apos;s estimated to take (up to
                    4 h)
                  </li>
                  <li>
                    <b>+3</b> S, <b>+6</b> M, <b>+10</b> L, <b>+15</b> XL effort
                  </li>
                  <li>
                    <b>+6</b> high priority, <b>+3</b> medium
                  </li>
                  <li>
                    <b>+4</b> done on or before its day
                  </li>
                  <li>
                    <b>+2</b> a step (up to 10)
                  </li>
                  <li>
                    <b>+5</b> toward a goal
                  </li>
                </ul>
              </details>
              <button
                className="btn"
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                disabled={!title.trim()}
              >
                <Plus size={16} strokeWidth={2.75} aria-hidden /> Add reward
              </button>
            </form>
          </section>
          {mine.length > 0 && (
            <section>
              <h2 className={s.sideHead}>Recent</h2>
              <ol className={s.wins}>
                {mine.slice(0, 5).map((w) => (
                  <li key={w.id} data-spend={w.spend || undefined}>
                    <span>{w.spend ? `Claimed ${w.title}` : w.title}</span>
                    <time>
                      {new Date(w.at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    <b>
                      {w.xp > 0 ? "+" : ""}
                      {w.xp}
                    </b>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

// Editing a reward: its name and price, in tasks like yours.
function RewardDialog({
  reward,
  perTask,
  onClose,
  onSave,
  onDelete,
}: {
  reward: Reward;
  perTask: number;
  onClose: () => void;
  onSave: (r: Reward) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(reward.title);
  const [cost, setCost] = useState(String(reward.cost));
  const c = Math.round(+cost);
  const ok = !!title.trim() && c >= 1 && c <= 100_000;
  return (
    <Modal label="Edit reward" onClose={onClose}>
      <p className={s.goalStep}>Edit reward</p>
      <h2 className="display">{title.trim() || reward.title}</h2>
      <form
        className={s.goalForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSave({ ...reward, title: title.trim(), cost: c });
        }}
      >
        <label className={s.goalField}>
          <span>The reward</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
          />
        </label>
        <label className={s.goalField}>
          <span>Costs (XP)</span>
          <input
            type="number"
            min={1}
            max={100000}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        {c >= 1 && (
          <p className={s.goalHint}>
            About {Math.max(1, Math.round(c / perTask))} task
            {Math.round(c / perTask) === 1 ? "" : "s"} like yours.
          </p>
        )}
        <div className={s.tools}>
          <button
            type="button"
            className={`${s.ghost} ${s.danger}`}
            onClick={onDelete}
          >
            <Trash2 size={15} strokeWidth={2.5} aria-hidden /> Delete
          </button>
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            disabled={!ok}
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// The XP tile in the top bar: your balance, with a "+18" that floats up when you earn some.
export function XpTile({ onClick }: { onClick: () => void }) {
  const { items } = useGoalItems();
  const me = useMe();
  const xp = balance(items, me);
  const prev = useRef<number | null>(null);
  const [pop, setPop] = useState<{ n: number; k: number } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = xp;
    if (before !== null && xp > before) {
      Promise.resolve().then(() => setPop({ n: xp - before, k: Date.now() }));
      const t = setTimeout(() => setPop(null), 1400);
      return () => clearTimeout(t);
    }
  }, [xp]);
  return (
    <button
      className={`${s.tile} ${s.xpTile}`}
      style={{ "--fill": "var(--lime)" } as React.CSSProperties}
      onClick={onClick}
      aria-label={`${xp} XP: rewards`}
      data-tip="Your XP: spend it on rewards"
    >
      <Zap size={15} strokeWidth={2.75} aria-hidden />
      <span>{xp}</span>
      {pop && (
        <b key={pop.k} className={s.xpPop} aria-hidden>
          +{pop.n}
        </b>
      )}
    </button>
  );
}

