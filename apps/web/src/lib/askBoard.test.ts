import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlan } from "@todone/sdk/plan";
import { BIN, GOALS, REWARDS, REWARD_XP, commit, drop, fromPlan, newLists, newPlace, rename, titleOf } from "./askBoard.ts";

let n = 0;
const id = () => `d${String(++n).padStart(7, "0")}`;
const lists = [{ id: "work0001", name: "Work" }];
const plan = parsePlan(
  "- [ ] Loose\n## work\n- [ ] Call Rahul\n## Groceries\n- [ ] Milk\n## Goals\n- Gym | habit | 4 a week\n## Rewards\n- Movie night | 300 XP\n",
  id,
  0,
);

test("fromPlan places each where the AI put it; tasks with no list wait for one", () => {
  assert.deepEqual(
    fromPlan(plan, lists).map((d) => [titleOf(d), d.place]),
    [
      ["Loose", null],
      ["Call Rahul", "work0001"],
      ["Milk", newPlace("Groceries")],
      ["Gym", GOALS],
      ["Movie night", REWARDS],
    ],
  );
});

test("drop converts by place, keeps the title, and the bin removes", () => {
  let ds = fromPlan(plan, lists);
  const [loose, call, , gym, movie] = ds.map((d) => d.id);
  ds = drop(ds, call, GOALS, 5);
  ds = drop(ds, gym, "work0001");
  ds = drop(ds, loose, REWARDS);
  ds = drop(ds, movie, BIN);
  const by = Object.fromEntries(ds.map((d) => [titleOf(d), d]));
  assert.equal(by["Call Rahul"].kind, "goal");
  assert.equal(by["Call Rahul"].kind === "goal" && by["Call Rahul"].goal.kind, "outcome");
  assert.equal(by["Gym"].kind, "task");
  assert.equal(by["Loose"].kind === "reward" && by["Loose"].reward.cost, REWARD_XP);
  assert.equal(by["Movie night"], undefined);
});

test("commit groups lists (existing by id, new by name once), goals and rewards; the tray stays out", () => {
  let ds = fromPlan(plan, lists);
  ds = drop(ds, ds[0].id, newPlace("groceries")); // same new list, other case
  ds = rename(ds, ds[1].id, "  Call Rahul at 5  ");
  const c = commit(ds);
  assert.deepEqual(
    c.groups.map((g) => [g.listId ?? g.name, g.tasks.map((t) => t.title)]),
    [
      ["groceries", ["Loose", "Milk"]], // one list; the first spelling wins
      ["work0001", ["Call Rahul at 5"]],
    ],
  );
  assert.deepEqual([c.goals.length, c.rewards.length], [1, 1]);
  assert.deepEqual(commit(drop(ds, ds[1].id, null)).groups.map((g) => g.listId ?? g.name), ["groceries"]); // no list: left out
});

test("newLists: each name once, never one you already have", () => {
  const ds = fromPlan(plan, lists);
  assert.deepEqual(newLists(ds, ["groceries", "Trip", "WORK"], lists), ["Groceries", "Trip"]);
});

test("changes: drafts on the numbered tasks; applied, done ticks (a repeat comes back), delete bins, move takes it out", async () => {
  const { applyChanges, fromChanges, changeLabel } = await import("./askBoard.ts");
  const tasks = [
    { id: "t1", title: "Gym", done: false, rep: "every day", due: "2026-11-13", sub: [] },
    { id: "t2", title: "Old", done: false, sub: [{ id: "s1", title: "Step", done: false, sub: [] }] },
    { id: "t3", title: "Pack", done: false, sub: [] },
    { id: "t4", title: "Typo tittle", done: false, sub: [] },
  ];
  const cs = [
    { ref: 1, op: "done" as const },
    { ref: 2, op: "delete" as const, why: "Not needed" },
    { ref: 3, op: "move" as const, to: "Trip" },
    { ref: 4, op: "edit" as const, set: { title: "Typo title", pri: 1 as const } },
    { ref: 4, op: "delete" as const }, // a second change to the same task: dropped
    { ref: 99, op: "delete" as const }, // made up: dropped
  ];
  const refs = { 1: "t1", 2: "t2", 3: "t3", 4: "t4" };
  const ds = fromChanges(cs, refs, [{ id: "home0001", tasks }]);
  assert.deepEqual(ds.map((d) => [d.kind, d.place, titleOf(d)]), [
    ["change", "home0001", "Gym"],
    ["change", "home0001", "Old"],
    ["change", "home0001", "Pack"],
    ["change", "home0001", "Typo tittle"],
  ]);
  assert.equal(drop(ds, ds[0].id, GOALS)[0].kind, "change"); // a change can't be moved, only left out
  assert.equal(drop(ds, ds[0].id, BIN).length, 3);
  const { changes } = commit(ds);
  const r = applyChanges(tasks, changes.map((d) => d.change), changes.map((d) => d.task.id), "2026-11-13");
  assert.deepEqual(r.binned.map((t) => t.id), ["t2"]);
  assert.deepEqual(r.moved.map((m) => [m.task.id, m.to]), [["t3", "Trip"]]);
  assert.equal(r.tasks.find((t) => t.id === "t1")?.done, true);
  assert.equal(r.tasks.filter((t) => t.title === "Gym").length, 2); // the next one, due tomorrow
  assert.deepEqual([r.tasks.find((t) => t.id === "t4")?.title, r.tasks.find((t) => t.id === "t4")?.pri], ["Typo title", 1]);
  assert.equal(changeLabel(cs[3]), "Rename to “Typo title” · High priority");
});
