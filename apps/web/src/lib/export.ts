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
  site?: string; // where todone is, for the web page's footer
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
    `Status: ${t.done ? `Done${t.doneAt ? `, ${when(t.doneAt)}` : ""}` : "Open"}`,
    t.created ? `Created: ${when(t.created)}` : "",
    t.due ? `Day: ${t.due}${t.at ? ` ${t.at}` : ""}` : "",
    t.est ? `How long: ${fmtMinutes(t.est)}` : "",
    t.spent ? `Time spent: ${fmtMinutes(t.spent)}` : "",
    t.pri ? `Priority: ${PRI[t.pri - 1]}` : "",
    t.effort ? `Effort: ${t.effort.toUpperCase()}` : "",
    t.rep ? `Repeats: ${repeatLabel(t.rep)}` : "",
    goal ? `Goal: ${goal}` : "",
    t.sub.length ? `Steps: ${t.sub.filter((s) => s.done).length} of ${t.sub.length} done` : "",
    x.page ? `Shared by link: ${x.page}` : "Privacy: End-to-end encrypted",
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

// A web page that opens anywhere, printable, in todone's own look (sticker cards, ink keylines, hard shadows), with its
// pictures and files inside it. Fonts come from Google Fonts when online and fall back to the system's otherwise;
// the text is escaped, never run. The footer tells whoever gets the file what todone is.
export function taskHtml(t: Task, goal?: string, x: Extra = {}): string {
  const files = filesOf(t, x);
  const site = x.site ?? "https://todone.today";
  const facts = factsOf(t, goal, x);
  const parts = [
    `<header class="card head${t.done ? " done" : ""}"><span class="box">${t.done ? "✓" : ""}</span><h1>${esc(t.title)}</h1></header>`,
    `<section class="card facts"><dl>${facts
      .map((f) => {
        const i = f.indexOf(": ");
        return `<div><dt>${esc(f.slice(0, i))}</dt><dd>${link(f.slice(i + 2))}</dd></div>`;
      })
      .join("")}</dl></section>`,
    t.sub.length
      ? `<h2>Steps</h2><ul class="card steps">${t.sub.map((s) => `<li${s.done ? ' class="done"' : ""}><span class="box">${s.done ? "✓" : ""}</span>${esc(s.title)}</li>`).join("")}</ul>`
      : "",
    t.note?.trim() ? `<h2>Description</h2><section class="card text">${para(t.note)}</section>` : "",
    files.length ? `<h2>Attachments</h2><section class="card files">${files.map((f) => fileHtml(f, x)).join("")}</section>` : "",
    ...threads(t, x).map(
      ([head, notes]) =>
        `<h2>${head}</h2>${notes
          .map(
            (n) =>
              `<article class="card note"><p class="who"><b>${esc(n.who)}</b> <small>${when(n.at)}</small></p>${n.text ? para(n.text) : ""}${(n.files ?? [])
                .map((f) => fileHtml(f, x))
                .join("")}</article>`,
          )
          .join("")}`,
    ),
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)} · todone</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@800;900&family=Schibsted+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--ink:#0b0b0b;--cream:#fff8ef;--raise:#f3eadb;--lime:#d4f04a;--butter:#ffe066;--pink:#ff90b3;--muted:#5b544c;--display:"Big Shoulders","Arial Narrow",sans-serif;--sans:"Schibsted Grotesk",system-ui,sans-serif}
*{box-sizing:border-box}
body{max-width:46rem;margin:0 auto;padding:2rem 1.25rem 3rem;font:16px/1.55 var(--sans);color:var(--ink);background:var(--cream)}
.brand{display:flex;align-items:center;gap:.5rem;margin:0 0 1.75rem;font:900 1.5rem/1 var(--display);text-transform:uppercase;color:var(--ink);text-decoration:none}
.brand i{display:grid;place-items:center;width:1.4rem;height:1.4rem;font-style:normal;font-size:1rem;background:var(--lime);border:2.5px solid var(--ink)}
.card{background:#fff;border:2.5px solid var(--ink);box-shadow:5px 5px 0 var(--ink)}
.head{display:flex;gap:.9rem;align-items:flex-start;padding:1.25rem 1.4rem;background:var(--lime);rotate:-.6deg}
.head h1{margin:0;font:900 clamp(2.2rem,7vw,3.4rem)/.95 var(--display);text-transform:uppercase;overflow-wrap:anywhere}
.head.done h1{text-decoration:line-through 4px}
.box{display:inline-grid;place-items:center;flex:none;width:1.6rem;height:1.6rem;margin-top:.3rem;font-weight:900;color:var(--lime);background:#fff;border:2.5px solid var(--ink)}
.done>.box,.steps .done .box{background:var(--ink)}
.facts{margin-top:1.4rem;padding:.4rem 1.1rem;background:var(--cream)}
.facts dl{margin:0}.facts div{display:grid;grid-template-columns:8.5rem 1fr;gap:.75rem;padding:.55rem 0;border-bottom:1.5px dashed #0b0b0b33}.facts div:last-child{border:0}
dt{font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding-top:.15rem}dd{margin:0;font-weight:700;overflow-wrap:anywhere}
h2{margin:2.2rem 0 .7rem;font:900 1.6rem/1 var(--display);text-transform:uppercase}
.steps{margin:0;padding:.4rem 1rem;list-style:none}.steps li{display:flex;gap:.65rem;align-items:center;padding:.45rem 0;font-weight:700}.steps .box{width:1.25rem;height:1.25rem;margin:0;font-size:.8rem}.steps .done{color:var(--muted);text-decoration:line-through 2px}
.text,.files{padding:.4rem 1.1rem}
.note{margin:0 0 .9rem;padding:.8rem 1.1rem;background:var(--cream);box-shadow:4px 4px 0 var(--ink)}.note:nth-of-type(even){rotate:.3deg}.who{margin:0}small{color:var(--muted);font-weight:600}
figure{margin:.8rem 0}img{display:block;max-width:100%;height:auto;border:2.5px solid var(--ink)}figcaption{margin-top:.35rem;font-size:.85rem;font-weight:700}
.file{font-size:.95rem;font-weight:600}a{color:inherit;text-decoration-thickness:2px;text-underline-offset:.2em}
.cta{margin-top:3rem;padding:1.5rem 1.4rem;color:var(--cream);background:var(--ink);box-shadow:6px 6px 0 var(--lime)}
.cta p{margin:0}.cta .big{font:900 2rem/1 var(--display);text-transform:uppercase;color:var(--lime)}.cta .sub{margin:.5rem 0 1.1rem;color:#d8d0c4}
.cta nav{display:flex;flex-wrap:wrap;gap:.7rem}.cta a{padding:.6rem 1rem;font-weight:800;text-decoration:none;color:var(--ink);background:var(--lime);border:2.5px solid var(--cream);box-shadow:3px 3px 0 var(--cream)}.cta a+a{background:var(--cream)}
.cta small{display:block;margin-top:1.1rem;color:#a39b8f}
@media print{.card,.note,.cta{box-shadow:none}.head{rotate:0deg}.cta{color:var(--ink);background:#fff;border:2px solid var(--ink)}.cta .big{color:var(--ink)}.cta .sub,.cta small{color:var(--muted)}img{max-height:60vh}}
</style></head><body>
<a class="brand" href="${esc(site)}"><i>✓</i>todone</a>
${parts.filter(Boolean).join("\n")}
<footer class="cta">
<p class="big">Made with todone</p>
<p class="sub">Sticky-note to-dos you drag onto a day, goals with XP and rewards, and Ask todone to turn your day into tasks, in any language. Private by design: lists are end-to-end encrypted. Free to start.</p>
<nav><a href="${esc(site)}/app?new=1">Sign up free</a><a href="${esc(site)}/demo">Try it, no account</a></nav>
<small>${esc(savedLine(x))} · ${esc(site.replace(/^https?:\/\//, ""))}</small>
</footer>
</body></html>
`;
}
