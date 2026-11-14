import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "@todone/sdk/tasks";
import { fileName, taskMarkdown } from "./export.ts";

test("a task becomes a readable page that todone can read back", () => {
  const md = taskMarkdown(
    {
      id: "a",
      title: "Write the launch post",
      done: false,
      due: "2026-11-20",
      at: "09:30",
      est: 45,
      pri: 1,
      note: "Draft in Notion first.",
      history: [{ who: "Kartikey", at: Date.UTC(2026, 10, 15, 10, 0), text: "Ask Shaloni for a quote" }],
      sub: [{ id: "b", title: "Pick screenshots", done: true, sub: [] }],
    },
    "Launch todone",
  );
  assert.match(md, /^# Write the launch post\n/);
  assert.match(md, /- Day: 2026-11-20 09:30/);
  assert.match(md, /- Goal: Launch todone/);
  assert.match(md, /## Description\n\nDraft in Notion first\./);
  assert.match(md, /\*\*Kartikey\*\*, 2026-11-15 10:00\n\nAsk Shaloni for a quote/);
  const [t] = parse(md);
  assert.equal(t.title, "Write the launch post");
  assert.equal(t.due, "2026-11-20");
  assert.equal(t.sub[0].title, "Pick screenshots");
  assert.equal(t.sub[0].done, true);
});

test("file names stay legal", () => {
  assert.equal(fileName('Buy: milk / eggs?', "md"), "Buy milk eggs.md");
  assert.equal(fileName("  ", "md"), "task.md");
});
