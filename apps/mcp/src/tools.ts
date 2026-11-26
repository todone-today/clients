import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EFFORTS, type List, type Task, todayISO, uid } from "@todone/sdk/tasks";
import { type Goal, type GoalItem, type Reward, balance, goalProgress, logGoal, reconcile } from "@todone/sdk/goals";
import type { Account } from "./account.ts";
import { binEntry, calendar, clean, findTask, freshBin, mapTask, newTask, patchTask, setDone, show, takeTask } from "./ops.ts";

const ws = z.string().optional().describe('Workspace id from list_workspaces. Leave out for the personal workspace.');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a date like 2026-12-01");
const taskIn = z.object({
  title: z.string().min(1).max(500),
  note: z.string().max(20_000).optional().describe("Details, simple Markdown"),
  due: day.optional().describe("The day it's for"),
  repeat: z.string().optional().describe('e.g. "every day", "every weekday", "every 2 weeks", "every month"'),
  effort: z.enum(EFFORTS).optional().describe("How hard: xs, s, m, l, xl (bigger earns more karma points)"),
  minutes: z.number().int().min(0).max(100_000).optional().describe("How long it takes"),
  priority: z.enum(["high", "medium", "low"]).optional(),
  goal: z.string().optional().describe("Goal id this task moves forward"),
  steps: z.array(z.string().min(1).max(500)).max(50).optional().describe("Steps (sub-tasks)"),
});

const ok = (x: unknown) => ({ content: [{ type: "text" as const, text: typeof x === "string" ? x : JSON.stringify(x, null, 1) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] });

// A list by id or by name (any case).
function pick(lists: List[], ref: string) {
  const l = lists.find((x) => x.id === ref) ?? lists.filter((x) => x.name.toLowerCase() === ref.trim().toLowerCase())[0];
  if (!l) throw new Error(`No list "${ref}". Lists: ${lists.filter((x) => !x.kind).map((x) => x.name).join(", ")}`);
  return l;
}
const isGoalList = (l: List) => l.kind === "goals";
const items = (lists: List[]) => (lists.find(isGoalList)?.tasks ?? []) as unknown as GoalItem[];
const allTasks = (lists: List[]) => lists.filter((l) => !l.kind).flatMap((l) => l.tasks);

export function register(server: McpServer, acc: Account) {
  const tool = <S extends z.ZodRawShape>(
    name: string,
    description: string,
    schema: S,
    run: (a: z.infer<z.ZodObject<S>>) => Promise<unknown>,
    write = true,
  ) =>
    server.registerTool(
      name,
      { description, inputSchema: schema, annotations: { readOnlyHint: !write, destructiveHint: name.startsWith("delete") } },
      // @ts-expect-error: the SDK's callback type is generic over every zod version; the args are what `schema` says.
      async (a: z.infer<z.ZodObject<S>>) => {
        try {
          return ok(await run(a));
        } catch (e) {
          return fail(e);
        }
      },
    );

  // Changes the goals-and-rewards list (made the first time, always encrypted).
  async function changeGoals(w: string, f: (xs: GoalItem[], lists: List[]) => GoalItem[]) {
    const lists = await acc.lists(w);
    const g = lists.find(isGoalList);
    if (!g) return acc.create(w, { id: uid() + uid(), name: "Goals", tasks: f([], lists), kind: "goals" });
    return acc.change(w, g.id, (l) => ({ ...l, tasks: f(l.tasks as unknown as GoalItem[], lists) as unknown as Task[] }));
  }
  // Changes the list a task is in.
  async function changeTask(w: string, id: string, f: (tasks: Task[], list: List) => Task[]) {
    const at = findTask((await acc.lists(w)).filter((l) => !l.kind || l.kind === "ideas"), id);
    if (!at) throw new Error(`No task with id ${id}. Use get_list or search to find its id.`);
    const l = await acc.change(w, at.list.id, (x) => ({ ...x, tasks: f(x.tasks, x) }));
    return { list: at.list.name, task: l && findTask([l], id) ? show(findTask([l], id)!.task) : undefined };
  }
  const me = () => acc.user || undefined;

  // ── Workspaces and lists ──
  tool("list_workspaces", "The person's workspaces: Personal, and each team they're in.", {}, () => acc.call("GET", "/workspaces"), false);

  tool(
    "get_lists",
    "All lists in a workspace with how many tasks are open and done. Brainstorm holds loose ideas.",
    { workspace: ws },
    async ({ workspace }) =>
      (await acc.lists(workspace)).filter((l) => !l.kind || l.kind === "ideas").map((l) => ({
        id: l.id,
        name: l.kind === "ideas" ? "Brainstorm" : l.name,
        open: l.tasks.filter((t) => !t.done).length,
        done: l.tasks.filter((t) => t.done).length,
        encrypted: !l.plain,
      })),
    false,
  );

  tool(
    "get_list",
    "One list's tasks with their ids, dates, repeats, steps and notes.",
    { list: z.string().describe("List id or name"), include_done: z.boolean().optional().describe("Default true"), workspace: ws },
    async ({ list, include_done, workspace }) => {
      const l = pick(await acc.lists(workspace), list);
      const tasks = include_done === false ? l.tasks.filter((t) => !t.done) : l.tasks;
      return { id: l.id, name: l.name, encrypted: !l.plain, tasks: tasks.map(show) };
    },
    false,
  );

  tool(
    "create_list",
    "Makes a new list, optionally with tasks. Lists are end-to-end encrypted unless encrypted is false.",
    { name: z.string().min(1).max(60), tasks: z.array(taskIn).max(500).optional(), encrypted: z.boolean().optional(), workspace: ws },
    async ({ name, tasks, encrypted, workspace }) => {
      const l = await acc.create(workspace ?? "personal", { id: uid() + uid(), name: name.trim(), tasks: (tasks ?? []).map((t) => newTask(t)), plain: encrypted === false });
      return { id: l.id, name: l.name, tasks: l.tasks.length };
    },
  );

  tool(
    "rename_list",
    "Renames a list.",
    { list: z.string(), name: z.string().min(1).max(60), workspace: ws },
    async ({ list, name, workspace }) => {
      const l = pick(await acc.lists(workspace), list);
      await acc.change(workspace ?? "personal", l.id, (x) => ({ ...x, name: name.trim() }));
      return `Renamed "${l.name}" to "${name.trim()}".`;
    },
  );

  tool(
    "delete_list",
    "Deletes a whole list. Its tasks go to the Bin for 7 days. Confirm with the person before calling.",
    { list: z.string(), workspace: ws },
    async ({ list, workspace }) => {
      const w = workspace ?? "personal";
      const lists = await acc.lists(w);
      const l = pick(lists.filter((x) => !x.kind), list);
      if (l.tasks.length) await toBin(w, lists, l.tasks, l);
      await acc.change(w, l.id, () => null);
      return `Deleted "${l.name}". Its ${l.tasks.length} tasks are in the Bin for 7 days.`;
    },
  );

  tool(
    "set_list_encryption",
    "Turns a list's end-to-end encryption on or off. Off makes it readable by todone's servers (needed for calendar feeds and some integrations). Ask the person first.",
    { list: z.string(), encrypted: z.boolean(), workspace: ws },
    async ({ list, encrypted, workspace }) => {
      const l = pick((await acc.lists(workspace)).filter((x) => !x.kind), list);
      await acc.change(workspace ?? "personal", l.id, (x) => ({ ...x, plain: !encrypted }));
      return `"${l.name}" is ${encrypted ? "end-to-end encrypted" : "no longer encrypted"} now.`;
    },
  );

  // ── Tasks ──
  tool(
    "add_tasks",
    "Adds tasks to a list (by id or name; \"Brainstorm\" for ideas). Each can have a date, repeat, effort, steps and a note.",
    { list: z.string(), tasks: z.array(taskIn).min(1).max(200), workspace: ws },
    async ({ list, tasks, workspace }) => {
      const lists = await acc.lists(workspace);
      const l = list.toLowerCase() === "brainstorm" ? lists.find((x) => x.kind === "ideas") : pick(lists.filter((x) => !x.kind), list);
      if (!l) throw new Error("There's no Brainstorm yet. Open todone once to make it.");
      const made = tasks.map((t) => newTask(t));
      await acc.change(workspace ?? "personal", l.id, (x) => ({ ...x, tasks: [...x.tasks, ...made] }));
      return { list: l.name, added: made.map((t) => ({ id: t.id, title: t.title })) };
    },
  );

  tool(
    "update_task",
    "Changes a task or step: title, note, date (null to clear), repeat (null to stop), effort, minutes, priority, goal (null to unlink).",
    {
      task: z.string().describe("Task id"),
      title: z.string().min(1).max(500).optional(),
      note: z.string().max(20_000).optional(),
      due: day.nullable().optional(),
      repeat: z.string().nullable().optional(),
      effort: z.enum(EFFORTS).optional(),
      minutes: z.number().int().min(0).max(100_000).optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      goal: z.string().nullable().optional(),
      workspace: ws,
    },
    async ({ task, workspace, ...p }) => changeTask(workspace ?? "personal", task, (ts) => mapTask(ts, task, (t) => patchTask(t, p))),
  );

  tool(
    "complete_task",
    "Ticks a task or step done (done: false unticks). A repeating task makes its next one. Finished tasks earn karma points.",
    { task: z.string(), done: z.boolean().optional().describe("Default true"), workspace: ws },
    async ({ task, done, workspace }) => changeTask(workspace ?? "personal", task, (ts) => setDone(ts, task, done !== false, todayISO(), me())),
  );

  tool(
    "schedule_task",
    "Puts a task on a day of the calendar, or takes it off (date null).",
    { task: z.string(), date: day.nullable(), workspace: ws },
    async ({ task, date, workspace }) => changeTask(workspace ?? "personal", task, (ts) => mapTask(ts, task, (t) => patchTask(t, { due: date }))),
  );

  tool(
    "move_task",
    "Moves a task to another list, or makes it a step of another task (under_task).",
    { task: z.string(), to_list: z.string().optional(), under_task: z.string().optional(), workspace: ws },
    async ({ task, to_list, under_task, workspace }) => {
      const w = workspace ?? "personal";
      const lists = await acc.lists(w);
      const from = findTask(lists, task);
      if (!from) throw new Error(`No task with id ${task}.`);
      const parent = under_task ? findTask(lists, under_task) : null;
      if (under_task && (!parent || parent.parent)) throw new Error("under_task must be a task, not a step.");
      const to = parent ? parent.list : to_list ? pick(lists.filter((x) => !x.kind || x.kind === "ideas"), to_list) : null;
      if (!to) throw new Error("Say where: to_list or under_task.");
      if (parent && from.task.sub?.length) throw new Error("A task with its own steps can't become a step.");
      const moved = parent ? { ...from.task, sub: [] } : from.task;
      const put = (ts: Task[]) => (parent ? mapTask(ts, parent.task.id, (p) => ({ ...p, sub: [...p.sub, moved] })) : [...ts, moved]);
      if (to.id === from.list.id) await acc.change(w, to.id, (l) => ({ ...l, tasks: put(takeTask(l.tasks, task)[0]) }));
      else {
        await acc.change(w, to.id, (l) => ({ ...l, tasks: put(l.tasks) }));
        await acc.change(w, from.list.id, (l) => ({ ...l, tasks: takeTask(l.tasks, task)[0] }));
      }
      return `Moved "${from.task.title}" ${parent ? `under "${parent.task.title}"` : `to "${to.name}"`}.`;
    },
  );

  async function toBin(w: string, lists: List[], tasks: Task[], from: List) {
    const bin = lists.find((l) => l.kind === "bin");
    const entries = tasks.map((t) => binEntry(t, from));
    if (bin) await acc.change(w, bin.id, (l) => ({ ...l, tasks: [...entries, ...freshBin(l.tasks)] }));
    else await acc.create(w, { id: uid() + uid(), name: "Bin", tasks: entries, kind: "bin" });
  }
  tool(
    "delete_task",
    "Deletes a task or step. It goes to the Bin, where it can be restored for 7 days.",
    { task: z.string(), workspace: ws },
    async ({ task, workspace }) => {
      const w = workspace ?? "personal";
      const lists = await acc.lists(w);
      const at = findTask(lists.filter((l) => !l.kind || l.kind === "ideas"), task);
      if (!at) throw new Error(`No task with id ${task}.`);
      await toBin(w, lists, [at.task], at.list);
      await acc.change(w, at.list.id, (l) => ({ ...l, tasks: takeTask(l.tasks, task)[0] }));
      return `"${at.task.title}" is in the Bin for 7 days.`;
    },
  );

  tool(
    "search",
    "Finds tasks, steps, notes, lists, ideas, goals and rewards by words.",
    { query: z.string().min(1), workspace: ws },
    async ({ query, workspace }) => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const hit = (...s: (string | undefined)[]) => words.every((w) => s.some((x) => x?.toLowerCase().includes(w)));
      const lists = await acc.lists(workspace);
      const out: Record<string, unknown>[] = [];
      for (const l of lists.filter((x) => !x.kind || x.kind === "ideas")) {
        const name = l.kind === "ideas" ? "Brainstorm" : l.name;
        if (hit(l.name) && !l.kind) out.push({ kind: "list", id: l.id, name });
        for (const t of l.tasks)
          for (const x of [t, ...(t.sub ?? [])])
            if (hit(x.title, x.note)) out.push({ kind: x === t ? "task" : "step", id: x.id, title: x.title, done: x.done, list: name, ...(x.due ? { due: x.due } : {}) });
      }
      for (const i of items(lists)) {
        if (i.t === "goal" && hit(i.title, i.why)) out.push({ kind: "goal", id: i.id, title: i.title });
        if (i.t === "reward" && hit(i.title)) out.push({ kind: "reward", id: i.id, title: i.title, cost: i.cost });
      }
      return out.slice(0, 100);
    },
    false,
  );

  // ── Calendar ──
  tool(
    "get_calendar",
    "Tasks with a date between from and to (inclusive), across all lists, by day.",
    { from: day, to: day, workspace: ws },
    async ({ from, to, workspace }) => calendar(await acc.lists(workspace), from, to),
    false,
  );

  // ── Goals ──
  tool(
    "get_goals",
    "Goals with their progress: habits (times a week), daily amounts, numbers to reach, milestones.",
    { workspace: ws },
    async ({ workspace }) => {
      const lists = await acc.lists(workspace);
      const xs = items(lists);
      const tasks = allTasks(lists);
      return xs
        .filter((i): i is Goal => i.t === "goal")
        .map((g) => {
          const p = goalProgress(g, tasks, xs);
          const progress =
            g.kind === "target"
              ? `${p.current ?? "–"} of ${g.target ?? "?"} ${g.unit ?? ""}`.trim()
              : g.kind === "daily"
                ? `${p.today} of ${g.target ?? "?"} ${g.unit ?? ""} today`.trim()
                : g.kind === "habit"
                  ? `${p.thisWeek} of ${g.perWeek ?? 1} this week`
                  : `${p.done} of ${p.total} steps done`;
          return clean({ id: g.id, title: g.title, kind: g.kind, progress, reached: g.done ? true : undefined, by: g.by, why: g.why, list: g.list });
        });
    },
    false,
  );

  const goalShape = {
    title: z.string().min(1).max(120).optional(),
    why: z.string().max(1000).optional(),
    unit: z.string().max(20).optional().describe('e.g. "km", "glasses", "₹"'),
    start: z.number().optional().describe("Number to reach: where it starts"),
    target: z.number().optional().describe("Number to reach, or daily amount"),
    per_week: z.number().int().min(1).max(7).optional().describe("Habit: times a week"),
    by: day.optional().describe("Milestones: the date to finish by"),
    list: z.string().optional().describe("List id it belongs to (shows at the top of that list)"),
  };
  const goalFields = (a: { why?: string; unit?: string; start?: number; target?: number; per_week?: number; by?: string; list?: string }) =>
    clean<Partial<Goal>>({ why: a.why, unit: a.unit, start: a.start, target: a.target, perWeek: a.per_week, by: a.by, list: a.list });

  tool(
    "add_goal",
    "Adds a goal. kind: habit (times a week), daily (an amount each day), target (a number to reach), outcome (milestones: link tasks to it).",
    { ...goalShape, title: z.string().min(1).max(120), kind: z.enum(["habit", "daily", "target", "outcome"]), workspace: ws },
    async ({ title, kind, workspace, ...rest }) => {
      const g: Goal = { t: "goal", id: uid() + uid(), title: title.trim(), kind, created: Date.now(), ...goalFields(rest) };
      if (kind === "habit" && !g.perWeek) g.perWeek = 3;
      await changeGoals(workspace ?? "personal", (xs) => [...xs, g]);
      return { id: g.id, title: g.title, kind };
    },
  );

  const findGoal = (xs: GoalItem[], id: string) => {
    const g = xs.find((i): i is Goal => i.t === "goal" && (i.id === id || i.title.toLowerCase() === id.toLowerCase()));
    if (!g) throw new Error(`No goal "${id}". Use get_goals for ids.`);
    return g;
  };
  tool(
    "update_goal",
    "Changes a goal, or marks it reached (reached: true).",
    { goal: z.string().describe("Goal id or title"), ...goalShape, reached: z.boolean().optional(), workspace: ws },
    async ({ goal, workspace, title, reached, ...rest }) => {
      let name = "";
      await changeGoals(workspace ?? "personal", (xs) => {
        const g = findGoal(xs, goal);
        name = title ?? g.title;
        const next = clean<Goal>({ ...g, ...goalFields(rest), ...(title ? { title: title.trim() } : {}), done: reached === undefined ? g.done : reached ? Date.now() : undefined });
        return xs.map((i) => (i === g ? next : i));
      });
      return `Updated "${name}".`;
    },
  );

  tool(
    "log_goal",
    "Logs progress on a goal: a habit check-in for today (value 1), an amount for a daily goal, or the current number for a number-to-reach goal.",
    { goal: z.string(), value: z.number().optional().describe("Default 1"), workspace: ws },
    async ({ goal, value, workspace }) => {
      let name = "";
      await changeGoals(workspace ?? "personal", (xs) => {
        const g = findGoal(xs, goal);
        name = g.title;
        if (g.kind === "outcome") throw new Error("Milestone goals move forward by finishing their linked tasks.");
        return logGoal(xs, g, value ?? 1, Date.now(), () => uid() + uid(), me());
      });
      return `Logged ${value ?? 1} on "${name}".`;
    },
  );

  tool(
    "delete_goal",
    "Deletes a goal and its logged progress. Confirm with the person first.",
    { goal: z.string(), workspace: ws },
    async ({ goal, workspace }) => {
      let name = "";
      await changeGoals(workspace ?? "personal", (xs) => {
        const g = findGoal(xs, goal);
        name = g.title;
        return xs.filter((i) => i !== g && !(i.t === "log" && i.goal === g.id));
      });
      return `Deleted the goal "${name}".`;
    },
  );

  // ── Rewards ──
  const points = (lists: List[]) => balance(reconcile(items(lists), allTasks(lists), todayISO(), me()), me());
  tool(
    "get_rewards",
    "Rewards the person set for themselves, what each costs in karma points, and how many points they have to spend.",
    { workspace: ws },
    async ({ workspace }) => {
      const lists = await acc.lists(workspace);
      const have = points(lists);
      return {
        points: have,
        rewards: items(lists)
          .filter((i): i is Reward => i.t === "reward")
          .map((r) => ({ id: r.id, title: r.title, cost: r.cost, affordable: have >= r.cost })),
      };
    },
    false,
  );

  tool(
    "add_reward",
    "Adds a reward to save karma points for. A typical task earns about 5 to 15 points.",
    { title: z.string().min(1).max(80), cost: z.number().int().min(1).max(100_000), workspace: ws },
    async ({ title, cost, workspace }) => {
      const r: Reward = { t: "reward", id: uid() + uid(), title: title.trim(), cost };
      await changeGoals(workspace ?? "personal", (xs) => [...xs, r]);
      return { id: r.id, title: r.title, cost };
    },
  );

  tool(
    "redeem_reward",
    "Spends karma points on a reward (when the person has enough).",
    { reward: z.string().describe("Reward id or title"), workspace: ws },
    async ({ reward, workspace }) => {
      let msg = "";
      await changeGoals(workspace ?? "personal", (xs, lists) => {
        const r = xs.find((i): i is Reward => i.t === "reward" && (i.id === reward || i.title.toLowerCase() === reward.toLowerCase()));
        if (!r) throw new Error(`No reward "${reward}".`);
        const all = reconcile(xs, allTasks(lists), todayISO(), me());
        const have = balance(all, me());
        if (have < r.cost) throw new Error(`"${r.title}" costs ${r.cost} points; there are ${have}.`);
        msg = `Enjoy "${r.title}"! ${have - r.cost} points left.`;
        return [...all, { t: "win", id: uid() + uid(), title: r.title, at: Date.now(), xp: -r.cost, spend: true, ...(me() ? { by: me() } : {}) }];
      });
      return msg;
    },
  );

  tool(
    "delete_reward",
    "Deletes a reward.",
    { reward: z.string(), workspace: ws },
    async ({ reward, workspace }) => {
      let name = "";
      await changeGoals(workspace ?? "personal", (xs) => {
        const r = xs.find((i) => i.t === "reward" && (i.id === reward || i.title.toLowerCase() === reward.toLowerCase()));
        if (!r) throw new Error(`No reward "${reward}".`);
        name = (r as Reward).title;
        return xs.filter((i) => i !== r);
      });
      return `Deleted the reward "${name}".`;
    },
  );
}
