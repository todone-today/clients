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
