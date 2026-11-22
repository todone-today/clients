"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Droplet,
  Flag,
  Gift,
  Plus,
  Repeat,
  Share2,
  Sparkles,
  Target,
  Timer,
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
import { toBin, useLists } from "@/lib/store";
import { binSound } from "@/lib/sound";
import { changeGoals, moveGoalItem, useGoalItems } from "./goalStore";
import { draggable, placeOn, useDrop } from "@/lib/drag";
import { ListIcon, listColor } from "./listIcon";
import { type Suggested, suggest, suggested } from "@/lib/onboard";
import { Tip } from "./Tip";
import { GoalTemplates, RewardTemplates } from "./Templates";
import { AskBar } from "./AskBar";
import { ShareSheet } from "./ShareSheet";
import type { CardSpec } from "./shareCard";
import { recap } from "@/lib/recap";
import { GOAL_TEMPLATES, REWARD_TEMPLATES, asGoal } from "@/lib/templates";
import s from "./app.module.css";

const FILLS = [
  "var(--butter)",
  "var(--pink)",
  "var(--cyan)",
  "var(--lime)",
  "var(--peri)",
  "#ffbe86",
  "#00afb9",
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
      ? `Reach ${g.target ?? "?"}${g.unit ? ` ${g.unit}` : ""}${g.by ? ` by ${shortDay(g.by)}` : ""}`
      : g.kind === "daily"
        ? `${g.target ?? "?"}${g.unit ? ` ${g.unit}` : ""} a day`
        : "Milestones";
const shortDay = (iso: string) =>
  new Date(`${iso}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
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
  const me = useMe();
  const [making, setMaking] = useState<boolean | Partial<Goal>>(false);
  const [picking, setPicking] = useState(false);
  const [logging, setLogging] = useState<string | null>(null); // the goal whose log box is open
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
        const unit = g.unit ? ` ${g.unit}` : "";
        // How far along, as a fraction and a few words, the way its kind counts.
        const [frac, count] =
          g.kind === "target"
            ? [p.towards, `${p.current ?? "–"}/${g.target ?? "?"}${unit}`]
            : g.kind === "daily"
              ? [g.target ? p.today / g.target : 0, `${p.today}/${g.target ?? "?"}${unit} today`]
              : g.kind === "habit"
                ? [p.thisWeek / (g.perWeek ?? 1), `${p.thisWeek}/${g.perWeek ?? 1} this week`]
                : [p.total ? p.done / p.total : 0, `${p.done}/${p.total} steps`];
        const today = todayISO();
        const checked = g.kind === "habit" && p.logs.some((l) => new Date(l.at).toLocaleDateString("en-CA") === today);
        return (
          // One line per goal: tap it to open it; the + logs (a habit: checks in for today).
          <div key={g.id} className={s.goalPillBox}>
            <div
              className={s.goalPill}
              {...dropOnGoal(g.id)}
              onClick={(e) => !onControl(e) && setEditing(g)}
              data-tip={`${g.title}: tap to open`}
              style={{ "--fill": fillFor(g.id) } as React.CSSProperties}
            >
              <Target size={14} strokeWidth={2.75} aria-hidden />
              <b>{g.title}</b>
              <span className={s.goalPillBar} aria-hidden>
                <i style={{ transform: `scaleX(${Math.min(1, Math.max(0, frac))})` }} />
              </span>
              <small>{count}</small>
              {g.kind === "habit" ? (
                <button
                  className={s.goalPillLog}
                  disabled={checked}
                  aria-label={checked ? "Done today" : `Did ${g.title} today`}
                  data-tip={checked ? "Done today" : "Did it today"}
                  onClick={() => changeGoals(lists, (xs) => logGoal(xs, g, 1, Date.now(), () => uid() + uid(), me))}
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              ) : g.kind !== "outcome" ? (
                <button
                  className={s.goalPillLog}
                  aria-expanded={logging === g.id}
                  aria-label={`Log ${g.title}`}
                  data-tip="Log"
                  onClick={() => setLogging(logging === g.id ? null : g.id)}
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              ) : null}
            </div>
            {logging === g.id && (
              <div className={s.goalPillPop}>
                <LogBox goal={g} p={p} />
              </div>
            )}
          </div>
        );
      })}
      <button className={s.listGoalAdd} onClick={() => setPicking(true)}>
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
      {picking && (
        <GoalTemplates
          taken={goals.map((g) => g.title)}
          onPick={(t) => {
            setPicking(false);
            setMaking(asGoal(t));
          }}
          onOwn={() => {
            setPicking(false);
            setMaking(true);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {making && (
        <GoalDialog
          lists={all}
          list={list.id}
          preset={making === true ? undefined : making}
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
export function Goals({ onOpen, ai }: { onOpen: (listId: string) => void; ai: boolean }) {
  const { lists, update } = useLists();
  const { items } = useGoalItems();
  // `true` for a blank goal, or a suggestion to start from.
  const [making, setMaking] = useState<boolean | Partial<Goal>>(false);
  const [picking, setPicking] = useState(false); // the templates, before the dialog
  const [recapping, setRecapping] = useState(false); // this week's recap card
  const me = useMe();
  const goals = items.filter((i): i is Goal => i.t === "goal");
  // Drag a goal onto another to put it before or after it.
  const dropGoal = useDrop("goals", {
    accept: (p, id) => p.kind === "goal" && p.id !== id,
    where: (_, __, at) => placeOn(at, "x", false),
    drop: (p, id, at) =>
      p.kind === "goal" &&
      moveGoalItem(lists, p.id, id, placeOn(at, "x", false)),
  });
  // Drop a goal on the Bin to delete it, like its own delete button: a goal with tasks asks first (on its card)
  // what happens to them; one without just goes.
  const [binning, setBinning] = useState<string | null>(null);
  const binDrop = useDrop("goals-bin", {
    accept: (p) => p.kind === "goal",
    drop: (p) => {
      if (p.kind !== "goal") return;
      const linked = (t: Task) => t.goal === p.id;
      if (tasks.some((t) => linked(t) || t.sub.some(linked))) return setBinning(p.id);
      changeGoals(lists, (xs) => xs.filter((x) => !(x.t === "goal" && x.id === p.id)));
      binSound();
    },
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
      <Tip k="goals" title="Goals keep you going">
        <p>
          A goal is one thing that matters to you. Link it to a list and the tasks you tick there count towards it.
        </p>
        <ol className={s.goalHow}>
          <li>
            <b>Pick one thing.</b> Say why it matters, and what you&apos;ll do when it gets hard.
          </li>
          <li>
            <b>Log tiny wins.</b> A tap a day. A quiet week never resets anything.
          </li>
          <li>
            <b>Treat yourself.</b> Every finished task earns XP; spend it on rewards you choose.
          </li>
        </ol>
        <Drafts kind="goals" onPick={(g) => setMaking(g)} />
      </Tip>
      <div className={s.listHead}>
        {goals.length > 0 && (
          <div className={s.bin} data-bin {...binDrop("bin")} data-tip="Bin: drop a goal here" data-tip-end>
            <Trash2 size={28} strokeWidth={2.5} aria-hidden />
            <span>Bin</span>
          </div>
        )}
        <h1 className={`display ${s.title}`}>Goals</h1>
        <p className={s.progress}>
          {open.length
            ? `${open.length} going${achieved.length ? `, ${achieved.length} achieved` : ""}. One small step today counts.`
            : "Pick one thing. Small steps, every one counted."}
        </p>
        <div className={s.tools}>
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() => setPicking(true)}
          >
            <Plus size={16} strokeWidth={2.75} aria-hidden /> New goal
          </button>
          <button className={s.ghost} onClick={() => setRecapping(true)}>
            <Share2 size={15} strokeWidth={2.5} aria-hidden /> My week
          </button>
        </div>
      </div>
      {!goals.length && <GoalStart onPick={(p) => setMaking(p)} onBrowse={() => setPicking(true)} />}
      {groups.map(({ id, name, goals }) => (
        <section key={id} className={s.goalGroup}>
          {groups.length > 1 && (
            <h2 className={s.goalGroupTitle}>
              {id ? (
                // The list, as a sticker in its own colour and icon (like the sidebar): click to open it.
                <button
                  className={`sticker ${s.goalGroupHead}`}
                  style={{ "--fill": listColor(id) } as React.CSSProperties}
                  onClick={() => onOpen(id)}
                  data-tip={`Open ${name}`}
                >
                  <ListIcon id={id} name={name} icon={all.find((l) => l.id === id)?.icon} /> {name}
                </button>
              ) : (
                <span className={s.sideHead}>{name}</span>
              )}
            </h2>
          )}
          <ul className={s.goalGrid}>
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                dnd={dnd(g)}
                binned={binning === g.id}
                onBinned={() => setBinning(null)}
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
                binned={binning === g.id}
                onBinned={() => setBinning(null)}
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
      {recapping && (
        <ShareSheet
          spec={{
            kind: "recap",
            r: recap(
              items.filter((i): i is Win => i.t === "win" && (i.by ?? undefined) === me),
              new Date(),
            ),
          }}
          name="My week"
          onClose={() => setRecapping(false)}
        />
      )}
      {/* The bar: name a goal (the dialog opens to finish it), or ask todone to suggest some. */}
      <AskBar place="goals" ai={ai} onAdd={(title) => setMaking({ title })} />
      {picking && (
        <GoalTemplates
          taken={goals.map((g) => g.title)}
          onPick={(t) => {
            setPicking(false);
            setMaking(asGoal(t));
          }}
          onOwn={() => {
            setPicking(false);
            setMaking(true);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {making && (
        <GoalDialog
          lists={all}
          preset={making === true ? undefined : making}
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

// No goals yet: one-tap starting points (one of each kind), and how it works in three steps. A goal you can start
// in a tap is a goal you start; the dialog still lets you change everything.
const STARTERS: { goal: Partial<Goal>; note: string; fill: string }[] = [
  { goal: { title: "Read most days", kind: "habit", perWeek: 5 }, note: "A habit · 5× a week", fill: "var(--lime)" },
  { goal: { title: "Drink 8 glasses of water", kind: "daily", target: 8, unit: "glasses" }, note: "A daily amount", fill: "var(--cyan)" },
  { goal: { title: "Save ₹50,000", kind: "target", start: 0, target: 50000, unit: "₹" }, note: "A number to reach", fill: "var(--butter)" },
  { goal: { title: "Ship my side project", kind: "outcome" }, note: "Milestones, by a date", fill: "var(--pink)" },
];
// Then every template, by area of life (Templates.tsx).
function GoalStart({ onPick, onBrowse }: { onPick: (g: Partial<Goal>) => void; onBrowse: () => void }) {
  return (
    <section className={s.goalStart}>
      <h2 className="display">Start with one.</h2>
      <ul className={s.starters}>
        {STARTERS.map(({ goal, note, fill }) => (
          <li key={goal.title}>
            <button type="button" onClick={() => onPick(goal)} style={{ "--fill": fill } as React.CSSProperties}>
              <b>{goal.title}</b>
              <small>{note}</small>
              <span className={s.starterGo}>
                <Plus size={14} strokeWidth={3} aria-hidden /> Make it mine
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button className={`btn ${s.tplBrowse}`} onClick={onBrowse}>
        See all {GOAL_TEMPLATES.length} goal ideas, from health to money to travel
      </button>
    </section>
  );
}

function GoalCard({
  goal,
  items,
  tasks,
  lists,
  onOpen,
  dnd,
  binned,
  onBinned,
}: {
  binned: boolean; // dropped on the Bin
  onBinned: () => void;
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
  const [deleting, setDeleting] = useState(false); // asking what happens to its tasks
  const [sharing, setSharing] = useState<CardSpec | null>(null);
  const p = goalProgress(goal, tasks, items);
  // Its tasks (a repeating one made from it, or ones linked to it), by list.
  const mine = (t: Task) => t.goal === goal.id;
  const withTasks = lists.filter((l) => l.tasks.some((t) => mine(t) || t.sub.some(mine)));
  const taskCount = withTasks.flatMap((l) => l.tasks.flatMap((t) => [t, ...t.sub])).filter(mine).length;
  // Deletes the goal; its tasks go to the bin (`drop`), or stay, no longer linked.
  const remove = (drop: boolean) => {
    onBinned();
    for (const l of withTasks) {
      if (drop) toBin(l.tasks.filter(mine), l);
      update(l.id, (x) => ({
        ...x,
        tasks: x.tasks.flatMap((t) =>
          drop && mine(t)
            ? []
            : [
                {
                  ...(mine(t) ? { ...t, goal: undefined } : t),
                  sub: t.sub.flatMap((u) => (!mine(u) ? [u] : drop ? [] : [{ ...u, goal: undefined }])),
                },
              ],
        ),
      }));
    }
    set(() => null);
  };
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
      <LogHistory goal={goal} p={p} />

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
        <button
          className={s.goalShare}
          onClick={() => setSharing(goalCard(goal, p))}
          aria-label={`Share ${goal.title}`}
          data-tip="Show it off"
        >
          <Share2 size={15} strokeWidth={2.5} aria-hidden />
        </button>
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
        {deleting || binned ? (
          <div className={s.goalAsk} role="group" aria-label={`Delete ${goal.title}`}>
            <span>
              Also delete its {taskCount === 1 ? "task" : `${taskCount} tasks`}?
            </span>
            <button className="btn" style={{ "--fill": "var(--hot)" } as React.CSSProperties} onClick={() => remove(true)}>
              Delete {taskCount === 1 ? "it" : "them"} too
            </button>
            <button className="btn" onClick={() => remove(false)}>
              Keep {taskCount === 1 ? "it" : "them"}
            </button>
            <button
              className={s.ghost}
              onClick={() => {
                setDeleting(false);
                onBinned();
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className={s.rewardX}
            onClick={() => (taskCount ? setDeleting(true) : remove(false))}
            aria-label={`Delete goal ${goal.title}`}
          >
            <Trash2 size={15} strokeWidth={2.5} aria-hidden />
          </button>
        )}
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
            // Reached: the moment to show it off.
            setSharing(goalCard({ ...goal, done: Date.now() }, p));
          }}
        />
      )}
      {sharing && <ShareSheet spec={sharing} name={goal.title} onClose={() => setSharing(null)} />}
    </li>
  );
}

// A goal as a share card: reached, a "done" card with the weeks it took as a grid; still going, its progress the way
// its kind counts it.
function goalCard(goal: Goal, p: Progress): CardSpec {
  const fill = fillFor(goal.id);
  const unit = goal.unit ? ` ${goal.unit}` : "";
  const active = p.weeks.filter((w) => w.n > 0).length;
  if (goal.done)
    return {
      kind: "win",
      eyebrow: "Goal reached",
      title: goal.title,
      line: `${active} active week${active === 1 ? "" : "s"}${p.total ? ` · ${p.done} of ${p.total} steps` : ""}`,
      grid: p.weeks.map((w) => w.n),
      fill,
    };
  if (goal.kind === "target")
    return {
      kind: "progress",
      title: goal.title,
      big: `${Math.round(p.towards * 100)}%`,
      label: `of the way to ${fmt(goal.target ?? 0)}${unit}`,
      frac: p.towards,
      sub: `${p.current === undefined ? "Just started" : `${fmt(p.current)}${unit} now`}${goal.by ? ` · by ${shortDay(goal.by)}` : ""}`,
      fill,
      overlay: false,
    };
  if (goal.kind === "daily")
    return {
      kind: "progress",
      title: goal.title,
      big: fmt(p.today),
      label: `${goal.unit || "done"} today`,
      frac: goal.target ? p.today / goal.target : 0,
      sub: `Every day: ${fmt(goal.target ?? 0)}${unit} · hit ${p.daysHit} day${p.daysHit === 1 ? "" : "s"} this week`,
      fill,
      overlay: false,
    };
  if (goal.kind === "habit")
    return {
      kind: "progress",
      title: goal.title,
      big: `${p.thisWeek}/${goal.perWeek ?? 1}`,
      label: "this week",
      frac: p.thisWeek / (goal.perWeek ?? 1),
      sub: `Showed up ${active} of the last ${p.weeks.length} weeks`,
      fill,
      overlay: false,
    };
  return {
    kind: "progress",
    title: goal.title,
    big: `${p.done}/${p.total}`,
    label: "steps done",
    frac: p.total ? p.done / p.total : 0,
    sub: goal.by ? `By ${shortDay(goal.by)}` : "One step at a time",
    fill,
    overlay: false,
  };
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
        {left !== null && p.towards < 1 && (
          <small>
            {left < 0
              ? "Past the date: still worth it"
              : left === 0
                ? "Due today"
                : `${left === 1 ? "Due tomorrow" : `${left} days left`}${
                    goal.target !== undefined && p.current !== undefined
                      ? left >= 14
                        ? ` · about ${fmt(Math.abs(goal.target - p.current) / (left / 7))}${unit} a week`
                        : ` · about ${fmt(Math.abs(goal.target - p.current) / left)}${unit} a day`
                      : ""
                  }`}
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

// Everything logged toward a goal, newest first, folded away until asked for; × removes an entry logged by mistake
// (its XP stays: logging pays once a day, so a re-log that day earns nothing new).
function LogHistory({ goal, p }: { goal: Goal; p: Progress }) {
  const { lists } = useLists();
  const [count, setCount] = useState(PAGE);
  if (goal.kind === "outcome" || !p.logs.length) return null;
  const logs = [...p.logs].reverse();
  const unit = goal.unit ? ` ${goal.unit}` : "";
  const what = (v: number) => (goal.kind === "habit" ? "Checked in" : goal.kind === "daily" ? `+${v}${unit}` : `${v}${unit}`);
  const when = (t: number) =>
    new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const drop = (id: string) => changeGoals(lists, (xs) => xs.filter((x) => x.id !== id));
  return (
    <details className={s.logHist}>
      <summary>History ({logs.length})</summary>
      <ol>
        {logs.slice(0, count).map((l) => (
          <li key={l.id}>
            <time dateTime={new Date(l.at).toISOString()}>{when(l.at)}</time>
            <b>{what(l.value)}</b>
            <button onClick={() => drop(l.id)} aria-label={`Remove ${what(l.value)} from ${when(l.at)}`} data-tip="Remove">
              <X size={13} strokeWidth={3} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      {logs.length > count && (
        <button className={s.ghost} onClick={() => setCount((n) => n + 10)}>
          Show {Math.min(10, logs.length - count)} more
        </button>
      )}
    </details>
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

// A goal on one page: what you want and how it's measured, read as a sentence, with a live preview of the card it
// makes; Save is ready as soon as that's there. Then three optional parts, folded until wanted: why it matters, the
// if-then plan for when it gets hard, and first steps. Wanting to think it through? A short timer holds the space.
const KINDS = [
  ["target", "Reach a number", "68 kg, ₹50,000", Target],
  ["habit", "Show up", "Gym 3× a week", Repeat],
  ["daily", "A daily amount", "8 glasses a day", Droplet],
  ["outcome", "Get somewhere", "Milestones, by a date", Flag],
] as const;
export function GoalDialog({
  lists,
  list,
  initial,
  preset,
  onClose,
  onSave,
}: {
  lists: List[];
  list?: string;
  initial?: Goal; // editing this goal rather than making one
  preset?: Partial<Goal>; // a new goal started from a template or the bar
  onClose: () => void;
  onSave: (g: Goal, steps: string[], listId: string | null) => void;
}) {
  const editing = !!initial;
  const [g, setG] = useState<Goal>(
    () =>
      initial ?? {
        t: "goal",
        id: uid(),
        title: "",
        kind: "habit",
        perWeek: 3,
        created: Date.now(),
        ...(list ? { list } : {}),
        ...preset,
      },
  );
  const [steps, setSteps] = useState(["", "", ""]);
  // Which optional parts are open: any that already say something, when editing.
  const [open, setOpen] = useState(() => ({
    why: !!(initial?.why || initial?.become),
    plan: !!(initial?.obstacle || initial?.plan),
    steps: false,
  }));
  const [think, setThink] = useState<number | null>(null); // seconds of thinking time left
  useEffect(() => {
    if (!think) return;
    const t = setTimeout(() => setThink((n) => (n ? n - 1 : n)), 1000);
    return () => clearTimeout(t);
  }, [think]);
  const putNum = (k: "start" | "target") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(",", ".");
    setG((x) => ({ ...x, [k]: v === "" || !Number.isFinite(+v) ? undefined : +v }));
  };
  const put = (k: keyof Goal) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setG((x) => ({ ...x, [k]: e.target.value || undefined }));
  const ready = !!g.title.trim() && ((g.kind !== "target" && g.kind !== "daily") || g.target !== undefined);
  const listId = g.list ?? list ?? lists[0]?.id ?? "";
  const save = () =>
    onSave(
      {
        ...g,
        title: g.title.trim(),
        // Only the fields this kind uses.
        by: g.kind === "outcome" || g.kind === "target" ? g.by || undefined : undefined,
        perWeek: g.kind === "habit" ? (g.perWeek ?? 3) : undefined,
        unit: g.kind === "target" || g.kind === "daily" ? g.unit?.trim() || undefined : undefined,
        start: g.kind === "target" ? g.start : undefined,
        target: g.kind === "target" || g.kind === "daily" ? g.target : undefined,
      },
      steps.map((x) => x.trim()).filter(Boolean),
      listId || null,
    );
  const num = (k: "start" | "target", placeholder: string, label: string) => (
    <input className={s.gdNum} inputMode="decimal" value={g[k] ?? ""} onChange={putNum(k)} placeholder={placeholder} aria-label={label} />
  );
  const unit = (placeholder: string) => (
    <input className={s.gdUnit} value={g.unit ?? ""} onChange={put("unit")} maxLength={20} placeholder={placeholder} aria-label="Unit" />
  );
  const by = <input className={s.gdDate} type="date" value={g.by ?? ""} min={todayISO()} onChange={put("by")} aria-label="By when (optional)" />;
  return (
    <Modal label={editing ? "Edit goal" : "New goal"} onClose={onClose}>
      <form
        className={s.gd}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) save();
        }}
      >
        <p className={s.goalStep}>{editing ? "Edit goal" : "New goal"}</p>
        <input
          className={s.gdTitle}
          value={g.title}
          onChange={(e) => setG((x) => ({ ...x, title: e.target.value }))}
          maxLength={120}
          placeholder="What do you want?"
          aria-label="The goal"
          autoFocus={!g.title}
          required
        />
        <div className={s.gdKinds} role="radiogroup" aria-label="How it's measured">
          {KINDS.map(([k, name, hint, Icon]) => (
            <button key={k} type="button" role="radio" aria-checked={g.kind === k} onClick={() => setG((x) => ({ ...x, kind: k }))}>
              <Icon size={18} strokeWidth={2.5} aria-hidden />
              <b>{name}</b>
              <small>{hint}</small>
            </button>
          ))}
        </div>
        {/* The numbers, read as a sentence for the kind picked. */}
        <p className={s.gdSentence} key={g.kind}>
          {g.kind === "target" ? (
            <>
              Reach {num("target", "68", "The goal")} {unit("kg")}, from {num("start", "74", "Where you are")}, by {by}
              <small>(optional)</small>
            </>
          ) : g.kind === "habit" ? (
            <>
              Show up
              <span className={s.gdTimes} role="radiogroup" aria-label="Times a week">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={(g.perWeek ?? 3) === n}
                    aria-label={n === 7 ? "Every day" : `${n} times a week`}
                    onClick={() => setG((x) => ({ ...x, perWeek: n }))}
                  >
                    {n}
                  </button>
                ))}
              </span>
              {(g.perWeek ?? 3) === 7 ? "every day" : "× a week"}
            </>
          ) : g.kind === "daily" ? (
            <>
              {num("target", "8", "A day")} {unit("glasses")} every day
            </>
          ) : (
            <>
              Get there by {by} <small>(optional)</small>
            </>
          )}
        </p>
        {/* What it'll look like among your goals, as you type. */}
        <div className={s.gdPreview} aria-hidden style={{ "--fill": fillFor(g.id) } as React.CSSProperties}>
          <Target size={14} strokeWidth={2.75} />
          <b>{g.title.trim() || "Your goal"}</b>
          <span className={s.goalKind}>{kindLabel(g)}</span>
        </div>
        {lists.length > 0 && (
          <div className={s.gdList}>
            <span>On the list</span>
            <Select
              label="List"
              value={g.list ?? ""}
              options={[{ value: "", label: "No list" }, ...lists.map((l) => ({ value: l.id, label: l.name }))]}
              onChange={(v) => setG((x) => ({ ...x, list: v || undefined }))}
            />
          </div>
        )}

        <div className={s.gdMore}>
          <p>
            <b>Optional</b> · add any of these now or later
          </p>
          {think === null ? (
            <button
              type="button"
              className={s.gdThink}
              onClick={() => {
                setThink(120);
                setOpen({ why: true, plan: true, steps: true });
              }}
            >
              <Timer size={14} strokeWidth={2.75} aria-hidden /> Think it through · 2 min
            </button>
          ) : (
            <button type="button" className={s.gdThink} data-on onClick={() => setThink(null)} aria-live="polite">
              <Timer size={14} strokeWidth={2.75} aria-hidden />
              {think ? `${Math.floor(think / 60)}:${String(think % 60).padStart(2, "0")} to think` : "Time's up: save when ready"}
            </button>
          )}
        </div>
        <Extra
          title="Why it matters"
          open={open.why}
          filled={!!(g.why || g.become)}
          onToggle={() => setOpen((o) => ({ ...o, why: !o.why }))}
        >
          <textarea value={g.why ?? ""} onChange={put("why")} maxLength={1000} rows={2} placeholder="So I have energy for my kids…" aria-label="Why it matters to you" />
          <input value={g.become ?? ""} onChange={put("become")} maxLength={300} placeholder="Who you want to become: someone who finishes what they start" aria-label="Who you want to become" />
        </Extra>
        <Extra
          title="If it gets hard"
          open={open.plan}
          filled={!!(g.obstacle || g.plan)}
          onToggle={() => setOpen((o) => ({ ...o, plan: !o.plan }))}
        >
          <div className={s.gdIf}>
            <span>If</span>
            <input value={g.obstacle ?? ""} onChange={put("obstacle")} maxLength={500} placeholder="I'm too tired after work" aria-label="What could get in the way" />
            <span>then I&apos;ll</span>
            <input value={g.plan ?? ""} onChange={put("plan")} maxLength={500} placeholder="do the 10-minute version" aria-label="Then I'll" />
          </div>
          <small>Deciding now what you&apos;ll do then makes it far more likely you will.</small>
        </Extra>
        {!editing && (
          <Extra
            title={g.kind === "habit" ? "Make it a repeating task" : "First steps"}
            open={open.steps}
            filled={steps.some((x) => x.trim())}
            onToggle={() => setOpen((o) => ({ ...o, steps: !o.steps }))}
          >
            {(g.kind === "habit" ? steps.slice(0, 1) : steps).map((v, i) => (
              <input
                key={i}
                value={v}
                maxLength={500}
                placeholder={g.kind === "habit" ? g.title || "Go to the gym" : ["Put on running shoes", "Walk 10 minutes", "Run 1 km"][i]}
                aria-label={g.kind === "habit" ? "The habit" : `Step ${i + 1}`}
                onChange={(e) => setSteps((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
            <small>
              {g.kind === "habit"
                ? `It repeats ${habitRule(g.perWeek ?? 3)}${lists.length ? ` on ${lists.find((l) => l.id === listId)?.name ?? "your list"}` : ""}. Small enough for a bad day.`
                : `Tiny is good: the first could take 5 minutes.${lists.length ? ` They go on ${lists.find((l) => l.id === listId)?.name ?? "your list"}.` : ""}`}
            </small>
          </Extra>
        )}

        <div className={s.tools}>
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!ready}>
            {editing ? "Save" : "Save goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// An optional part of the goal: a sticker that says so, folding open below itself (animated, unless motion is off).
function Extra({
  title,
  open,
  filled,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  filled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={s.gdExtra} data-open={open || undefined}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        {filled ? <Check size={16} strokeWidth={3} aria-hidden /> : <Plus size={16} strokeWidth={3} aria-hidden />}
        <b>{title}</b>
        <span className={s.gdOptional}>Optional</span>
        <ChevronDown size={16} strokeWidth={2.75} aria-hidden className={s.gdChevron} />
      </button>
      <div className={s.gdBody} inert={!open}>
        <div>{children}</div>
      </div>
    </section>
  );
}

// Rewards you set for yourself, bought with the XP your finished tasks earn. In a team, each person has their own XP.
// Starting points for a first reward, priced in "tasks like yours".
// Treats to start from: a name, its size in tasks like yours, and a sticker colour.
const IDEAS = [
  ["20 min of Instagram", 3, "var(--cyan)"],
  ["Dessert after dinner", 4, "#ffbe86"],
  ["Coffee out", 5, "var(--peri)"],
  ["An hour of gaming", 6, "var(--orange)"],
  ["A lazy morning", 8, "#00afb9"],
  ["Cheat meal", 10, "var(--pink)"],
  ["Movie night", 10, "var(--lime)"],
  ["A new book", 30, "var(--butter)"],
  ["A weekend away", 100, "var(--cyan)"],
] as const;

export function Rewards({ ai }: { ai: boolean }) {
  const { lists } = useLists();
  const { items } = useGoalItems();
  const me = useMe();
  const [picking, setPicking] = useState(false);
  const [history, setHistory] = useState(false); // everything earned and claimed, in a dialog
  const [sharingClaim, setSharingClaim] = useState(""); // a claimed treat, as a card
  // A template adds the reward, priced in tasks like yours (tap it to change); "my own" goes to the bar to type it.
  const fill = (t?: { title: string; size: number }) => {
    setPicking(false);
    if (t)
      changeGoals(lists, (xs) => [...xs, { t: "reward", id: uid() + uid(), title: t.title, cost: t.size * perTask }]);
    else requestAnimationFrame(() => document.getElementById("ask-bar")?.focus());
  };
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
    setTimeout(() => setClaimed(""), 8000); // long enough to tap "Show it off"
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
        {/* Deleting is in the reward's own dialog (tap the card), away from Claim. */}
      </footer>
    </li>
  );
  // Like the Goals page's starters: pick one and it's yours, priced in tasks like yours. Shown until there's a reward;
  // after that, the templates (Templates.tsx) are a tap away from New reward.
  const ideasLeft = IDEAS.filter(([idea]) => !rewards.some((r) => r.title === idea));
  const ideas = (
    <section className={s.goalStart}>
      {rewards.length ? <h2 className={s.sideHead}>More ideas</h2> : <h2 className="display">Pick a treat.</h2>}
      <ul className={s.starters}>
        {ideasLeft.map(([idea, n, fill]) => (
          <li key={idea}>
            <button
              type="button"
              style={{ "--fill": fill } as React.CSSProperties}
              onClick={() =>
                changeGoals(lists, (xs) => [
                  ...xs,
                  { t: "reward", id: uid() + uid(), title: idea, cost: perTask * n },
                ])
              }
            >
              <b>{idea}</b>
              <small>
                About {n} tasks · {perTask * n} XP
              </small>
              <span className={s.starterGo}>
                <Plus size={14} strokeWidth={3} aria-hidden /> Make it mine
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <>
      <Tip k="rewards" title="Earn XP, treat yourself">
        <p>Rewards make finishing feel worth it today, not someday.</p>
        <ol className={s.goalHow}>
          <li>
            <b>Pick a treat.</b> Something you&apos;d genuinely look forward to, big or small.
          </li>
          <li>
            <b>Finish tasks.</b> Each one earns XP; bigger and on-time tasks earn more.
          </li>
          <li>
            <b>Claim it, guilt-free.</b> You earned it. Then pick the next one.
          </li>
        </ol>
        <Drafts
          kind="rewards"
          onPick={(r) =>
            changeGoals(lists, (xs) => [...xs, { t: "reward", id: uid() + uid(), title: r.title, cost: r.cost || perTask * 5 }])
          }
        />
      </Tip>
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
          earned it.{" "}
          <button className={s.link} onClick={() => setSharingClaim(claimed)}>
            Show it off
          </button>
        </p>
      )}
      {sharingClaim && (
        <ShareSheet
          spec={(() => {
            const week = recap(mine, new Date());
            return {
              kind: "win" as const,
              eyebrow: "Treat earned",
              title: sharingClaim,
              line: `${week.done} thing${week.done === 1 ? "" : "s"} done this week paid for it.`,
              grid: week.perDay,
              fill: "var(--pink)",
            };
          })()}
          name={sharingClaim}
          onClose={() => setSharingClaim("")}
        />
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
          {!rewards.length && ideas}
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
            <button type="button" className={`btn ${s.tplBrowse}`} onClick={() => setPicking(true)}>
              Pick from {REWARD_TEMPLATES.length} ideas
            </button>
            {picking && (
              <RewardTemplates
                taken={rewards.map((r) => r.title)}
                perTask={perTask}
                onPick={fill}
                onOwn={() => fill()}
                onClose={() => setPicking(false)}
              />
            )}
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
              {mine.length > 5 && (
                <button className={s.link} onClick={() => setHistory(true)}>
                  See all {mine.length}
                </button>
              )}
              {history && (
                <Modal label="XP history" onClose={() => setHistory(false)}>
                  <h2 className="display">History</h2>
                  <History wins={mine} rewards={rewards} />
                </Modal>
              )}
            </section>
          )}
        </aside>
      </div>
      {/* The bar: name a treat (priced at about ten tasks; tap it to change), or ask todone for ideas. */}
      <AskBar
        place="rewards"
        ai={ai}
        onAdd={(title) =>
          changeGoals(lists, (xs) => [...xs, { t: "reward", id: uid() + uid(), title: title.slice(0, 80), cost: perTask * 10 }])
        }
      />
    </>
  );
}

// Everything earned and claimed, newest first, by month: straight from the XP log, so it always matches your balance.
const PAGE = 8;
function History({ wins, rewards }: { wins: Win[]; rewards: Reward[] }) {
  // A page at a time: the newest ones, then more each time you ask.
  const [count, setCount] = useState(PAGE);
  if (!wins.length) return null;
  const spends = wins.filter((w) => w.spend);
  const spent = spends.reduce((n, w) => n - w.xp, 0);
  const earned = wins.reduce((n, w) => n + (w.spend ? 0 : w.xp), 0);
  const when = (t: number) => {
    const d = new Date(t);
    const days = Math.round(
      (new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) /
        86_400_000,
    );
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return days === 0
      ? `Today, ${time}`
      : days === 1
        ? `Yesterday, ${time}`
        : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };
  // Grouped by month, so a long history stays easy to scan.
  const month = (t: number) =>
    new Date(t).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  const shown = wins.slice(0, count);
  const groups: [string, Win[]][] = [];
  for (const w of shown) {
    const m = month(w.at);
    if (groups.at(-1)?.[0] === m) groups.at(-1)![1].push(w);
    else groups.push([m, [w]]);
  }
  const left = wins.length - shown.length;
  return (
    <section className={s.claimedBox}>
      <p className={s.claimedSum}>
        <b>{earned}</b> XP earned · <b>{spends.length}</b> reward{spends.length === 1 ? "" : "s"} enjoyed ·{" "}
        <b>{spent}</b> XP spent
      </p>
      {groups.map(([m, ws]) => (
        <div key={m} className={s.claimedMonth}>
          <h3>{m}</h3>
          <ol className={s.claimedList}>
            {ws.map((w) => (
              <li
                key={w.id}
                // A claim in the colour of its reward's card; what you earned, on cream.
                style={
                  {
                    "--fill": w.spend
                      ? fillFor(rewards.find((r) => r.title === w.title)?.id ?? w.title)
                      : "#fff8ef",
                  } as React.CSSProperties
                }
              >
                {w.spend ? <Gift size={16} strokeWidth={2.5} aria-hidden /> : <Zap size={16} strokeWidth={2.5} aria-hidden />}
                <span>{w.title}</span>
                <time dateTime={new Date(w.at).toISOString()}>
                  {when(w.at)}
                </time>
                <b>
                  {w.xp > 0 ? "+" : ""}
                  {w.xp} XP
                </b>
              </li>
            ))}
          </ol>
        </div>
      ))}
      {wins.length > PAGE && (
        <p className={s.claimedMore}>
          <span>
            Showing {shown.length} of {wins.length}
          </span>
          {left > 0 && (
            <button className={s.link} onClick={() => setCount((n) => n + 10)}>
              Show {Math.min(10, left)} more
            </button>
          )}
          {count > PAGE && (
            <button className={s.link} onClick={() => setCount(PAGE)}>
              Show fewer
            </button>
          )}
        </p>
      )}
    </section>
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
  // Earned some: a card pops up with the XP and how close the next reward is (or that it's ready).
  const [won, setWon] = useState<Won | null>(null);
  // When this tile appeared (set after render: the clock can't be read while the page is prerendered).
  const since = useRef(Infinity);
  useEffect(() => {
    since.current = Date.now();
  }, []);
  // Read when XP changes (not a reason to re-run that effect, which would cut the roll short).
  const rewardsNow = useRef(items);
  useEffect(() => {
    rewardsNow.current = items;
  });
  // The number shown rolls from the old total to the new one (ease-out, ~0.8s); jumps when motion is reduced.
  const [shown, setShown] = useState(xp);
  useEffect(() => {
    const before = prev.current;
    prev.current = xp;
    // Not for XP that arrives with the page loading (another device's ticks syncing in), only what you just earned.
    if (before !== null && xp > before && Date.now() - since.current > 3000) {
      const next = rewardsNow.current
        .filter((i): i is Reward => i.t === "reward")
        .sort((a, b) => a.cost - b.cost)
        .find((r) => r.cost > before);
      Promise.resolve().then(() => setWon({ before, xp, next, k: Date.now() }));
    }
    if (before === null || before === xp || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Promise.resolve().then(() => setShown(xp));
      return;
    }
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / 800);
      setShown(Math.round(before + (xp - before) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    });
    if (xp > before) Promise.resolve().then(() => setPop({ n: xp - before, k: Date.now() }));
    const t = setTimeout(() => setPop(null), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
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
      <span className={s.xpCount} data-rolling={shown !== xp || undefined}>
        {shown}
      </span>
      {pop && (
        <b key={pop.k} className={s.xpPop} aria-hidden>
          +{pop.n}
        </b>
      )}
      {won && <XpWon key={won.k} won={won} onSee={onClick} onDone={() => setWon(null)} />}
    </button>
  );
}

// What a tick just earned, and the pull of the next reward: a bar that fills from where you were to where you are
// now (progress feels faster near the end, so it shows the distance left), or, once it's paid for, "ready to claim"
// with confetti. It goes by itself; tapping it opens Rewards.
type Won = { before: number; xp: number; next?: Reward; k: number };
function XpWon({ won, onSee, onDone }: { won: Won; onSee: () => void; onDone: () => void }) {
  const { before, xp, next } = won;
  const ready = !!next && xp >= next.cost;
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const t = setTimeout(() => done.current(), ready ? 4500 : 3200);
    return () => clearTimeout(t);
  }, [ready]);
  return createPortal(
    <div
      className={s.xpWon}
      data-ready={ready || undefined}
      role="status"
      onClick={(e) => {
        e.stopPropagation();
        onSee();
        onDone();
      }}
    >
      {ready && <Confetti />}
      <b className={s.xpWonGain}>
        <Zap size={16} strokeWidth={2.75} aria-hidden /> +{xp - before} XP
      </b>
      {next ? (
        <>
          <span>{ready ? <>Ready to claim: <b>{next.title}</b></> : <>{next.cost - xp} XP to <b>{next.title}</b></>}</span>
          <span
            className={s.xpWonBar}
            aria-hidden
            style={{ "--from": Math.min(1, before / next.cost), "--to": Math.min(1, xp / next.cost) } as React.CSSProperties}
          >
            <i />
          </span>
        </>
      ) : (
        <span>Add a reward to save up for. Tap to pick one.</span>
      )}
    </div>,
    document.body,
  );
}

// What Ask todone drafted from "About you" (lib/onboard.ts), offered once in the Goals or Rewards tip. A goal opens
// in the goal dialog to look over; a reward is added as it is. Each one picked is gone from the drafts.
function Drafts<K extends keyof Suggested>({ kind, onPick }: { kind: K; onPick: (x: Suggested[K][number]) => void }) {
  const who = useMe();
  const [all, setAll] = useState<Suggested | null>(() => (who ? suggested(who) : null));
  const picks = (all?.[kind] ?? []) as Suggested[K][number][];
  if (!who || !all || !picks.length) return null;
  return (
    <>
      <p>
        <b>From what you told us:</b>
      </p>
      <ul className={s.tipPicks}>
        {picks.map((x, i) => (
          <li key={`${x.title}-${i}`}>
            <button
              type="button"
              onClick={() => {
                onPick(x);
                const next = { ...all, [kind]: picks.filter((_, j) => j !== i) } as Suggested;
                suggest(who, next);
                setAll(next);
              }}
            >
              <Plus size={14} strokeWidth={3} aria-hidden /> {x.title}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
