"use client";

// Feedback as tickets, for the account that maintains todone (the server's FEEDBACK_TO): what people send from
// "Send feedback" is filed into three lists as tasks, so it can be worked through and ticked off like anything else.
// The server hands new feedback to that account only (everyone else gets none); this files it, encrypted like any list.
import { type List, type Task, uid } from "@todone/sdk/tasks";
import { api } from "@/lib/api";
import { add, update } from "@/lib/store";

type Ticket = { id: string; kind: string; body: string; page: string | null; createdAt: string; email: string; name: string };
export const TICKET_LISTS: Record<string, string> = { bug: "Bug reports", idea: "Suggestions", other: "Other feedback" };

// A ticket: its first line as the title, the whole message, who sent it, when and from where as the note.
export const ticketTask = (t: Ticket): Task => {
  const first = t.body.trim().split("\n")[0].trim();
  return {
    id: uid(),
    title: first.length > 100 ? `${first.slice(0, 99)}…` : first,
    done: false,
    sub: [],
    note: `${t.body.trim()}\n\n— ${t.name || "Someone"} <${t.email}> · ${new Date(t.createdAt).toLocaleString()}${t.page ? ` · ${t.page}` : ""}`,
    ...(t.kind === "bug" ? { pri: 1 as const } : {}),
  };
};

export async function fileFeedback(lists: List[]) {
  const got = await api<Ticket[]>("POST", "/feedback/take").catch(() => []);
  for (const [kind, name] of Object.entries(TICKET_LISTS)) {
    const tasks = got.filter((t) => (TICKET_LISTS[t.kind] ? t.kind : "other") === kind).map(ticketTask);
    if (!tasks.length) continue;
    const list = lists.find((l) => !l.kind && l.name === name);
    if (list) update(list.id, (l) => ({ ...l, tasks: [...l.tasks, ...tasks] }));
    else add(name, tasks);
  }
}
