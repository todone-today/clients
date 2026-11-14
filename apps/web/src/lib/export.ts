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

// One task as a Markdown page: its details readable at the top, then the task line in todone's own Markdown (the
// format the CLI, Obsidian sync and import read, steps included), the description, attachment names and the notes.
export function taskMarkdown(t: Task, goal?: string): string {
  const facts = [
    t.done ? "Done" : "",
    t.due ? `Day: ${t.due}${t.at ? ` ${t.at}` : ""}` : "",
    t.est ? `How long: ${fmtMinutes(t.est)}` : "",
    t.spent ? `Time spent: ${fmtMinutes(t.spent)}` : "",
    t.pri ? `Priority: ${PRI[t.pri - 1]}` : "",
    t.effort ? `Effort: ${t.effort.toUpperCase()}` : "",
    t.rep ? `Repeats: ${repeatLabel(t.rep)}` : "",
    goal ? `Goal: ${goal}` : "",
  ].filter(Boolean);
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
