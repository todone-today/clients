"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowUp, Mic, Plus, Sparkles } from "lucide-react";
import s from "./app.module.css";

// Ask todone's way in from anywhere: a bar at the bottom of the page. Typing and sending, or the mic, hands over to
// the Ask todone dialog (AiImport), which does the work and shows what it found to review.
export const ASK_EVENT = "todone:ask";
// `ideas`: asked from Brainstorm, so what it finds lands there as idea cards (IDEAS_EVENT) instead of in lists.
export type Ask = ({ text: string } | { voice: true }) & { ideas?: true };
export const IDEAS_EVENT = "todone:ideas";
const ask = (detail: Ask) => dispatchEvent(new CustomEvent<Ask>(ASK_EVENT, { detail }));

// A phone (the layout's own breakpoint), kept current as the window changes.
const PHONE = "(max-width: 760px)";
const usePhone = () =>
  useSyncExternalStore(
    (cb) => {
      const m = matchMedia(PHONE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(PHONE).matches,
    () => false,
  );

// `onAdd`: on a phone the bar is also where tasks are added (the box at the top of the list is hidden there, out
// of thumb reach): a switch picks plain "Task" (added as typed) or "Ask" (Ask todone). `ai` false: Task only.
export function AskBar({ ideas, onAdd, ai = true }: { ideas?: boolean; onAdd?: (title: string) => void; ai?: boolean }) {
  const [text, setText] = useState("");
  const phone = usePhone();
  const [mode, setMode] = useState<"task" | "ask">("task");
  const adding = !!onAdd && phone && (mode === "task" || !ai);
  const more = ideas ? ({ ideas: true } as const) : {};
  if (!ai && !adding) return null;
  return (
    <form
      data-tour={ideas ? undefined : "ask"}
      className={s.askBar}
      data-mode={adding ? "task" : "ask"}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        if (adding) onAdd(text.trim());
        else ask({ text, ...more });
        setText("");
      }}
    >
      {onAdd && phone && ai ? (
        <button
          type="button"
          className={s.askMode}
          onClick={() => setMode(adding ? "ask" : "task")}
          aria-label={adding ? "Adding a task. Switch to Ask todone" : "Asking todone. Switch to adding a task"}
        >
          {adding ? <Plus size={16} strokeWidth={3} aria-hidden /> : <Sparkles size={16} strokeWidth={2.5} aria-hidden />}
          {adding ? "Task" : "Ask"}
        </button>
      ) : adding ? (
        <Plus size={18} strokeWidth={3} aria-hidden className={s.askSpark} />
      ) : (
        <Sparkles size={18} strokeWidth={2.5} aria-hidden className={s.askSpark} />
      )}
      <label htmlFor="ask-bar" className="sr-only">
        {adding ? "New task" : ideas ? "Brain dump: say or type it, todone turns it into idea cards" : "Tell todone what you need to do"}
      </label>
      <input
        id="ask-bar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={adding ? "Add a task…" : ideas ? "Brain dump, any language. Say it or type it…" : "Tell todone what you need to do…"}
        autoComplete="off"
        enterKeyHint={adding ? "done" : "send"}
        maxLength={adding ? 500 : 50000}
      />
      {!adding && (
        <button type="button" className={s.askMic} onClick={() => ask({ voice: true, ...more })} aria-label="Speak instead">
          <Mic size={18} strokeWidth={2.5} />
        </button>
      )}
      <button
        type="submit"
        className={s.askGo}
        disabled={!text.trim()}
        aria-label={adding ? "Add the task" : ideas ? "Make ideas" : "Make my lists"}
      >
        {adding ? <Plus size={18} strokeWidth={3} /> : <ArrowUp size={18} strokeWidth={3} />}
      </button>
    </form>
  );
}
