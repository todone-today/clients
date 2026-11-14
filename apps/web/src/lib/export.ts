import { type FileRef, type Kept, type Task, fmtMinutes, repeatLabel, serialize } from "@todone/sdk/tasks";

// Hands the browser a file to save, made here: nothing goes to the server.
export function save(name: string, type: string, text: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// A file name from a title: what the OS accepts, never empty.
export const fileName = (title: string, ext: string) =>
  `${title.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "task"}.${ext}`;

const PRI = ["High", "Medium", "Low"];
const pad = (n: number) => String(n).padStart(2, "0");
// Local time, the way the person saw it in the app.
export const when = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const size = (n: number) => (n < 1e6 ? `${Math.max(1, Math.round(n / 1e3))} KB` : `${(n / 1e6).toFixed(1)} MB`);

// What the caller knows besides the task: the list it's in, where it opens in todone, and for a shared task its
// conversation, attachments and public page (those live on the server, not in the task). `data` holds files as
// data: URLs, for the web page to carry them inside it.
export type Extra = {
  list?: string;
  open?: string; // the task in the app
  page?: string; // the shared task's public page
  talk?: Kept[];
  files?: FileRef[];
  data?: Map<string, string>;
  now?: number;
};
const threads = (t: Task, x: Extra) =>
  (
    [
      ["Notes", t.history ?? []],
      ["Conversation", x.talk ?? []],
    ] as const
  ).filter(([, ns]) => ns.length);
const filesOf = (t: Task, x: Extra) => x.files ?? t.files ?? [];

// Where a file can be opened from outside todone: a shared one on the task's public page; a private one is end-to-end
// encrypted, so only in todone.
const whereIs = (f: FileRef, x: Extra) =>
  !f.enc && x.page ? x.page : `end-to-end encrypted, open it in todone${x.open ? `: ${x.open}` : ""}`;
const fileLine = (f: FileRef, x: Extra) => `${f.name} (${size(f.size)}) · ${whereIs(f, x)}`;

// What a task says besides its title, as short lines, shared by every format.
function factsOf(t: Task, goal: string | undefined, x: Extra) {
  return [
    x.list ? `List: ${x.list}` : "",
    t.done ? `Done${t.doneAt ? `: ${when(t.doneAt)}` : ""}` : "Open",
    t.created ? `Created: ${when(t.created)}` : "",
    t.due ? `Day: ${t.due}${t.at ? ` ${t.at}` : ""}` : "",
    t.est ? `How long: ${fmtMinutes(t.est)}` : "",
    t.spent ? `Time spent: ${fmtMinutes(t.spent)}` : "",
    t.pri ? `Priority: ${PRI[t.pri - 1]}` : "",
    t.effort ? `Effort: ${t.effort.toUpperCase()}` : "",
    t.rep ? `Repeats: ${repeatLabel(t.rep)}` : "",
    goal ? `Goal: ${goal}` : "",
    t.sub.length ? `Steps: ${t.sub.filter((s) => s.done).length} of ${t.sub.length} done` : "",
    x.page ? `Shared by link: ${x.page}` : "End-to-end encrypted",
    x.open ? `Open in todone: ${x.open}` : "",
  ].filter(Boolean);
}
const savedLine = (x: Extra) => `Saved from todone on ${when(x.now ?? Date.now())}`;

// One task as a Markdown page: its details readable at the top, then the task line in todone's own Markdown (the
// format the CLI, Obsidian sync and import read, steps included), the description, attachments and the notes.
export function taskMarkdown(t: Task, goal?: string, x: Extra = {}): string {
  const facts = factsOf(t, goal, x);
  const out = [`# ${t.title}`, ""];
  if (facts.length) out.push(...facts.map((f) => `- ${f}`), "");
  out.push(serialize([t]).trimEnd(), "");
  if (t.note?.trim()) out.push("## Description", "", t.note.trim(), "");
  const files = filesOf(t, x);
  if (files.length) out.push("## Attachments", "", ...files.map((f) => `- ${fileLine(f, x)}`), "");
  for (const [head, notes] of threads(t, x))
    out.push(
      `## ${head}`,
      "",
      ...notes.flatMap((n) => [
        `**${n.who}**, ${when(n.at)}`,
        "",
        ...(n.text ? [n.text, ""] : []),
        ...(n.files ?? []).map((f) => `- ${fileLine(f, x)}`),
        ...(n.files?.length ? [""] : []),
      ]),
    );
  out.push("---", "", `_${savedLine(x)}_`);
  return out.join("\n").trimEnd() + "\n";
}

// Plain text: the same page without Markdown's marks, for anywhere that shows text as it is.
export function taskText(t: Task, goal?: string, x: Extra = {}): string {
  const box = (s: Task) => (s.done ? "[x]" : "[ ]");
  const out = [t.title.toUpperCase(), ""];
  out.push(...factsOf(t, goal, x), "");
  if (t.sub.length) out.push("STEPS", ...t.sub.map((s) => `${box(s)} ${s.title}`), "");
  if (t.note?.trim()) out.push("DESCRIPTION", t.note.trim(), "");
  const files = filesOf(t, x);
  if (files.length) out.push("ATTACHMENTS", ...files.map((f) => `- ${fileLine(f, x)}`), "");
  for (const [head, notes] of threads(t, x)) {
    out.push(head.toUpperCase(), "");
    for (const n of notes) out.push(`${n.who}, ${when(n.at)}`, ...(n.text ? [n.text] : []), ...(n.files ?? []).map((f) => `- ${fileLine(f, x)}`), "");
  }
  out.push(savedLine(x));
  return out.join("\n").trimEnd() + "\n";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const para = (s: string) => s.trim().split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
const link = (s: string) => (/^https?:\/\//.test(s) ? `<a href="${esc(s)}">${esc(s)}</a>` : esc(s));
const fact = (f: string) => {
  const i = f.indexOf(": ");
  return i < 0 ? esc(f) : `<b>${esc(f.slice(0, i))}</b> ${link(f.slice(i + 2))}`;
};

// A file in the web page: an image shows in it, any other file carried inside it downloads from it; one that was
// too big to carry says where it can be opened.
function fileHtml(f: FileRef, x: Extra) {
  const d = x.data?.get(f.id);
  const cap = `${esc(f.name)} <small>${size(f.size)}</small>`;
  if (d && f.type.startsWith("image/")) return `<figure><img src="${d}" alt="${esc(f.name)}"><figcaption>${cap}</figcaption></figure>`;
  if (d) return `<p class="file"><a download="${esc(f.name)}" href="${d}">${cap}</a></p>`;
  const where = whereIs(f, x);
  return `<p class="file">${cap} · ${where.startsWith("http") ? link(where) : where.replace(/(https?:\/\/\S+)/, (u) => link(u))}</p>`;
}

// A web page that opens anywhere, printable, with its pictures and files inside it and nothing loaded from outside
// (the text is escaped, never run).
export function taskHtml(t: Task, goal?: string, x: Extra = {}): string {
  const files = filesOf(t, x);
  const parts = [
    `<h1>${t.done ? "✓ " : ""}${esc(t.title)}</h1>`,
    `<ul class="facts">${factsOf(t, goal, x)
      .map((f) => `<li>${fact(f)}</li>`)
      .join("")}</ul>`,
    t.sub.length
      ? `<h2>Steps</h2><ul class="steps">${t.sub.map((s) => `<li${s.done ? ' class="done"' : ""}>${esc(s.title)}</li>`).join("")}</ul>`
      : "",
    t.note?.trim() ? `<h2>Description</h2>${para(t.note)}` : "",
    files.length ? `<h2>Attachments</h2>${files.map((f) => fileHtml(f, x)).join("")}` : "",
    ...threads(t, x).map(
      ([head, notes]) =>
        `<h2>${head}</h2>${notes
          .map(
            (n) =>
              `<div class="note"><b>${esc(n.who)}</b> <small>${when(n.at)}</small>${n.text ? para(n.text) : ""}${(n.files ?? [])
                .map((f) => fileHtml(f, x))
                .join("")}</div>`,
          )
          .join("")}`,
    ),
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<style>
body{max-width:44rem;margin:3rem auto;padding:0 1.25rem;font:16px/1.55 system-ui,sans-serif;color:#0b0b0b;background:#fff8ef}
h1{font-size:2.2rem;line-height:1.1;margin:0 0 1rem}h2{font-size:1.05rem;margin:2.2rem 0 .6rem;text-transform:uppercase;letter-spacing:.05em}
.facts{display:grid;gap:.3rem;margin:0;padding:.9rem 1rem;list-style:none;background:#fff;border:2px solid #0b0b0b;box-shadow:4px 4px 0 #d4f04a}
.facts b{display:inline-block;min-width:7.5rem}
.steps{list-style:none;padding:0}.steps li::before{content:"☐ "}.steps li.done{text-decoration:line-through;color:#6b645c}.steps li.done::before{content:"☑ "}
.note{padding:.85rem 0;border-top:1px solid #0b0b0b33}small{color:#6b645c}
figure{margin:.75rem 0}img{display:block;max-width:100%;height:auto;border:2px solid #0b0b0b}figcaption{margin-top:.3rem;font-size:.85rem}
.file{font-size:.92rem}a{color:inherit;text-underline-offset:.2em}footer{margin-top:3rem;font-size:.8rem;color:#6b645c}
@media print{.facts{box-shadow:none}img{max-height:60vh}}
</style></head><body>
${parts.filter(Boolean).join("\n")}
<footer>${esc(savedLine(x))}</footer>
</body></html>
`;
}
