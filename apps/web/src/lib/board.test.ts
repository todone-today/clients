import { test } from "node:test";
import assert from "node:assert/strict";
import { board } from "./board.ts";
import { parse } from "./tasks.ts";

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
