// Ask todone's results board, as plain data: every suggested todo, goal and reward is a draft with a place —
// a list id, "new:<name>", "goals", "rewards", or null (no list yet: it needs one before it can be added). Dropping a draft somewhere else can
// change what it is (a todo dropped on Goals becomes a goal). Nothing is saved until commit().
import type { Reward } from "@todone/sdk/goals";
import type { Change, Plan, PlanGoal } from "@todone/sdk/plan";
import { type Task, tick } from "@todone/sdk/tasks";

export type Draft =
  | { id: string; kind: "task"; task: Task; place: string | null; ai: string | null }
  | { id: string; kind: "goal"; goal: PlanGoal; place: string | null; ai: string | null }
  | { id: string; kind: "reward"; reward: Reward; place: string | null; ai: string | null }
  // A change to a task you have (in list `place`), from a list you let the AI read. It stays in its list's lane.
  | { id: string; kind: "change"; change: Change; task: Task; place: string; ai: string };

export const GOALS = "goals";
export const REWARDS = "rewards";
export const BIN = "bin";
export const REWARD_XP = 150; // a todo turned into a reward: a medium treat
const NEW = "new:";
export const newPlace = (name: string) => NEW + name;
export const newName = (place: string | null) => (place?.startsWith(NEW) ? place.slice(NEW.length) : null);
export const titleOf = (d: Draft) =>
  d.kind === "task" || d.kind === "change" ? d.task.title : d.kind === "goal" ? d.goal.title : d.reward.title;

// The AI's answer as drafts, each where the AI put it: a list you have, a new list by name, Goals or Rewards.
export function fromPlan(plan: Plan, lists: { id: string; name: string }[]): Draft[] {
  const listPlace = (name: string | null) =>
    name === null ? null : (lists.find((l) => l.name.toLowerCase() === name.toLowerCase())?.id ?? newPlace(name));
  const at = (ai: string | null) => ({ ai, place: ai });
  return [
    ...plan.lists.flatMap((g) => g.tasks.map((task): Draft => ({ id: task.id, kind: "task", task, ...at(listPlace(g.name)) }))),
    ...plan.goals.map((goal): Draft => ({ id: goal.id, kind: "goal", goal, ...at(GOALS) })),
    ...plan.rewards.map((reward): Draft => ({ id: reward.id, kind: "reward", reward, ...at(REWARDS) })),
  ];
}

// What a draft becomes in a place: lists hold tasks, Goals holds goals, Rewards holds rewards. The title carries over.
function becomes(d: Draft, place: string | null, now: number): Draft {
  if (d.kind === "change") return d; // a change stays with its task
  const base = { id: d.id, place, ai: d.ai };
  const title = titleOf(d);
  if (place === GOALS)
    return d.kind === "goal" ? { ...d, ...base } : { ...base, kind: "goal", goal: { t: "goal", id: d.id, title: title.slice(0, 120), kind: "outcome", created: now } };
  if (place === REWARDS)
    return d.kind === "reward" ? { ...d, ...base } : { ...base, kind: "reward", reward: { t: "reward", id: d.id, title: title.slice(0, 80), cost: REWARD_XP } };
  if (place === null) return { ...d, ...base };
  return d.kind === "task" ? { ...d, ...base } : { ...base, kind: "task", task: { id: d.id, title, done: false, sub: [] } };
}

export function drop(ds: Draft[], id: string, place: string | null, now = Date.now()): Draft[] {
  if (place === BIN) return ds.filter((d) => d.id !== id);
  return ds.map((d) => (d.id === id ? becomes(d, place, now) : d));
}

export function rename(ds: Draft[], id: string, title: string): Draft[] {
  const t = title.trim();
  if (!t) return ds;
  return ds.map((d) =>
    d.id !== id || d.kind === "change"
      ? d
      : d.kind === "task"
        ? { ...d, task: { ...d.task, title: t } }
        : d.kind === "goal"
          ? { ...d, goal: { ...d.goal, title: t.slice(0, 120) } }
          : { ...d, reward: { ...d.reward, title: t.slice(0, 80) } },
  );
}

// New lists on the board: the ones drafts are headed for, plus any made by hand, each once (ignoring case), and
// never the name of a list you already have.
export function newLists(ds: Draft[], made: string[], lists: { name: string }[]) {
  const out: string[] = [];
  for (const n of [...ds.flatMap((d) => [newName(d.ai), newName(d.place)]), ...made])
    if (n && !out.some((o) => o.toLowerCase() === n.toLowerCase()) && !lists.some((l) => l.name.toLowerCase() === n.toLowerCase()))
      out.push(n);
  return out;
}

// What Add saves: tasks grouped by list (existing by id, new by name), goals and rewards. Ones with no list are left out.
export function commit(ds: Draft[]) {
  const groups = new Map<string, { listId?: string; name: string | null; tasks: Task[] }>();
  const goals: PlanGoal[] = [];
  const rewards: Reward[] = [];
  const changes: Extract<Draft, { kind: "change" }>[] = [];
  for (const d of ds) {
    if (d.place === null) continue;
    if (d.kind === "change") changes.push(d);
    else if (d.kind === "goal") goals.push(d.goal);
    else if (d.kind === "reward") rewards.push(d.reward);
    else {
      const name = newName(d.place);
      const key = name ? NEW + name.toLowerCase() : d.place;
      const g = groups.get(key) ?? (name ? { name, tasks: [] } : { listId: d.place, name: "", tasks: [] });
      g.tasks.push(d.task);
      groups.set(key, g);
    }
  }
  return { groups: [...groups.values()], goals, rewards, changes };
}

// Changes from the AI as drafts, each on the task it numbered (refs: number → task id, lists: where to find it).
// Numbers it made up are dropped; one change per task, the first.
export function fromChanges(cs: Change[], refs: Record<number, string>, lists: { id: string; tasks: Task[] }[]): Draft[] {
  const out: Draft[] = [];
  for (const change of cs) {
    const id = refs[change.ref];
    const list = id && lists.find((l) => l.tasks.some((t) => t.id === id || t.sub.some((u) => u.id === id)));
    const task = list && list.tasks.flatMap((t) => [t, ...t.sub]).find((t) => t.id === id);
    if (!list || !task || out.some((d) => d.kind === "change" && d.task.id === id)) continue;
    out.push({ id: `change-${id}`, kind: "change", change, task, place: list.id, ai: list.id });
  }
  return out;
}

// One list's tasks with these changes made: what's left, what went to the bin, and what moves to another list (by
// name; a step moves as a task of its own). A repeating task marked done comes back on its next day, as a tick does.
export function applyChanges(tasks: Task[], cs: Change[], ids: string[], today: string, me?: string) {
  const binned: Task[] = [];
  const moved: { task: Task; to: string }[] = [];
  let out = tasks;
  const take = (id: string) => {
    let got: Task | undefined;
    out = out.flatMap((t) => {
      if (t.id === id) return (got = t), [];
      const sub = t.sub.filter((u) => (u.id === id ? ((got = u), false) : true));
      return [sub.length === t.sub.length ? t : { ...t, sub }];
    });
    return got;
  };
  cs.forEach((c, i) => {
    const id = ids[i];
    const done = out.flatMap((t) => [t, ...t.sub]).find((t) => t.id === id)?.done;
    if (c.op === "done") out = done ? out : tick(out, id, today, me); // already done: leave it (a tick would undo it)
    else if (c.op === "delete") {
      const t = take(id);
      if (t) binned.push(t);
    } else if (c.op === "move") {
      const t = take(id);
      if (t) moved.push({ task: { ...t, sub: t.sub }, to: c.to });
    } else
      out = out.map((t) =>
        t.id === id ? { ...t, ...c.set } : { ...t, sub: t.sub.map((u) => (u.id === id ? { ...u, ...c.set } : u)) },
      );
  });
  return { tasks: out, binned, moved };
}

// How a change reads on its sticker.
export function changeLabel(c: Change) {
  if (c.op === "done") return "Mark done";
  if (c.op === "delete") return "Delete";
  if (c.op === "move") return `Move to ${c.to}`;
  const s = c.set;
  return [s.title && `Rename to “${s.title}”`, s.due && `Due ${s.due}`, s.at && `At ${s.at}`, s.pri && ["High", "Medium", "Low"][s.pri - 1] + " priority", s.est && `${s.est}m`, s.effort && `Effort ${s.effort.toUpperCase()}`]
    .filter(Boolean)
    .join(" · ");
}

export const placed = (ds: Draft[]) => ds.filter((d) => d.place !== null).length;
