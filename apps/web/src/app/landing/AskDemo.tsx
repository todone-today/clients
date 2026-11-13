"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Gift, Lock, Mic, Sparkles, Target } from "lucide-react";
import s from "./landing.module.css";

// Ask todone, played: an example types itself into the bar, todone thinks a beat, and the stickers it makes land
// in their places, each with its priority, timing, effort and why. Click an example to see it again; it moves on
// by itself otherwise. With reduced motion, it shows each example finished.
type Note = { title: string; meta: string[]; why?: string; kind?: "goal" | "reward" | "change" | "question" };
type Example = { tag: string; said: string; lanes: { name: string; fill: string; notes: Note[] }[] };

const EXAMPLES: Example[] = [
  {
    tag: "Your day, in Hinglish",
    said: "Kal tak report finish karni hai, doodh lena hai, aur gym 4 din week mein. Weekend pe movie as reward.",
    lanes: [
      { name: "Work", fill: "var(--cyan)", notes: [{ title: "Finish the report", meta: ["High", "tomorrow", "2h", "Effort L"], why: "Due tomorrow, so it comes first." }] },
      { name: "Groceries", fill: "var(--pink)", notes: [{ title: "Buy milk", meta: ["Medium", "today", "15m"], why: "On the way home." }] },
      {
        name: "Goals & rewards",
        fill: "var(--lime)",
        notes: [
          { title: "Go to the gym", meta: ["4× a week"], kind: "goal" },
          { title: "Weekend movie", meta: ["150 XP"], kind: "reward" },
        ],
      },
    ],
  },
  {
    tag: "A plan, with a question back",
    said: "Plan a Goa trip in December with 3 friends, budget 20k each.",
    lanes: [
      {
        name: "Goa trip",
        fill: "var(--butter)",
        notes: [
          { title: "Compare flights for the group", meta: ["High", "1h", "Effort M"], why: "Prices climb close to December." },
          { title: "Book a stay near the beach", meta: ["High", "1h"], why: "Book once the dates are set." },
          { title: "Split the budget in a shared sheet", meta: ["Low", "30m"] },
        ],
      },
      { name: "todone asks", fill: "var(--peri)", notes: [{ title: "Which dates in December?", meta: ["Answer to update the plan"], kind: "question" }] },
    ],
  },
  {
    tag: "Inside a list, with your OK",
    said: "Clean up my Groceries list.",
    lanes: [
      {
        name: "Groceries",
        fill: "var(--pink)",
        notes: [
          { title: "Bananas", meta: ["Delete"], why: "Already bought yesterday.", kind: "change" },
          { title: "oat milk", meta: ["Rename to “Buy oat milk”", "15m"], kind: "change" },
          { title: "Coffee beans", meta: ["Mark done"], why: "You said you picked them up.", kind: "change" },
        ],
      },
    ],
  },
];

const TYPE_MS = 32;
const THINK_MS = 900;
const HOLD_MS = 5200;

export function AskDemo() {
  const [i, setI] = useState(0);
  const [chars, setChars] = useState(0);
  const [shown, setShown] = useState(false);
  const ex = EXAMPLES[i];
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    if (still) {
      later(0, () => {
        setChars(ex.said.length);
        setShown(true);
      });
      return () => timers.forEach(clearTimeout);
    }
    later(0, () => {
      setChars(0);
      setShown(false);
    });
    for (let n = 1; n <= ex.said.length; n++) later(250 + n * TYPE_MS, () => setChars(n));
    const typed = 250 + ex.said.length * TYPE_MS;
    later(typed + THINK_MS, () => setShown(true));
    later(typed + THINK_MS + HOLD_MS, () => setI((n) => (n + 1) % EXAMPLES.length));
    return () => timers.forEach(clearTimeout);
  }, [i, ex.said.length]);
  const thinking = chars === ex.said.length && !shown;
  let k = 0; // stagger across lanes

  return (
    <div className={s.ask}>
      <div className={s.askTabs} role="group" aria-label="Examples">
        {EXAMPLES.map((e, n) => (
          <button key={e.tag} aria-pressed={n === i} onClick={() => setI(n)}>
            {e.tag}
          </button>
        ))}
      </div>
      <div className={s.askBar} aria-label={`Someone types: ${ex.said}`}>
        <Sparkles size={22} strokeWidth={2.5} aria-hidden data-spin={thinking || undefined} />
        <span className={s.askSaid}>
          {ex.said.slice(0, chars)}
          {!shown && <i className={s.askCaret} aria-hidden />}
        </span>
        <span className={s.askKey} aria-hidden>
          <Mic size={18} strokeWidth={2.5} />
        </span>
        <span className={s.askKey} data-go aria-hidden>
          <ArrowUp size={18} strokeWidth={3} />
        </span>
      </div>
      <p className={s.askStatus} role="status">
        {thinking ? "Thinking it through…" : shown ? (i === 2 ? "You let it read Groceries. Check each change, then Apply." : "Sorted for you. Move anything, then Add.") : " "}
      </p>
      <div className={s.askLanes} data-shown={shown || undefined} aria-live="polite">
        {shown &&
          ex.lanes.map((lane) => (
            <section key={lane.name} className={s.askLane} style={{ "--fill": lane.fill } as React.CSSProperties}>
              <h3>
                {i === 2 && <Lock size={13} strokeWidth={2.75} aria-hidden />} {lane.name}
              </h3>
              {lane.notes.map((note) => (
                <div
                  key={note.title}
                  className={s.askNote}
                  data-kind={note.kind}
                  style={{ "--fill": lane.fill, animationDelay: `${k++ * 110}ms` } as React.CSSProperties}
                >
                  <b>
                    {note.kind === "goal" && <Target size={14} strokeWidth={2.75} aria-hidden />}
                    {note.kind === "reward" && <Gift size={14} strokeWidth={2.75} aria-hidden />}
                    {note.title}
                  </b>
                  <span>
                    {note.meta.map((m) => (
                      <i key={m}>{m}</i>
                    ))}
                  </span>
                  {note.why && <small>{note.why}</small>}
                </div>
              ))}
            </section>
          ))}
      </div>
    </div>
  );
}
