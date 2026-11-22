import { type Task, doneToday, lateBy, upcoming, waiting } from "@todone/sdk/tasks";

// Filtering and sorting the board. A note counts for a filter if it or one of its steps does.
export type Show = "all" | "open" | "done" | "today" | "late" | "undated";
export type Sort = "mine" | "due" | "est" | "pri" | "name";
export const SHOWS: [Show, string][] = [
  ["all", "All"],
  ["open", "Open"],
  ["done", "Done"],
  ["today", "Today"],
  ["late", "Late"],
  ["undated", "No date"],
];
export const SORTS: [Sort, string][] = [
  ["mine", "My order"],
  ["due", "Due date"],
  ["est", "How long"],
  ["pri", "Priority"],
  ["name", "A–Z"],
];
// A view: a named filter someone saved ("Due this week", "Urgent"), shown as a tab above the board.
export type When = "any" | "today" | "late" | "week" | "undated" | "dated" | "timed";
export type View = { id: string; name: string; status: "all" | "open" | "done"; when: When; high?: boolean };
export const ALL: View = { id: "all", name: "All", status: "all", when: "any" };
export const WHENS: [When, string][] = [
  ["any", "Any day"],
  ["today", "Today"],
  ["late", "Late"],
  ["week", "Next 7 days"],
  ["dated", "Has a date"],
  ["timed", "Has a time"],
  ["undated", "No date"],
];
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
// Does one task (or step) fit the view?
export function fits(v: View, t: Task, today: string, nowMin = 0) {
  if (v.status === "open" && t.done) return false;
  if (v.status === "done" && !t.done) return false;
  if (v.high && (t.pri ?? 4) > 1) return false;
  const week = addDays(today, 7);
  switch (v.when) {
    case "today":
      return t.due === today;
    case "late":
      return lateBy(t, today, nowMin) !== null;
    case "week":
      return !!t.due && t.due >= today && t.due <= week;
    case "dated":
      return !!t.due;
    case "timed":
      return !!t.at;
    case "undated":
      return !t.due;
    default:
      return true;
  }
}

export function board(tasks: Task[], show: Show | View, sort: Sort, today: string, nowMin = 0): Task[] {
  if (typeof show !== "string") {
    // A view: a note shows if it fits, or one of its steps does.
    const v = show;
    const shown = v.id === "all" ? tasks : tasks.filter((t) => fits(v, t, today, nowMin) || t.sub.some((x) => fits(v, x, today, nowMin)));
    return board(shown, "all", sort, today, nowMin);
  }
  const is: Record<Show, (t: Task) => boolean> = {
    all: () => true,
    // Open also keeps a repeat that's close (faded, "up next") and one finished today ("done for today").
    open: (t) => (!t.done && (!waiting(t, today) || upcoming(t, today))) || doneToday(t, today),
    done: (t) => t.done,
    today: (t) => !t.done && t.due === today,
    late: (t) => lateBy(t, today, nowMin) !== null,
    undated: (t) => !t.done && !t.due,
  };
  const shown = show === "all" ? tasks : tasks.filter((t) => is[show](t) || (show !== "undated" && t.sub.some(is[show])));
  const last = "\uffff"; // undated and unestimated tasks sort last
  const by: Record<Sort, ((a: Task, b: Task) => number) | null> = {
    mine: null,
    due: (a, b) => (a.due ?? last).localeCompare(b.due ?? last) || (a.at ?? "").localeCompare(b.at ?? ""),
    est: (a, b) => (a.est ?? Infinity) - (b.est ?? Infinity),
    pri: (a, b) => (a.pri ?? 4) - (b.pri ?? 4),
    name: (a, b) => a.title.localeCompare(b.title),
  };
  return by[sort] ? [...shown].sort(by[sort]!) : shown;
}

// Pasted lines as ideas: one per line, without list marks ("- ", "* ", "1. ", "- [ ] ").
export const ideaLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/, "").trim().slice(0, 500))
    .filter(Boolean);
