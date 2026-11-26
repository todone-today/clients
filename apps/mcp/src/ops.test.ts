import { test } from "node:test";
import assert from "node:assert/strict";
import { validTasks, type List } from "@todone/sdk/tasks";
import { calendar, findTask, freshBin, newTask, patchTask, setDone, takeTask } from "./ops.ts";
import { parseCode } from "./account.ts";

const list = (tasks: List["tasks"], name = "Home"): List => ({ id: "list0001", name, tasks, updated: 0, version: 1 });

test("new tasks pass the server's check, with steps and only what's set", () => {
  const t = newTask({ title: " Pack ", due: "2026-12-01", repeat: "every week", effort: "m", priority: "high", steps: ["Chargers"] });
  assert.equal(t.title, "Pack");
  assert.equal(t.pri, 1);
  assert.equal(t.sub[0].title, "Chargers");
  assert.ok(!("note" in t));
  assert.ok(validTasks([t]));
  assert.throws(() => newTask({ title: "x", repeat: "sometimes" }));
});

test("patch: null clears a date or repeat, unknown repeats are refused", () => {
  const t = newTask({ title: "Gym", due: "2026-12-01", repeat: "every day" });
  const p = patchTask(t, { due: null, repeat: null, title: "Gym!" });
  assert.equal(p.due, undefined);
  assert.equal(p.rep, undefined);
  assert.equal(p.title, "Gym!");
  assert.ok(validTasks([p]));
  assert.throws(() => patchTask(t, { repeat: "whenever" }));
});

test("ticking: a repeat rolls forward, a step ticks alone, finding and taking steps", () => {
  const rep = newTask({ title: "Water plants", due: "2026-12-01", repeat: "every day" });
  const one = newTask({ title: "Trip", steps: ["Tickets", "Bags"] });
  const after = setDone([rep, one], rep.id, true, "2026-12-01", "u1");
  assert.equal(after.length, 3);
  assert.ok(after[0].done);
  assert.equal(after.find((t) => !t.done && t.title === "Water plants")?.due, "2026-12-02");
  const step = one.sub[0].id;
  const s = setDone([one], step, true, "2026-12-01");
  assert.ok(s[0].sub[0].done && !s[0].done);
  assert.equal(findTask([list(s)], step)?.parent?.id, one.id);
  const [rest, got] = takeTask(s, step);
  assert.equal(got?.title, "Tickets");
  assert.equal(rest[0].sub.length, 1);
});

test("calendar: dated tasks and steps between two days, in order", () => {
  const a = newTask({ title: "Late", due: "2026-12-05" });
  const b = newTask({ title: "Early", due: "2026-12-02", steps: [] });
  b.sub = [{ ...newTask({ title: "Step", due: "2026-12-03" }), sub: [] }];
  const c = newTask({ title: "Outside", due: "2027-01-01" });
  assert.deepEqual(calendar([list([a, b, c])], "2026-12-01", "2026-12-31").map((x) => x.title), ["Early", "Step", "Late"]);
});

test("the Bin keeps a week", () => {
  const now = Date.now();
  const old = { ...newTask({ title: "old" }), binnedAt: now - 8 * 86_400_000, from: "x", fromName: "x" };
  const recent = { ...newTask({ title: "new" }), binnedAt: now - 1000, from: "x", fromName: "x" };
  assert.deepEqual(freshBin([old, recent], now).map((t) => t.title), ["new"]);
});

test("connection code: token and secret, anything else refused", () => {
  const code = `tdn_${"a".repeat(43)}.${"b".repeat(43)}`;
  assert.deepEqual(parseCode(` ${code} `), { token: `tdn_${"a".repeat(43)}`, secret: "b".repeat(43) });
  assert.throws(() => parseCode("tdn_short.x"));
});
