// The video's sample account: lists written in the app's own Markdown task format (read with its parser), plus the
// goals, rewards and XP log, and the edits the scenes make to them. Ids come from names and titles, so a note keeps
// its colour (the app picks it by id) from scene to scene.
import type { GoalItem } from "@todone/sdk/goals";
import { type List, type Task, parse, todayISO } from "@todone/sdk/tasks";
import { ME } from "./mocks/auth-client";

export const today = todayISO();
export const day = (n: number) => {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const slug = (s: string) => s.toLowerCase().replace(/\W+/g, "-");
const stable = (t: Task): Task => ({ ...t, id: `t-${slug(t.title)}`, sub: t.sub.map(stable) });
const tasks = (md: string): Task[] => parse(md).map(stable);
const list = (name: string, md: string, more: Partial<List> = {}): List => ({
  id: `list-${slug(name)}`,
  name,
  tasks: tasks(md),
  version: 1,
  updated: 0,
  ...more,
});
const goal = (g: string) => (t: Task) => ({ ...t, goal: g });

export const WEEK = "list-this-week";
export const FLIGHT = "t-book-flights-to-goa";
export const TYPED = "Book flights to Goa";

const DAY = 86_400_000;
const ago = (d: number) => Date.now() - d * DAY;

export function seed(): List[] {
  const week = list("This week", "- [ ] Call the landlord\n- [ ] Pack the chargers\n- [ ] Water the plants\n- [ ] Read 20 pages\n");
  week.tasks = week.tasks.map((t) => (t.title === "Read 20 pages" ? goal("g-read")(t) : t));
  const goa = list("Trip to Goa", "- [x] Pick the dates\n- [x] Book a stay near Anjuna\n- [ ] Rent a scooter\n- [ ] Pack sunscreen\n- [ ] Try the fish thali\n");
  goa.tasks = goa.tasks.map(goal("g-goa"));
  const items: GoalItem[] = [
    { t: "goal", id: "g-read", title: "Read before bed", kind: "habit", perWeek: 5, list: week.id, why: "Calmer evenings", created: ago(30) },
    { t: "goal", id: "g-run", title: "Run 10 km", kind: "target", start: 3, target: 10, unit: "km", why: "The Goa beach run", created: ago(40) },
    { t: "goal", id: "g-goa", title: "Plan the Goa trip", kind: "outcome", list: goa.id, by: day(20), created: ago(10) },
    { t: "reward", id: "r-movie", title: "Movie night", cost: 120 },
    { t: "reward", id: "r-book", title: "A new book", cost: 300 },
    { t: "reward", id: "r-away", title: "A weekend away", cost: 1500 },
    ...[0, 1, 2].map((d): GoalItem => ({ t: "log", id: `l-read-${d}`, goal: "g-read", at: ago(d), value: 1, by: ME.id })),
    ...([[30, 3], [14, 5], [3, 6.5]] as const).map(([d, v]): GoalItem => ({ t: "log", id: `l-run-${d}`, goal: "g-run", at: ago(d), value: v, by: ME.id })),
    ...["Paid the rent", "Fixed the tap", "Sent the photos", "Cleaned the desk", "Called the bank", "Booked the dentist", "Sorted the bills"].map(
      (title, i): GoalItem => ({ t: "win", id: `w-${i}`, title, at: ago(i + 1), xp: 20, by: ME.id }),
    ),
    // The two done Goa tasks, already counted (so they don't earn again when the app opens).
    ...goa.tasks.filter((t) => t.done).map((t): GoalItem => ({ t: "win", id: t.id, title: t.title, at: ago(2), xp: 20, by: ME.id, goal: "g-goa" })),
  ];
  return [
    week,
    goa,
    list("Groceries", "- [ ] Oat milk\n- [ ] Coffee beans\n- [ ] Bananas\n- [ ] Basil\n"),
    list("Work", `- [ ] Stand-up 📅 ${today} ⏰ 09:30 ⏱ 30m\n- [ ] Dentist 📅 ${day(2)} ⏰ 11:00 ⏱ 1h\n- [ ] Gym 📅 ${day(-1)} ⏰ 07:00 ⏱ 1h\n- [ ] Send the invoice\n- [ ] Review Kabir's design\n`),
    list("Brainstorm", "- [ ] A reading nook by the window\n- [ ] Learn to make pasta\n- [ ] Weekend in Hampi?\n- [ ] Start a herb garden\n", { kind: "ideas" }),
    { ...list("Goals", ""), kind: "goals" as const, tasks: items as unknown as Task[] },
  ].map((l, i) => ({ ...l, position: i + 1 }));
}

// ---- What the scenes do to "This week", in order (each scene starts from all the ones before it) -----------------
type Edit = (l: List) => List;
const onTask = (id: string, patch: Partial<Task>): Edit => (l) => ({ ...l, tasks: l.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
export const EDITS = {
  added: ((l) => ({ ...l, tasks: [...l.tasks, { id: FLIGHT, title: TYPED, done: false, sub: [] }] })) as Edit,
  today: onTask(FLIGHT, { due: today }),
  high: onTask(FLIGHT, { pri: 1 }),
  weekly: onTask("t-water-the-plants", { rep: "every week" }),
  step: ((l) => {
    const step = l.tasks.find((t) => t.id === "t-pack-the-chargers")!;
    return { ...l, tasks: l.tasks.filter((t) => t !== step).map((t) => (t.id === FLIGHT ? { ...t, sub: [...t.sub, step] } : t)) };
  }) as Edit,
  planned: onTask(FLIGHT, { due: day(1), at: "10:00", est: 90 }),
};
export type EditName = keyof typeof EDITS;
