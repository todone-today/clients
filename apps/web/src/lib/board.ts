import type { Task } from "./tasks.ts";

// Filtering and sorting the board. A note counts for a filter if it or one of its steps does.
export type Show = "all" | "open" | "done" | "today" | "late" | "undated";
export type Sort = "mine" | "due" | "est" | "name";
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
  ["name", "A–Z"],
];
export function board(tasks: Task[], show: Show, sort: Sort, today: string): Task[] {
  const is: Record<Show, (t: Task) => boolean> = {
    all: () => true,
    open: (t) => !t.done,
    done: (t) => t.done,
    today: (t) => !t.done && t.due === today,
    late: (t) => !t.done && !!t.due && t.due < today,
    undated: (t) => !t.done && !t.due,
  };
  const shown = show === "all" ? tasks : tasks.filter((t) => is[show](t) || (show !== "undated" && t.sub.some(is[show])));
  const last = "\uffff"; // undated and unestimated tasks sort last
  const by: Record<Sort, ((a: Task, b: Task) => number) | null> = {
    mine: null,
    due: (a, b) => (a.due ?? last).localeCompare(b.due ?? last) || (a.at ?? "").localeCompare(b.at ?? ""),
    est: (a, b) => (a.est ?? Infinity) - (b.est ?? Infinity),
    name: (a, b) => a.title.localeCompare(b.title),
  };
  return by[sort] ? [...shown].sort(by[sort]!) : shown;
}
