import type { GoalItem } from "@todone/sdk/goals";
import type { Task } from "@todone/sdk/tasks";
import { add, update, useLists } from "@/lib/store";

// A workspace's goals, rewards and XP log live in its one list of kind "goals" (end-to-end encrypted like any list).
// Its "tasks" are GoalItems; this file is the only place that reads it that way.
export function useGoalItems() {
  const { lists } = useLists();
  const list = lists?.find((l) => l.kind === "goals");
  return {
    items: (list?.tasks ?? []) as unknown as GoalItem[],
    ready: !!lists,
  };
}

// Changes the goals list, making it on first use. The change is a function, so it's re-applied if someone else
// saved first (see store.update).
// ponytail: two tabs making the very first goal at the same moment could make two goals lists; the first one wins
// in useGoalItems. Merge them on load if that ever shows up.
export function changeGoals(
  lists: { id: string; kind?: string }[] | null,
  f: (items: GoalItem[]) => GoalItem[],
) {
  const list = lists?.find((l) => l.kind === "goals");
  if (list)
    update(list.id, (l) => ({
      ...l,
      tasks: f(l.tasks as unknown as GoalItem[]) as unknown as Task[],
    }));
  else {
    const items = f([]);
    if (items.length) add("Goals", items as unknown as Task[], "goals");
  }
}
