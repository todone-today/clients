// Ask todone's results board, as plain data: every suggested todo, goal and reward is a draft with a place —
// a list id, "new:<name>", "goals", "rewards", or null (still in the tray). Dropping a draft somewhere else can
// change what it is (a todo dropped on Goals becomes a goal). Nothing is saved until commit().
import type { Reward } from "@todone/sdk/goals";
import type { Plan, PlanGoal } from "@todone/sdk/plan";
import type { Task } from "@todone/sdk/tasks";

export type Draft =
  | { id: string; kind: "task"; task: Task; place: string | null; ai: string | null; moved: boolean }
  | { id: string; kind: "goal"; goal: PlanGoal; place: string | null; ai: string | null; moved: boolean }
  | { id: string; kind: "reward"; reward: Reward; place: string | null; ai: string | null; moved: boolean };

export const GOALS = "goals";
export const REWARDS = "rewards";
export const BIN = "bin";
export const REWARD_XP = 150; // a todo turned into a reward: a medium treat
const NEW = "new:";
export const newPlace = (name: string) => NEW + name;
export const newName = (place: string | null) => (place?.startsWith(NEW) ? place.slice(NEW.length) : null);
export const titleOf = (d: Draft) => (d.kind === "task" ? d.task.title : d.kind === "goal" ? d.goal.title : d.reward.title);

// The AI's answer as drafts. Auto: each where the AI put it (a list you have, a new list by name, Goals, Rewards);
// otherwise all in the tray. Tasks the AI left without a list always start in the tray.
export function fromPlan(plan: Plan, lists: { id: string; name: string }[], auto: boolean): Draft[] {
  const listPlace = (name: string | null) =>
    name === null ? null : (lists.find((l) => l.name.toLowerCase() === name.toLowerCase())?.id ?? newPlace(name));
  const at = (ai: string | null) => ({ ai, place: auto ? ai : null, moved: false });
  return [
    ...plan.lists.flatMap((g) => g.tasks.map((task): Draft => ({ id: task.id, kind: "task", task, ...at(listPlace(g.name)) }))),
    ...plan.goals.map((goal): Draft => ({ id: goal.id, kind: "goal", goal, ...at(GOALS) })),
    ...plan.rewards.map((reward): Draft => ({ id: reward.id, kind: "reward", reward, ...at(REWARDS) })),
  ];
}

// Auto switched: drafts you haven't moved yourself follow it.
export const setAuto = (ds: Draft[], auto: boolean) => ds.map((d) => (d.moved ? d : { ...d, place: auto ? d.ai : null }));

// What a draft becomes in a place: lists hold tasks, Goals holds goals, Rewards holds rewards. The title carries over.
function becomes(d: Draft, place: string | null, now: number): Draft {
  const base = { id: d.id, place, ai: d.ai, moved: true };
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
    d.id !== id
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

// What Add saves: tasks grouped by list (existing by id, new by name), goals and rewards. The tray is left out.
export function commit(ds: Draft[]) {
  const groups = new Map<string, { listId?: string; name: string | null; tasks: Task[] }>();
  const goals: PlanGoal[] = [];
  const rewards: Reward[] = [];
  for (const d of ds) {
    if (d.place === null) continue;
    if (d.kind === "goal") goals.push(d.goal);
    else if (d.kind === "reward") rewards.push(d.reward);
    else {
      const name = newName(d.place);
      const key = name ? NEW + name.toLowerCase() : d.place;
      const g = groups.get(key) ?? (name ? { name, tasks: [] } : { listId: d.place, name: "", tasks: [] });
      g.tasks.push(d.task);
      groups.set(key, g);
    }
  }
  return { groups: [...groups.values()], goals, rewards };
}

export const placed = (ds: Draft[]) => ds.filter((d) => d.place !== null).length;
