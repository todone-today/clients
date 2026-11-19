import type { List, Task } from "@todone/sdk/tasks";

export type Hit = { list: List; task: Task; step: boolean; snippet?: string };

// Finds tasks (their names, steps and notes) across every list in this workspace and opens the one picked. It runs
// here, on the decrypted lists, so it works with end-to-end encryption and sends nothing anywhere.
export function find(lists: List[], q: string): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: Hit[] = [];
  for (const list of lists) {
    if (list.kind) continue; // the bin, brainstorm and goals have their own pages
    const walk = (ts: Task[], step: boolean) => {
      for (const task of ts) {
        const title = task.title.toLowerCase();
        const note = (task.note ?? "").toLowerCase();
        if (words.every((w) => title.includes(w) || note.includes(w))) {
          const w = words.find((w) => !title.includes(w) && note.includes(w));
          const i = w ? note.indexOf(w) : -1;
          hits.push({
            list,
            task,
            step,
            snippet: i < 0 ? undefined : (i > 30 ? "…" : "") + task.note!.slice(Math.max(0, i - 30), i + 60).trim(),
          });
        }
        walk(task.sub, true);
      }
    };
    walk(list.tasks, false);
  }
  // Open tasks first, then names that start with the search, then the rest in list order.
  const head = words[0];
  return hits
    .map((h, i) => ({ h, i, rank: (h.task.done ? 2 : 0) + (h.task.title.toLowerCase().startsWith(head) ? 0 : 1) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.h);
}
