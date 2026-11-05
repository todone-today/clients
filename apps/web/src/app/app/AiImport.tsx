"use client";

import { useRef, useState } from "react";
import { Copy, Sparkles, Upload, X } from "lucide-react";
import { Select } from "@/components/Select";
import { label } from "@todone/sdk/calendar";
import { type List, type Task, parseLists, todayISO } from "@todone/sdk/tasks";
import s from "./app.module.css";

// The prompt people paste into any AI chat; it answers in the list format todone reads.
const prompt = (
  today: string,
  names: string[],
) => `Turn what I describe below into todo lists. Reply with only the lists, in exactly this format:

## List name
- [ ] Task name ⏱ 30m 📅 2026-11-02 ⏰ 09:30
  - [ ] A subtask (indent two spaces, one level only)

Rules:
- Put each task under a "## List name" line. ${
  names.length
    ? `My lists are: ${names.join(", ")}. Use one of those names exactly when a task fits it; otherwise make a short new list name.`
    : "Make short list names that group the tasks sensibly."
}
- Everything after the task name is optional. Leave a part out unless I said or clearly implied it.
- ⏱ is how long it takes: 15m, 30m, 1h, 1h30m, 2h.
- 📅 is the day it's due, as YYYY-MM-DD. Today is ${label(today, { weekday: "long" })} ${today}; work out "Friday", "next week" and so on from that.
- ⏰ is a start time, 24-hour HH:MM, only if I gave a time.
- Write "- [x]" for anything already done.
- No other headings, numbers, notes or code fences.

Here's what I need to do:
`;

// The answer as lists: each heading matched to a list you have (by name, ignoring case) or marked new; the same
// heading twice is one list.
type Group = { name: string | null; listId?: string; tasks: Task[] };
function plan(md: string, lists: List[]): Group[] {
  const out = new Map<string, Group>();
  for (const g of parseLists(md)) {
    const key = g.name?.toLowerCase() ?? "";
    const have = out.get(key);
    if (have) have.tasks.push(...g.tasks);
    else out.set(key, { ...g, listId: g.name ? lists.find((l) => l.name.toLowerCase() === key)?.id : undefined });
  }
  return [...out.values()];
}

// Import with AI: copy a prompt, paste the AI's answer; tasks land in the lists it names, adding to lists you
// have and making new ones for names you don't. Tasks under no list go where you pick. A .md file works too.
export function AiImport({
  lists,
  current,
  onAdd,
  onAppend,
}: {
  lists: List[];
  current: string | null;
  onAdd: (name: string, tasks: Task[]) => void;
  onAppend: (listId: string, tasks: Task[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState("");
  const [into, setInto] = useState<string>("");
  const [name, setName] = useState("From AI");
  const [copied, setCopied] = useState(false);
  const [today, setToday] = useState(""); // read when the dialog opens, not while the page renders
  const [err, setErr] = useState("");
  const groups = plan(answer, lists);
  const loose = groups.find((g) => g.name === null)?.tasks ?? [];
  const named = groups.filter((g) => g.name !== null);
  const all = groups.flatMap((g) => g.tasks).flatMap((t) => [t, ...t.sub]);
  const target = into || current || "new";

  const close = () => {
    dialog.current?.close();
    setAnswer("");
    setErr("");
  };
  // Named lists first, then the loose tasks; whichever is added last is the one that opens.
  const put = (gs: Group[], looseInto: string, looseName: string) => {
    for (const g of gs) {
      if (g.listId) onAppend(g.listId, g.tasks);
      else if (g.name !== null) onAdd(g.name, g.tasks);
    }
    const rest = gs.find((g) => g.name === null)?.tasks ?? [];
    if (!rest.length) return;
    if (looseInto === "new") onAdd(looseName, rest);
    else onAppend(looseInto, rest);
  };
  const save = () => {
    if (!all.length) return;
    put(groups, target, name.trim() || "From AI");
    close();
  };

  return (
    <div className={s.import}>
      <button
        className={s.ghost}
        data-tour="ai"
        onClick={() => {
          setInto(current ?? "new");
          setToday(todayISO());
          dialog.current?.showModal();
        }}
      >
        <Sparkles size={16} strokeWidth={2.5} /> Import with AI
      </button>

      <dialog ref={dialog} className={s.aiDialog} aria-labelledby="ai-title" onClose={close}>
        <div className={s.aiHead}>
          <h2 id="ai-title" className="display">
            Import with AI
          </h2>
          <button className={s.ghost} onClick={close} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <ol className={s.aiSteps}>
          <li>
            <p>
              <b>Copy this prompt</b> into ChatGPT, Claude or any AI, then add your plans after it: a brain dump, a
              meeting&apos;s notes, “plan my week”.
            </p>
            <pre className={s.code}>
              {today &&
                prompt(
                  today,
                  lists.map((l) => l.name),
                )}
            </pre>
            <button
              className="btn"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  prompt(
                    today,
                    lists.map((l) => l.name),
                  ),
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy size={16} strokeWidth={2.5} /> {copied ? "Copied" : "Copy prompt"}
            </button>
          </li>
          <li>
            <label htmlFor="ai-answer">
              <b>Paste the AI&apos;s answer</b>
            </label>
            <textarea
              id="ai-answer"
              rows={8}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                "## Trip\n- [ ] Book flights ⏱ 30m 📅 2026-11-03\n- [ ] Pack\n  - [ ] Chargers\n## Groceries\n- [ ] Milk"
              }
            />
            <p className={s.open} role="status">
              {answer.trim()
                ? all.length
                  ? `${all.length} task${all.length === 1 ? "" : "s"}: ${all.filter((t) => t.due).length} with a date, ${
                      all.filter((t) => t.at).length
                    } with a time, ${all.filter((t) => t.est).length} with an estimate.`
                  : "No tasks found yet. Each one should start with “- [ ]”."
                : "Nothing pasted yet."}
            </p>
          </li>
          <li>
            {named.length > 0 && (
              <ul className={s.aiLists}>
                {named.map((g) => (
                  <li key={g.name}>
                    <b>{g.name}</b> {g.listId ? "· add to this list" : "· new list"} · {g.tasks.length} task
                    {g.tasks.length === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            )}
            <div className={s.aiInto}>
              {loose.length > 0 && (
                <>
                  <b aria-hidden>{named.length ? "Tasks without a list go in" : "Put them in"}</b>
                  <Select
                    label={named.length ? "Tasks without a list go in" : "Put them in"}
                    value={target}
                    options={[...lists.map((l) => ({ value: l.id, label: l.name })), { value: "new", label: "A new list…" }]}
                    onChange={setInto}
                  />
                  {target === "new" && (
                    <input
                      aria-label="New list name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={60}
                    />
                  )}
                </>
              )}
              <button
                className="btn"
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                disabled={!all.length}
                onClick={save}
              >
                Add {all.length || ""} task{all.length === 1 ? "" : "s"}
              </button>
            </div>
          </li>
        </ol>

        <p className={s.aiFile}>
          Have a Markdown file instead?{" "}
          <button className={s.link} onClick={() => file.current?.click()}>
            <Upload size={14} strokeWidth={2.5} /> Choose a .md file
          </button>
        </p>
        <input
          ref={file}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const found = plan(await f.text(), lists);
            if (!found.length) return setErr(`No tasks found in ${f.name}. Tasks look like “- [ ] buy milk”.`);
            // Headings become lists; anything before the first heading becomes a list named after the file.
            put(found, "new", f.name.replace(/\.(md|markdown|txt)$/i, ""));
            close();
          }}
        />
        {err && <p className={s.err}>{err}</p>}
      </dialog>
    </div>
  );
}
