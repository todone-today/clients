import { test } from "node:test";
import assert from "node:assert/strict";
import type { Win } from "@todone/sdk/goals";
import { recap } from "./recap.ts";

const now = new Date(2026, 10, 23, 20, 0); // Monday 23 November 2026, 8 pm, local time
const at = (daysAgo: number, hour: number) => new Date(2026, 10, 23 - daysAgo, hour, 0).getTime();
let n = 0;
const win = (t: number, xp = 10, spend = false): Win => ({ t: "win", id: `w${n++}`, title: "x", at: t, xp: spend ? -xp : xp, ...(spend ? { spend: true as const } : {}) });

test("recap sums the last 7 days: done, XP earned, active days, best day, claims; older ones don't count", () => {
  const r = recap([win(at(0, 10)), win(at(0, 11)), win(at(2, 15), 20), win(at(9, 10)), win(at(1, 12), 50, true)], now);
  assert.equal(r.done, 3);
  assert.equal(r.xp, 40);
  assert.equal(r.activeDays, 2);
  assert.deepEqual(r.best, { day: "Monday", n: 2 });
  assert.equal(r.claimed, 1);
  assert.deepEqual(r.perDay, [0, 0, 0, 0, 1, 0, 2]);
});

test("recap badges follow how the week really went", () => {
  const early = recap([0, 1, 2, 3, 4].map((d) => win(at(d, 7))), now);
  assert.equal(early.badge.name, "The 6 AM Finisher");
  const late = recap([0, 1, 2, 3, 4].map((d) => win(at(d, 22))), now);
  assert.equal(late.badge.name, "The Night Owl");
  const daily = recap([0, 1, 2, 3, 4, 5, 6].map((d) => win(at(d, 13))), now);
  assert.equal(daily.badge.name, "Unbreakable");
  assert.equal(recap([win(at(0, 13))], now).badge.name, "Off the Mark");
  assert.equal(recap([], now).badge.name, "Fresh Page");
});
