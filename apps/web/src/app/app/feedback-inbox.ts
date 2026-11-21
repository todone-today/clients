"use client";

// Feedback as tickets, for the account that maintains todone (the server's FEEDBACK_TO): what people send from
// "Send feedback" is filed into one list, Feedback, as tasks (a bug or an idea says so in its name), so it can be worked
// through and ticked off like anything else.
// The server hands new feedback to that account only (everyone else gets none); this files it, encrypted like any list.
import { type List, type Task, uid } from "@todone/sdk/tasks";
import { api } from "@/lib/api";
import { add, update } from "@/lib/store";

type Ticket = { id: string; kind: string; body: string; page: string | null; createdAt: string; email: string; name: string };
export const FEEDBACK_LIST = "Feedback";
const KIND: Record<string, string> = { bug: "Bug: ", idea: "Idea: " };
// Before there was one list, each kind had its own; they're folded into Feedback the first time it's filed.
const OLD: Record<string, string> = { "Bug reports": "bug", Suggestions: "idea", "Other feedback": "other" };

// A ticket: its first line as the title; the whole message (and the page it came from) as a note from whoever sent it.
export const ticketTask = (t: Ticket): Task => {
  const first = (KIND[t.kind] ?? "") + t.body.trim().split("\n")[0].trim();
  return {
    id: uid(),
    title: first.length > 100 ? `${first.slice(0, 99)}…` : first,
    done: false,
    sub: [],
    history: [
      {
        who: `${t.name || "Someone"} <${t.email}>`,
        at: Date.parse(t.createdAt) || Date.now(),
        text: `${t.body.trim().slice(0, 3900)}${t.page ? `\n\nFrom ${t.page}` : ""}`,
      },
    ],
    ...(t.kind === "bug" ? { pri: 1 as const } : {}),
  };
};

export async function fileFeedback(lists: List[]) {
  const got = await api<Ticket[]>("POST", "/feedback/take").catch(() => []);
  // The old three lists, only when all three are there (as the maintainer's were): their tasks move, named by kind.
  const old = Object.keys(OLD).map((name) => lists.find((l) => !l.kind && l.name === name));
  const moved = old.every(Boolean)
    ? old.flatMap((l) => l!.tasks.map(({ note, ...t }) => ({
        ...t,
        title: (KIND[OLD[l!.name]] ?? "") + t.title,
        ...(note ? { history: [...(t.history ?? []), { who: "Feedback", at: Date.now(), text: note }] } : {}),
      })))
    : [];
  const tasks = [...moved, ...got.map(ticketTask)];
  if (!tasks.length && !old.every(Boolean)) return;
  const list = lists.find((l) => !l.kind && l.name === FEEDBACK_LIST);
  if (list) update(list.id, (l) => ({ ...l, tasks: [...l.tasks, ...tasks] }));
  else add(FEEDBACK_LIST, tasks);
  if (old.every(Boolean)) for (const l of old) update(l!.id, () => null);
}
