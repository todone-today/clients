import { test } from "node:test";
import assert from "node:assert/strict";
import type { GoalItem } from "@todone/sdk/goals";
import type { Task } from "@todone/sdk/tasks";
import { MISSIONS, TOTAL_XP, measure, nextMission } from "./training.ts";

const task = (id: string, x: Partial<Task> = {}): Task => ({ id, title: id, done: false, sub: [], ...x });

test("measure counts normal lists' tasks and steps, goals, rewards and claims", () => {
  const lists = [
    { tasks: [task("a", { pri: 1, sub: [task("a1", { done: true })] }), task("b", { due: "2026-11-22" })] },
    { kind: "ideas", tasks: [task("idea")] },
  ];
  const items = [
    { t: "goal", id: "g", title: "Run", kind: "habit", created: 1 },
    { t: "reward", id: "r", title: "Cake", cost: 30 },
    { t: "win", id: "w", title: "Cake", at: 1, xp: -30, spend: true },
    { t: "win", id: "a1", title: "a1", at: 1, xp: 10 },
  ] as GoalItem[];
  assert.deepEqual(measure(lists, items), { lists: 1, tasks: 3, pri: 1, due: 1, done: 1, goals: 1, rewards: 1, spends: 1 });
});

test("missions: two come done (a head start), then each checks itself off from what's really there, in order", () => {
  const base = { lists: 1, tasks: 2, pri: 0, due: 0, done: 0, goals: 0, rewards: 0, spends: 0 };
  assert.equal(nextMission(0, base, base), 2); // account and open are given
  assert.equal(MISSIONS[2].id, "list");
  // A task added before the list doesn't skip the list: missions go in order.
  assert.equal(nextMission(2, base, { ...base, tasks: 3 }), 2);
  assert.equal(nextMission(2, base, { ...base, lists: 2, tasks: 3 }), 4); // list, then one task
  assert.equal(nextMission(4, base, { ...base, lists: 2, tasks: 5 }), 5); // three tasks in all
  const all = { lists: 2, tasks: 5, pri: 1, due: 1, done: 3, goals: 1, rewards: 1, spends: 1 };
  assert.equal(nextMission(2, base, all), MISSIONS.length);
});

test("missions pay more toward the end, and alternate guided with your turn", () => {
  const paid = MISSIONS.filter((m) => m.mode !== "given");
  for (let i = 1; i < paid.length; i++) assert.ok(paid[i].xp >= paid[i - 1].xp, paid[i].id);
  assert.ok(paid.some((m) => m.mode === "solo") && paid.some((m) => m.mode === "guided"));
  assert.equal(TOTAL_XP, paid.reduce((n, m) => n + m.xp, 0));
  assert.ok(MISSIONS.every((m) => m.mode === "given" || m.how));
});
