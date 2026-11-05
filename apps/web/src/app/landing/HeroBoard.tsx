"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { draggable, useDrop } from "@/lib/drag";
import { fmtMinutes, relDue, repeatLabel, todayISO, type Task } from "@todone/sdk/tasks";
import { sticker } from "../app/Stickers";
import s from "./landing.module.css";

// The first screen is a working board: the app's own stickers dropped onto notes do exactly what they do in
// todone. Drag one, or pick one and then click a note (keyboard and touch both work that way).
type Note = { id: string; title: string; fill: string; task: Partial<Task>; done?: boolean };

const NOTES: Note[] = [
  { id: "post", title: "Write the launch post", fill: "var(--butter)", task: { est: 120 } },
  { id: "trip", title: "Plan the trip", fill: "var(--pink)", task: {} },
  { id: "call", title: "Call the landlord", fill: "var(--cyan)", task: { pri: 1 }, done: true },
  { id: "run", title: "Stretch", fill: "var(--lime)", task: { rep: "every day", est: 15 } },
];

const STICKERS = [
  ["tomorrow", "Tomorrow", "var(--butter)"],
  ["est60", "1 hr", "var(--cyan)"],
  ["p1", "High", "var(--pink)"],
  ["r-week", "Weekly", "var(--lime)"],
] as const;

const PRI = { 1: "High", 2: "Medium", 3: "Low" } as const;

function chips(t: Partial<Task>, today: string) {
  return [
    t.pri ? PRI[t.pri as 1 | 2 | 3] : null,
    t.due ? relDue(t.due, today) : null,
    t.est ? fmtMinutes(t.est) : null,
    t.rep ? repeatLabel(t.rep) : null,
  ].filter((c): c is string => !!c);
}

export function HeroBoard() {
  const [notes, setNotes] = useState(NOTES);
  const [held, setHeld] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  // Read when a sticker lands, not while rendering: the server and the visitor's clock can disagree.
  const [today, setToday] = useState("");

  const apply = (key: string, id: string) => {
    const day = todayISO();
    const patch = sticker(key, day);
    if (!patch) return;
    setToday(day);
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, task: { ...n.task, ...patch } } : n)));
    setHeld(null);
    setLanded(id);
    setTimeout(() => setLanded((l) => (l === id ? null : l)), 700);
  };
  const drop = useDrop("hero", {
    accept: (p) => p.kind === "sticker",
    drop: (p, id) => p.kind === "sticker" && apply(p.key, id),
  });

  return (
    <div className={s.hero} data-holding={held ? "" : undefined}>
      <div className={s.board}>
        <div className={`${s.note} ${s.lead}`}>
          <span className={`${s.box} ${s.leadBox}`} aria-hidden />
          <h1 className="display">
            Todos.
            <br />
            Done right.
          </h1>
          <p>
            Sticky notes you drag onto a day, a calendar to plan the week, and teams to share it with. Open source, and it
            works offline.
          </p>
          <div className={s.ctas}>
            <Link href="/app" className={`btn ${s.primary}`}>
              Start a list <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Link>
            <Link href="/demo" className="btn">
              Try the demo
            </Link>
          </div>
        </div>

        {notes.map((n) => (
          <button
            key={n.id}
            type="button"
            className={s.note}
            style={{ "--fill": n.fill } as React.CSSProperties}
            data-done={n.done || undefined}
            data-landed={landed === n.id || undefined}
            {...drop(n.id)}
            onClick={() => held && apply(held, n.id)}
            aria-label={held ? `Put the sticker on “${n.title}”` : n.title}
          >
            <span className={s.box} aria-hidden />
            <b>{n.title}</b>
            <span className={s.chips}>
              {chips(n.task, today).map((c) => (
                <i key={c}>{c}</i>
              ))}
            </span>
          </button>
        ))}
      </div>

      <aside className={s.sheet} aria-label="Stickers">
        <p className={s.hintWide}>Drag a sticker onto a note, or pick one and click a note.</p>
        <p className={s.hintNarrow}>Tap a sticker, then a note.</p>
        {STICKERS.map(([key, label, fill]) => (
          <button
            key={key}
            type="button"
            className={s.stick}
            style={{ "--fill": fill } as React.CSSProperties}
            aria-pressed={held === key}
            onClick={() => setHeld(held === key ? null : key)}
            {...draggable({ kind: "sticker", key }, label)}
          >
            {label}
          </button>
        ))}
      </aside>
    </div>
  );
}
