import { test } from "node:test";
import assert from "node:assert/strict";
import { validGoalItems } from "@todone/sdk/goals";
import { GOAL_AREAS, GOAL_TEMPLATES, REWARD_AREAS, REWARD_TEMPLATES, asGoal, goalNote, matches } from "./templates.ts";

test("goal templates: over 100, every area used, no two alike", () => {
  assert.ok(GOAL_TEMPLATES.length >= 100, `${GOAL_TEMPLATES.length} goal templates`);
  for (const a of GOAL_AREAS) assert.ok(GOAL_TEMPLATES.some((t) => t.area === a), a);
  assert.ok(GOAL_TEMPLATES.every((t) => (GOAL_AREAS as readonly string[]).includes(t.area)));
  assert.equal(new Set(GOAL_TEMPLATES.map((t) => t.title.toLowerCase())).size, GOAL_TEMPLATES.length);
});

test("goal templates: each saves as a valid goal of its kind", () => {
  // One at a time: a workspace holds at most 100 goals, and there are more templates than that.
  GOAL_TEMPLATES.forEach((t, i) =>
    assert.ok(validGoalItems([{ t: "goal", id: `goal-template-${i}`, created: 1, ...asGoal(t) }]), t.title),
  );
  for (const t of GOAL_TEMPLATES) {
    assert.ok(t.title.length <= 80, t.title);
    if (t.kind === "habit") assert.ok(t.perWeek! >= 1 && t.perWeek! <= 7, t.title);
    if (t.kind === "daily" || t.kind === "target") assert.ok(t.target! > 0 && !!t.unit, t.title);
    if (t.kind === "target") assert.notEqual(t.start, t.target, t.title);
  }
});

test("reward templates: varied, sized, every area used", () => {
  assert.ok(REWARD_TEMPLATES.length >= 50);
  for (const a of REWARD_AREAS) assert.ok(REWARD_TEMPLATES.some((t) => t.area === a), a);
  // Priced as the app prices them (size × XP a task, 15 for someone new), each saves as a valid reward.
  REWARD_TEMPLATES.forEach((t, i) =>
    assert.ok(validGoalItems([{ t: "reward", id: `reward-template-${i}`, title: t.title, cost: t.size * 15 }]), t.title),
  );
  assert.equal(new Set(REWARD_TEMPLATES.map((t) => t.title.toLowerCase())).size, REWARD_TEMPLATES.length);
});

test("goalNote says how it's measured; search matches every word, any order", () => {
  assert.equal(goalNote({ area: "Food", title: "x", kind: "habit", perWeek: 5 }), "A habit · 5× a week");
  assert.equal(goalNote({ area: "Money", title: "x", kind: "target", start: 0, target: 50000, unit: "₹" }), "A number to reach · 50,000 ₹");
  assert.ok(matches("water glasses", "Drink 8 glasses of water", "Food"));
  assert.ok(matches("FOOD", "Cook dinner at home", "Food"));
  assert.ok(!matches("run gym", "Run 5 km", "Health"));
  assert.ok(matches("", "anything"));
  assert.deepEqual(asGoal({ area: "Food", title: "Cook", kind: "habit", perWeek: 5 }), { title: "Cook", kind: "habit", perWeek: 5 });
});
