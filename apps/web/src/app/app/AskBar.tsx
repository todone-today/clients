"use client";

import { useState } from "react";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
import s from "./app.module.css";

// Ask todone's way in from anywhere: a bar at the bottom of the page. Typing and sending, or the mic, hands over to
// the Ask todone dialog (AiImport), which does the work and shows what it found to review.
export const ASK_EVENT = "todone:ask";
export type Ask = { text: string } | { voice: true };
const ask = (detail: Ask) => dispatchEvent(new CustomEvent<Ask>(ASK_EVENT, { detail }));

export function AskBar() {
  const [text, setText] = useState("");
  return (
    <form data-tour="ask"
      className={s.askBar}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        ask({ text });
        setText("");
      }}
    >
      <Sparkles size={18} strokeWidth={2.5} aria-hidden className={s.askSpark} />
      <label htmlFor="ask-bar" className="sr-only">
        Tell todone what you need to do
      </label>
      <input
        id="ask-bar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell todone what you need to do…"
        autoComplete="off"
        maxLength={8000}
      />
      <button type="button" className={s.askMic} onClick={() => ask({ voice: true })} aria-label="Speak instead">
        <Mic size={18} strokeWidth={2.5} />
      </button>
      <button type="submit" className={s.askGo} disabled={!text.trim()} aria-label="Make my lists">
        <ArrowUp size={18} strokeWidth={3} />
      </button>
    </form>
  );
}
