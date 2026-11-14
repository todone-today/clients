import { type Task, fmtMinutes, repeatLabel, serialize } from "@todone/sdk/tasks";

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
const when = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

// What a task says besides its title, as short lines, shared by every format.
function factsOf(t: Task, goal?: string) {
  return [
    t.done ? "Done" : "",
    t.due ? `Day: ${t.due}${t.at ? ` ${t.at}` : ""}` : "",
    t.est ? `How long: ${fmtMinutes(t.est)}` : "",
    t.spent ? `Time spent: ${fmtMinutes(t.spent)}` : "",
    t.pri ? `Priority: ${PRI[t.pri - 1]}` : "",
    t.effort ? `Effort: ${t.effort.toUpperCase()}` : "",
    t.rep ? `Repeats: ${repeatLabel(t.rep)}` : "",
    goal ? `Goal: ${goal}` : "",
  ].filter(Boolean);
}

// One task as a Markdown page: its details readable at the top, then the task line in todone's own Markdown (the
// format the CLI, Obsidian sync and import read, steps included), the description, attachment names and the notes.
export function taskMarkdown(t: Task, goal?: string): string {
  const facts = factsOf(t, goal);
  const out = [`# ${t.title}`, ""];
  if (facts.length) out.push(...facts.map((f) => `- ${f}`), "");
  out.push(serialize([t]).trimEnd(), "");
  if (t.note?.trim()) out.push("## Description", "", t.note.trim(), "");
  if (t.files?.length) out.push("## Attachments", "", ...t.files.map((f) => `- ${f.name}`), "");
  const notes = t.history ?? [];
  if (notes.length)
    out.push(
      "## Notes",
      "",
      ...notes.flatMap((n) => [
        `**${n.who}**, ${when(n.at)}`,
        "",
        ...(n.text ? [n.text, ""] : []),
        ...(n.files ?? []).map((f) => `- ${f.name}`),
        ...(n.files?.length ? [""] : []),
      ]),
    );
  return out.join("\n").trimEnd() + "\n";
}

// Plain text: the same page without Markdown's marks, for anywhere that shows text as it is.
export function taskText(t: Task, goal?: string): string {
  const box = (x: Task) => (x.done ? "[x]" : "[ ]");
  const out = [t.title.toUpperCase(), ""];
  const facts = factsOf(t, goal);
  if (facts.length) out.push(...facts, "");
  if (t.sub.length) out.push("Steps", ...t.sub.map((x) => `${box(x)} ${x.title}`), "");
  if (t.note?.trim()) out.push("Description", t.note.trim(), "");
  if (t.files?.length) out.push("Attachments", ...t.files.map((f) => `- ${f.name}`), "");
  for (const n of t.history ?? []) out.push(`${n.who}, ${when(n.at)}`, ...(n.text ? [n.text] : []), ...(n.files ?? []).map((f) => `- ${f.name}`), "");
  return out.join("\n").trimEnd() + "\n";
}

const esc = (x: string) => x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const para = (x: string) => x.trim().split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");

// A web page that opens anywhere, printable, with nothing loaded from outside (the text is escaped, never run).
export function taskHtml(t: Task, goal?: string): string {
  const facts = factsOf(t, goal);
  const parts = [
    `<h1>${t.done ? "✓ " : ""}${esc(t.title)}</h1>`,
    facts.length ? `<ul class="facts">${facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : "",
    t.sub.length
      ? `<h2>Steps</h2><ul class="steps">${t.sub.map((x) => `<li${x.done ? ' class="done"' : ""}>${esc(x.title)}</li>`).join("")}</ul>`
      : "",
    t.note?.trim() ? `<h2>Description</h2>${para(t.note)}` : "",
    t.files?.length ? `<h2>Attachments</h2><ul>${t.files.map((f) => `<li>${esc(f.name)}</li>`).join("")}</ul>` : "",
    t.history?.length
      ? `<h2>Notes</h2>${t.history
          .map(
            (n) =>
              `<div class="note"><b>${esc(n.who)}</b> <small>${when(n.at)}</small>${n.text ? para(n.text) : ""}${
                n.files?.length ? `<ul>${n.files.map((f) => `<li>${esc(f.name)}</li>`).join("")}</ul>` : ""
              }</div>`,
          )
          .join("")}`
      : "",
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<style>
body{max-width:42rem;margin:3rem auto;padding:0 1.25rem;font:16px/1.55 system-ui,sans-serif;color:#0b0b0b;background:#fff8ef}
h1{font-size:2.2rem;line-height:1.1;margin:0 0 1rem}h2{font-size:1.1rem;margin:2rem 0 .5rem;text-transform:uppercase;letter-spacing:.04em}
.facts{display:flex;flex-wrap:wrap;gap:.4rem;padding:0;list-style:none}.facts li{padding:.15rem .55rem;border:2px solid #0b0b0b;background:#d4f04a;font-weight:700;font-size:.85rem}
.steps{list-style:none;padding:0}.steps li::before{content:"☐ "}.steps li.done{text-decoration:line-through;color:#6b645c}.steps li.done::before{content:"☑ "}
.note{padding:.75rem 0;border-top:1px solid #0b0b0b33}.note small{color:#6b645c}footer{margin-top:3rem;font-size:.8rem;color:#6b645c}
</style></head><body>
${parts.filter(Boolean).join("\n")}
<footer>Saved from todone</footer>
</body></html>
`;
}
