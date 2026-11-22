// The training: about five minutes of missions that teach todone by doing it, for XP. Built on two findings about
// progress: people finish more when they start with some already done (endowed progress: two missions come ticked,
// "you've already started"), and they speed up near the end (the goal gradient: the last missions pay the most).
// Guided missions point at the control; "your turn" missions don't, so it sticks; then guided again, and so on.
// Every mission checks itself off from what's really in the lists and goals, not from button presses.
import type { GoalItem } from "@todone/sdk/goals";
import type { Task } from "@todone/sdk/tasks";

export type Counts = {
  lists: number;
  tasks: number;
  pri: number;
  due: number;
  done: number;
  goals: number;
  rewards: number;
  spends: number;
};

// How much of each thing there is now: normal lists and their tasks (steps included), goals, rewards, claims.
export function measure(lists: { kind?: string; tasks: Task[] }[], items: GoalItem[]): Counts {
  const tasks = lists.filter((l) => !l.kind).flatMap((l) => l.tasks.flatMap((t) => [t, ...t.sub]));
  return {
    lists: lists.filter((l) => !l.kind).length,
    tasks: tasks.length,
    pri: tasks.filter((t) => t.pri).length,
    due: tasks.filter((t) => t.due).length,
    done: tasks.filter((t) => t.done).length,
    goals: items.filter((i) => i.t === "goal").length,
    rewards: items.filter((i) => i.t === "reward").length,
    spends: items.filter((i) => i.t === "win" && i.spend).length,
  };
}

export type Mission = {
  id: string;
  title: string;
  how: string; // what to do
  phone?: string; // what to do, where a phone differs
  mode: "given" | "guided" | "solo";
  target?: string; // the data-tour spot to point at
  phoneTarget?: string;
  xp: number;
  done: (base: Counts, now: Counts) => boolean;
};

export const MISSIONS: Mission[] = [
  { id: "account", title: "Made your account", how: "", mode: "given", xp: 0, done: () => true },
  { id: "open", title: "Opened your notebook", how: "", mode: "given", xp: 0, done: () => true },
  {
    id: "list",
    title: "Make a list",
    how: "Lists hold your tasks: one for work, one for home, one for a trip. Type a name under Lists, like “This week”, and press Enter.",
    phone: "Lists hold your tasks: one for work, one for home, one for a trip. Tap ☰, type a name under Lists, like “This week”, and tap +.",
    mode: "guided",
    target: "newlist",
    phoneTarget: "menu",
    xp: 10,
    done: (b, n) => n.lists > b.lists,
  },
  {
    id: "task",
    title: "Add a task",
    how: "Write something you need to do in the bar at the bottom and press Enter. Each task is a sticky note.",
    mode: "guided",
    target: "ask",
    xp: 10,
    done: (b, n) => n.tasks > b.tasks,
  },
  {
    id: "tasks",
    title: "Your turn: add two more tasks",
    how: "Anything on your mind today. You know how now.",
    mode: "solo",
    target: "ask",
    xp: 15,
    done: (b, n) => n.tasks >= b.tasks + 3,
  },
  {
    id: "priority",
    title: "Give a task a priority",
    how: "Priorities are stickers. Click a task to open it, then pick High, Medium or Low. (Or drag a priority sticker onto the note.)",
    phone: "Priorities are stickers. Tap a task to open it, then tap High, Medium or Low.",
    mode: "guided",
    target: "board",
    xp: 15,
    done: (b, n) => n.pri > b.pri,
  },
  {
    id: "due",
    title: "Your turn: put a task on a day",
    how: "Same idea, a different sticker: give a task Today or Tomorrow.",
    mode: "solo",
    target: "board",
    xp: 20,
    done: (b, n) => n.due > b.due,
  },
  {
    id: "tick",
    title: "Tick a task done",
    how: "Tick the box on a note. Done tasks earn XP, and XP buys rewards.",
    mode: "guided",
    target: "board",
    xp: 20,
    done: (b, n) => n.done > b.done,
  },
  {
    id: "goal",
    title: "Set a goal",
    how: "Goals are the bigger things your tasks add up to. Open Goals and press New goal: pick one of the ideas or write your own.",
    mode: "guided",
    target: "goals",
    xp: 25,
    done: (b, n) => n.goals > b.goals,
  },
  {
    id: "reward",
    title: "Your turn: add a reward",
    how: "Something you'd enjoy, paid for with XP. Open Rewards and pick a small one, under 60 XP, so you can claim it in a minute.",
    mode: "solo",
    target: "rewards",
    xp: 25,
    done: (b, n) => n.rewards > b.rewards,
  },
  {
    id: "finish",
    title: "Your turn: finish two more tasks",
    how: "Back to your list and tick two more. Watch the XP climb toward your reward.",
    mode: "solo",
    target: "board",
    xp: 30,
    done: (b, n) => n.done >= b.done + 3,
  },
  {
    id: "claim",
    title: "Claim your reward",
    how: "Open Rewards and claim it. You earned it. That's the whole loop: tasks, XP, treats.",
    mode: "guided",
    target: "rewards",
    xp: 40,
    done: (b, n) => n.spends > b.spends,
  },
];

export const TOTAL_XP = MISSIONS.reduce((n, m) => n + m.xp, 0);

// Where the training stands: the first mission not done yet (missions go in order), past `from`.
export function nextMission(from: number, base: Counts, now: Counts) {
  let i = from;
  while (i < MISSIONS.length && MISSIONS[i].done(base, now)) i++;
  return i;
}
