import { type Effort, type List, type Task, tick, uid, validRepeat } from "@todone/sdk/tasks";

// Plain changes to tasks, the same rules as the app: tasks and their steps (one level), the Bin keeps deleted tasks
// for 7 days with where they came from.

export type TaskInput = {
  title: string;
  note?: string;
  due?: string;
  repeat?: string;
  effort?: Effort;
  minutes?: number;
  priority?: "high" | "medium" | "low";
  goal?: string;
  steps?: string[];
};
const PRI = { high: 1, medium: 2, low: 3 } as const;

export function newTask(i: TaskInput, now = Date.now()): Task {
  if (i.repeat && !validRepeat(i.repeat)) throw new Error(`"${i.repeat}" isn't a repeat todone knows, e.g. "every day", "every weekday", "every 2 weeks".`);
  return clean({
    id: uid(),
    title: i.title.trim(),
    done: false,
    due: i.due,
    rep: i.repeat,
    effort: i.effort,
    est: i.minutes,
    pri: i.priority ? PRI[i.priority] : undefined,
    note: i.note,
    goal: i.goal,
    created: now,
    sub: (i.steps ?? []).map((s) => ({ id: uid(), title: s.trim(), done: false, created: now, sub: [] })),
  });
}

// Fields set to undefined or null are left off (the server's check doesn't take nulls).
export function clean<T extends object>(t: T): T {
  const out = { ...t } as Record<string, unknown>;
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === null) delete out[k];
  return out as T;
}

export type Patch = {
  title?: string;
  note?: string;
  due?: string | null;
  repeat?: string | null;
  effort?: Effort;
  minutes?: number;
  priority?: "high" | "medium" | "low";
  goal?: string | null;
};
export function patchTask(t: Task, p: Patch): Task {
  if (p.repeat && !validRepeat(p.repeat)) throw new Error(`"${p.repeat}" isn't a repeat todone knows.`);
  const next: Record<string, unknown> = { ...t };
  if (p.title !== undefined) next.title = p.title.trim();
  if (p.note !== undefined) next.note = p.note || undefined;
  if (p.due !== undefined) next.due = p.due ?? undefined;
  if (p.repeat !== undefined) next.rep = p.repeat ?? undefined;
  if (p.effort !== undefined) next.effort = p.effort;
  if (p.minutes !== undefined) next.est = p.minutes;
  if (p.priority !== undefined) next.pri = PRI[p.priority];
  if (p.goal !== undefined) next.goal = p.goal ?? undefined;
  return clean(next as Task);
}

// Where a task is: its list, and its parent when it's a step.
export function findTask(lists: List[], id: string): { list: List; task: Task; parent?: Task } | null {
  for (const list of lists)
    for (const t of list.tasks) {
      if (t.id === id) return { list, task: t };
      const s = t.sub?.find((x) => x.id === id);
      if (s) return { list, task: s, parent: t };
    }
  return null;
}

export const mapTask = (ts: Task[], id: string, f: (t: Task) => Task): Task[] =>
  ts.map((t) => (t.id === id ? f(t) : { ...t, sub: mapTask(t.sub ?? [], id, f) }));

export function takeTask(ts: Task[], id: string): [Task[], Task | null] {
  let got: Task | null = null;
  const rest = ts
    .filter((t) => (t.id === id ? ((got = t), false) : true))
    .map((t) => {
      if (got) return t;
      const [sub, s] = takeTask(t.sub ?? [], id);
      if (s) got = s;
      return s ? { ...t, sub } : t;
    });
  return [rest, got];
}

// Ticks a task or a step. A repeating task rolls forward to its next date (as in the app); unticking undoes.
export function setDone(ts: Task[], id: string, done: boolean, today: string, by?: string): Task[] {
  const top = ts.find((t) => t.id === id);
  if (top) return done === top.done ? ts : tick(ts, id, today, by); // the app's own tick: steps, repeats, undo
  return mapTask(ts, id, (t) => clean({ ...t, done, doneAt: done ? Date.now() : undefined, doneBy: done ? by : undefined }));
}

const WEEK = 7 * 86_400_000;
export type Binned = Task & { binnedAt: number; from: string; fromName: string };
export const binEntry = (t: Task, from: List, at = Date.now()): Binned => ({ ...t, binnedAt: at, from: from.id, fromName: from.name });
export const freshBin = (ts: Task[], now = Date.now()) => (ts as Binned[]).filter((t) => t.binnedAt > now - WEEK);

// Dated tasks across lists between two days (inclusive), steps included, by date.
export function calendar(lists: List[], from: string, to: string) {
  const out: { date: string; id: string; title: string; done: boolean; list: string; step?: true; repeat?: string }[] = [];
  for (const l of lists.filter((x) => !x.kind))
    for (const t of l.tasks)
      for (const x of [t, ...(t.sub ?? [])])
        if (x.due && x.due >= from && x.due <= to)
          out.push({ date: x.due, id: x.id, title: x.title, done: x.done, list: l.name, ...(x !== t ? { step: true as const } : {}), ...(x.rep ? { repeat: x.rep } : {}) });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// A task as the AI sees it: only what's set.
export const show = (t: Task): Record<string, unknown> =>
  clean({
    id: t.id,
    title: t.title,
    done: t.done,
    due: t.due,
    repeat: t.rep,
    effort: t.effort,
    minutes: t.est,
    priority: t.pri ? (["high", "medium", "low"] as const)[t.pri - 1] : undefined,
    note: t.note,
    goal: t.goal,
    steps: t.sub?.length ? t.sub.map(show) : undefined,
  });
