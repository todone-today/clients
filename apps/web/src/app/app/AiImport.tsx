"use client";

import { useRef, useState } from "react";
import { Copy, Sparkles, Upload, X } from "lucide-react";
import { label } from "@/lib/calendar";
import { type List, type Task, parse, todayISO } from "@/lib/tasks";
import s from "./app.module.css";

// The prompt people paste into any AI chat; it answers in the list format todone reads.
const prompt = (
  today: string,
) => `Turn what I describe below into a todo list. Reply with only the list, one task per line, in exactly this format:

- [ ] Task name ⏱ 30m 📅 2026-11-02 ⏰ 09:30
  - [ ] A subtask (indent two spaces, one level only)

Rules:
- Everything after the task name is optional. Leave a part out unless I said or clearly implied it.
- ⏱ is how long it takes: 15m, 30m, 1h, 1h30m, 2h.
- 📅 is the day it's due, as YYYY-MM-DD. Today is ${label(today, { weekday: "long" })} ${today}; work out "Friday", "next week" and so on from that.
- ⏰ is a start time, 24-hour HH:MM, only if I gave a time.
- Write "- [x]" for anything already done.
- No headings, numbers, notes or code fences.

Here's what I need to do:
`;

// Import with AI: copy a prompt, paste the AI's answer, pick where the tasks go. A .md file works too.
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
  const [err, setErr] = useState("");
  const tasks = parse(answer);
  const all = tasks.flatMap((t) => [t, ...t.sub]);
  const target = into || current || "new";

  const close = () => {
    dialog.current?.close();
    setAnswer("");
    setErr("");
  };
  const save = () => {
    if (!tasks.length) return;
    if (target === "new") onAdd(name.trim() || "From AI", tasks);
    else onAppend(target, tasks);
    close();
  };

  return (
    <div className={s.import}>
      <button
        className={s.ghost}
        onClick={() => {
          setInto(current ?? "new");
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
            <pre className={s.code}>{prompt(todayISO())}</pre>
            <button
              className="btn"
              onClick={async () => {
                await navigator.clipboard.writeText(prompt(todayISO()));
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
              placeholder={"- [ ] Book flights ⏱ 30m 📅 2026-11-03\n- [ ] Pack\n  - [ ] Chargers"}
            />
            <p className={s.open} role="status">
              {answer.trim()
                ? tasks.length
                  ? `${all.length} task${all.length === 1 ? "" : "s"}: ${all.filter((t) => t.due).length} with a date, ${
                      all.filter((t) => t.at).length
                    } with a time, ${all.filter((t) => t.est).length} with an estimate.`
                  : "No tasks found yet. Each one should start with “- [ ]”."
                : "Nothing pasted yet."}
            </p>
          </li>
          <li>
            <div className={s.aiInto}>
              <label htmlFor="ai-into">
                <b>Put them in</b>
              </label>
              <select id="ai-into" value={target} onChange={(e) => setInto(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
                <option value="new">A new list…</option>
              </select>
              {target === "new" && (
                <input aria-label="New list name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              )}
              <button
                className="btn"
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                disabled={!tasks.length}
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
            const found = parse(await f.text());
            if (!found.length) return setErr(`No tasks found in ${f.name}. Tasks look like “- [ ] buy milk”.`);
            onAdd(f.name.replace(/\.(md|markdown|txt)$/i, ""), found);
            close();
          }}
        />
        {err && <p className={s.err}>{err}</p>}
      </dialog>
    </div>
  );
}
