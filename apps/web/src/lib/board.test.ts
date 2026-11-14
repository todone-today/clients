import { test } from "node:test";
import assert from "node:assert/strict";
import { board } from "./board.ts";
import { parse } from "@todone/sdk/tasks";

const ts = parse(
  "- [ ] b late 📅 2026-10-30\n- [x] a done\n- [ ] c today ⏱ 2h 📅 2026-10-31\n- [ ] d\n  - [ ] step late 📅 2026-10-01\n- [ ] e ⏱ 15m\n",
);
const names = (xs: typeof ts) => xs.map((t) => t.title.split(" ")[0]).join("");

test("filters notes, counting their steps", () => {
  assert.equal(names(board(ts, "open", "mine", "2026-10-31")), "bcde");
  assert.equal(names(board(ts, "done", "mine", "2026-10-31")), "a");
  assert.equal(names(board(ts, "today", "mine", "2026-10-31")), "c");
  assert.equal(names(board(ts, "late", "mine", "2026-10-31")), "bd");
  assert.equal(names(board(ts, "undated", "mine", "2026-10-31")), "de");
});

test("sorts by due date, estimate or name, undated last", () => {
  assert.equal(names(board(ts, "all", "due", "2026-10-31")), "bcade");
  assert.equal(names(board(ts, "all", "est", "2026-10-31")), "ecbad");
  assert.equal(names(board(ts, "all", "name", "2026-10-31")), "abcde");
  assert.equal(board(ts, "all", "mine", "2026-10-31"), ts);
});

test("sorts by priority, none last", () => {
  const xs = parse("- [ ] low 🔽\n- [ ] none\n- [ ] high ⏫\n- [ ] mid 🔼\n");
  assert.equal(board(xs, "all", "pri", "2026-10-31").map((t) => t.title).join(" "), "high mid low none");
});

test("a repeating task waits for its day before showing as open", () => {
  const xs = parse("- [x] Stretch 📅 2026-10-31\n- [ ] Stretch 🔁 every day 📅 2026-11-01\n- [ ] Plan 📅 2026-11-05\n");
  assert.equal(board(xs, "open", "mine", "2026-10-31").map((t) => t.title).join(","), "Plan"); // tomorrow's repeat waits
  assert.equal(board(xs, "open", "mine", "2026-11-01").map((t) => t.title).join(","), "Stretch,Plan");
  assert.equal(board(xs, "all", "mine", "2026-10-31").length, 3);
});

test("Open keeps a weekly repeat a day early and a daily one done today, not a daily one early", async () => {
  const { parse, tick, todayISO, nextDue } = await import("@todone/sdk/tasks");
  const today = todayISO(); // "done today" is the device's day, so the test runs on it
  const tomorrow = nextDue(today, "every day");
  const [daily] = parse(`- [ ] Stretch 🔁 every day 📅 ${today}\n`);
  const [weekly] = parse(`- [ ] Gym 🔁 every week 📅 ${tomorrow}\n`);
  const [later] = parse(`- [ ] Rent 🔁 every month 📅 ${nextDue(nextDue(today, "every week"), "every week")}\n`);
  const after = tick([daily], daily.id, today); // done today + tomorrow's copy
  const shown = board([...after, weekly, later], "open", "mine", today).map((t) => `${t.title}:${t.done}:${t.due}`);
  assert.deepEqual(shown, [`Stretch:true:${today}`, `Gym:false:${tomorrow}`]);
});
