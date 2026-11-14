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
      history: [{ who: "Kartikey", at: new Date(2026, 10, 15, 10, 0).getTime(), text: "Ask Shaloni for a quote" }],
      created: new Date(2026, 10, 14, 9, 5).getTime(),
      sub: [{ id: "b", title: "Pick screenshots", done: true, sub: [] }],
    },
    "Launch todone",
    { list: "Work", open: "https://todone.today/app?task=a" },
  );
  assert.match(md, /^# Write the launch post\n/);
  assert.match(md, /- Day: 2026-11-20 09:30/);
  assert.match(md, /- Goal: Launch todone/);
  assert.match(md, /- List: Work/);
  assert.match(md, /- Created: 2026-11-14 09:05/);
  assert.match(md, /- Open in todone: https:\/\/todone\.today\/app\?task=a/);
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

test("the web page escapes what people typed", async () => {
  const { taskHtml, taskText } = await import("./export.ts");
  const t = { id: "a", title: "<script>alert(1)</script>", done: false, note: "a & b", sub: [{ id: "b", title: "step", done: true, sub: [] }] };
  const html = taskHtml(t);
  assert.ok(!html.includes("<script>alert"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /a &amp; b/);
  assert.match(taskText(t), /\[x\] step/);
});

test("files say where they open, and the web page carries them", async () => {
  const { taskHtml, taskMarkdown } = await import("./export.ts");
  const t = {
    id: "a",
    title: "Photos",
    done: false,
    sub: [],
    files: [
      { id: "p", name: "secret.jpg", type: "image/jpeg", size: 2000, enc: true as const },
      { id: "s", name: "plan.pdf", type: "application/pdf", size: 3_000_000 },
    ],
  };
  const x = { open: "https://todone.today/app?task=a", page: "https://todone.today/t/tok" };
  const md = taskMarkdown(t, undefined, x);
  assert.match(md, /secret\.jpg \(2 KB\) · end-to-end encrypted, open it in todone: https:\/\/todone\.today\/app\?task=a/);
  assert.match(md, /plan\.pdf \(3\.0 MB\) · https:\/\/todone\.today\/t\/tok/);
  const html = taskHtml(t, undefined, { ...x, data: new Map([["p", "data:image/jpeg;base64,AAAA"]]) });
  assert.match(html, /<img src="data:image\/jpeg;base64,AAAA" alt="secret\.jpg">/);
  assert.match(html, /plan\.pdf <small>3\.0 MB<\/small> · <a href="https:\/\/todone\.today\/t\/tok">/);
});
