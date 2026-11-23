"use client";

import { useRef, useState } from "react";
import { Mic, Plus, Sparkles, Square } from "lucide-react";
import { useDictation } from "@/lib/dictate";
import { Dock } from "./Dock";
import s from "./app.module.css";

// The one bar at the foot of each page (lists, Brainstorm, Goals, Rewards, the calendar): type and press Enter to add
// the page's own thing as typed; ✨ hands the words to Ask todone (the AiImport dialog) to work out; the mic types
// what you say into the bar, as you say it (lib/dictate.ts). Each page has its own words and, for Ask todone, its own focus.
export const ASK_EVENT = "todone:ask";
// `mode`: asked from Brainstorm (what it finds lands there as idea cards, IDEAS_EVENT), Goals or Rewards (it suggests
// those only). `open`: just open the dialog, nothing typed yet.
export type Focus = "ideas" | "goals" | "rewards";
export type Ask = ({ text: string } | { open: true }) & { mode?: Focus };
export const IDEAS_EVENT = "todone:ideas";
const ask = (detail: Ask) => dispatchEvent(new CustomEvent<Ask>(ASK_EVENT, { detail }));

export type Place = "list" | "ideas" | "goals" | "rewards" | "calendar";
const WORDS: Record<Place, { add: string; ai: string; plain: string; label: string; mode?: Focus }> = {
  list: { add: "Add the task", ai: "Add a task, or ✨ to ask todone", plain: "Add a task…", label: "New task" },
  ideas: { add: "Add the idea", ai: "Add an idea, or ✨ to brain dump", plain: "Add an idea… (paste a list to add many)", label: "New idea", mode: "ideas" },
  goals: { add: "Add the goal", ai: "Name a goal, or ✨ for ideas", plain: "Name a goal…", label: "New goal", mode: "goals" },
  rewards: { add: "Add the reward", ai: "Name a treat, or ✨ for ideas", plain: "Name a treat…", label: "New reward", mode: "rewards" },
  calendar: { add: "Add it for today", ai: "Add for today, or ✨ to plan", plain: "Add a task for today…", label: "New task for today" },
};

export function AskBar({
  place,
  ai,
  onAdd,
  onPaste,
  docked = true,
}: {
  docked?: boolean; // false: it sits in a dock of its own (a list's, with the Bin)
  place: Place;
  ai: boolean;
  onAdd: (text: string) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void; // e.g. a pasted list becoming many ideas
}) {
  const [text, setText] = useState("");
  const before = useRef("");
  const talk = useDictation((t) => setText(before.current && t ? `${before.current} ${t}` : before.current || t));
  const w = WORDS[place];
  const mode = w.mode ? { mode: w.mode } : {};
  const bar = (
    <form
      data-tour="ask"
      className={s.askBar}
      // Phones: the bar shows only while adding (the tab bar's + opens it); it goes once you leave it empty.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !text.trim() && !talk.on)
          delete document.body.dataset.adding;
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <label htmlFor="ask-bar" className="sr-only">
        {w.label}
      </label>
      <input
        id="ask-bar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={onPaste}
        readOnly={talk.on}
        placeholder={ai ? w.ai : w.plain}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={50000}
      />
      {ai && (
        <>
          {talk.on ? (
            <button type="button" className={s.askMic} data-on onClick={talk.stop} aria-label="Stop listening" data-tip="Stop">
              <Square size={14} strokeWidth={3} />
            </button>
          ) : (
            <button
              type="button"
              className={s.askMic}
              onClick={() => {
                before.current = text.trim();
                void talk.start();
              }}
              aria-label="Speak instead of typing"
              data-tip={talk.err || "Speak"}
            >
              <Mic size={18} strokeWidth={2.5} />
            </button>
          )}
          <button
            type="button"
            className={s.askAi}
            onClick={() => {
              ask(text.trim() ? { text, ...mode } : { open: true, ...mode });
              setText("");
            }}
            aria-label="Ask todone"
            data-tip="Ask todone to work it out"
          >
            <Sparkles size={18} strokeWidth={2.5} />
          </button>
        </>
      )}
      <button type="submit" className={s.askGo} disabled={!text.trim()} aria-label={w.add} data-tip={w.add}>
        <Plus size={18} strokeWidth={3} />
      </button>
    </form>
  );
  return docked ? <Dock>{bar}</Dock> : bar;
}
