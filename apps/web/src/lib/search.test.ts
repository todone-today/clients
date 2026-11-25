import { test } from "node:test";
import assert from "node:assert/strict";
import type { List, Task } from "@todone/sdk/tasks";
import { find } from "./search.ts";

const t = (id: string, title: string, more: Partial<Task> = {}): Task => ({ id, title, done: false, sub: [], ...more });
const list = (id: string, name: string, tasks: Task[], kind?: List["kind"]): List => ({ id, name, tasks, kind, updated: 0, version: 1 });

const goals = [
  { t: "goal", id: "g1", title: "Read 12 books", kind: "outcome", why: "Less scrolling, more invoices of the mind", created: 0 },
  { t: "reward", id: "r1", title: "Movie night", cost: 60 },
] as unknown as Task[];
const lists = [
  list("a", "Work", [
    t("1", "Send the invoice", { sub: [t("1a", "Find invoice number")] }),
    t("2", "Call Priya", { note: "Ask about the launch date and the invoice." }),
    t("3", "Invoice archive", { done: true }),
  ]),
  list("b", "Home", [t("4", "buy milk")]),
  list("bin", "Bin", [t("5", "old invoice")], "bin"),
  list("i", "Brainstorm", [t("6", "Invoice app idea")], "ideas"),
  list("g", "Goals", goals, "goals"),
];
const ids = (q: string, kind = "task") => find(lists, q).filter((h) => h.kind === kind).map((h) => h.id);

test("matches names, steps and notes across lists, every word, any case", () => {
  assert.deepEqual(ids("INVOICE"), ["1", "1a", "2", "3"]);
  assert.deepEqual(ids("milk buy"), ["4"]);
  assert.equal(find(lists, "invoice").find((h) => h.id === "1a")!.step, true);
});

test("open before done; the bin, ideas, goals (by why too), rewards and list names are found as their own kinds", () => {
  assert.equal(ids("invoice").at(-1), "3");
  assert.deepEqual(ids("invoice", "bin"), ["5"]);
  assert.deepEqual(ids("invoice", "idea"), ["6"]);
  assert.deepEqual(ids("invoices", "goal"), ["g1"]);
  assert.deepEqual(ids("movie", "reward"), ["r1"]);
  assert.deepEqual(ids("home", "list"), ["b"]);
  assert.deepEqual(find(lists, "   "), []);
});

test("a note match shows a snippet around the word", () => {
  const h = find(lists, "launch")[0];
  assert.equal(h.id, "2");
  assert.match(h.snippet!, /launch date/);
});
