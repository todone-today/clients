import { test } from "node:test";
import assert from "node:assert/strict";
import type { List, Task } from "@todone/sdk/tasks";
import { find } from "./search.ts";

const t = (id: string, title: string, more: Partial<Task> = {}): Task => ({ id, title, done: false, sub: [], ...more });
const list = (id: string, name: string, tasks: Task[], kind?: List["kind"]): List => ({ id, name, tasks, kind, updated: 0, version: 1 });

const lists = [
  list("a", "Work", [
    t("1", "Send the invoice", { sub: [t("1a", "Find invoice number")] }),
    t("2", "Call Priya", { note: "Ask about the launch date and the invoice." }),
    t("3", "Invoice archive", { done: true }),
  ]),
  list("b", "Home", [t("4", "buy milk")]),
  list("bin", "Bin", [t("5", "old invoice")], "bin"),
];

test("matches names, steps and notes across lists, every word, any case", () => {
  assert.deepEqual(find(lists, "INVOICE").map((h) => h.task.id), ["1", "1a", "2", "3"]);
  assert.deepEqual(find(lists, "milk buy").map((h) => h.task.id), ["4"]);
  assert.equal(find(lists, "invoice").find((h) => h.task.id === "1a")!.step, true);
});

test("open before done, skips the bin, empty search finds nothing", () => {
  const ids = find(lists, "invoice").map((h) => h.task.id);
  assert.equal(ids.at(-1), "3");
  assert.ok(!ids.includes("5"));
  assert.deepEqual(find(lists, "   "), []);
});

test("a note match shows a snippet around the word", () => {
  const h = find(lists, "launch")[0];
  assert.equal(h.task.id, "2");
  assert.match(h.snippet!, /launch date/);
});
