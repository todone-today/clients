import type { GoalItem } from "@todone/sdk/goals";
import type { List, Task } from "@todone/sdk/tasks";

// What a search found. Tasks and their steps (by name or note) in your lists, a list by its name, an idea on the
// Brainstorm board, a goal (by its name or why), a reward, or a task in the Bin.
export type Kind = "task" | "list" | "idea" | "goal" | "reward" | "bin";
export type Hit = {
  kind: Kind;
  id: string; // the task's, list's, goal's or reward's
  title: string;
  list: List; // where it lives
  task?: Task; // for tasks, ideas and the Bin
  step?: boolean;
  done?: boolean;
  snippet?: string;
};

// Finds things across the whole workspace. It runs here, on the decrypted lists, so it works with end-to-end
// encryption and sends nothing anywhere.
export function find(lists: List[], q: string): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: Hit[] = [];
  // Every word in the name or the extra text; a snippet around the first word found only in the extra text.
  const match = (title: string, more = "") => {
    const t = title.toLowerCase();
    const m = more.toLowerCase();
    if (!words.every((w) => t.includes(w) || m.includes(w))) return null;
    const w = words.find((w) => !t.includes(w) && m.includes(w));
    const i = w ? m.indexOf(w) : -1;
    return { snippet: i < 0 ? undefined : (i > 30 ? "…" : "") + more.slice(Math.max(0, i - 30), i + 60).trim() };
  };
  for (const list of lists) {
    if (list.kind === "goals") {
      for (const it of list.tasks as unknown as GoalItem[]) {
        if (it.t === "goal") {
          const m = match(it.title, it.why ?? "");
          if (m) hits.push({ kind: "goal", id: it.id, title: it.title, list, done: !!it.done, ...m });
        } else if (it.t === "reward" && match(it.title)) hits.push({ kind: "reward", id: it.id, title: it.title, list });
      }
      continue;
    }
    const kind: Kind = list.kind === "ideas" ? "idea" : list.kind === "bin" ? "bin" : "task";
    if (!list.kind && match(list.name)) hits.push({ kind: "list", id: list.id, title: list.name, list });
    const walk = (ts: Task[], step: boolean) => {
      for (const task of ts) {
        const m = match(task.title, task.note ?? "");
        if (m) hits.push({ kind, id: task.id, title: task.title, list, task, step, done: task.done, ...m });
        walk(task.sub ?? [], true);
      }
    };
    walk(list.tasks, false);
  }
  // Within each kind: open first, then names that start with the search, then the rest in list order.
  const head = words[0];
  return hits
    .map((h, i) => ({ h, i, rank: (h.done ? 2 : 0) + (h.title.toLowerCase().startsWith(head) ? 0 : 1) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.h);
}
