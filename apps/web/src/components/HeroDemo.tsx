"use client";

import { useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { type Task, fmtMinutes, relDue, serialize, todayISO } from "@/lib/tasks";
import s from "./HeroDemo.module.css";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Sample list for the demo; dates are filled in on the visitor's clock.
const seed = (today: string): Task[] => [
  {
    id: "a",
    title: "Ship the landing page",
    done: false,
    est: 120,
    due: today,
    sub: [
      { id: "a1", title: "Write the headline", done: true, sub: [] },
      { id: "a2", title: "Record the demo", done: false, est: 30, sub: [] },
    ],
  },
  { id: "b", title: "Book the dentist", done: false, due: addDays(today, 1), sub: [] },
  { id: "c", title: "Read 20 pages", done: false, est: 30, sub: [] },
];

const never = () => () => {};

export function HeroDemo() {
  // The visitor's date; null on the server, so no date renders until the browser has one.
  const today = useSyncExternalStore(never, todayISO, () => null);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const flip = (t: Task): Task => ({ ...t, done: t.done !== flipped.has(t.id), sub: t.sub.map(flip) });
  const tasks = seed(today ?? "2026-01-01").map(flip);

  const toggle = (id: string) => {
    setFlipped((f) => {
      const n = new Set(f);
      if (!n.delete(id)) n.add(id);
      return n;
    });
    setFlash(id);
  };

  const flat = tasks.flatMap((t) => [t, ...t.sub]);
  const md = serialize(tasks).trimEnd().split("\n");
  const left = flat.filter((t) => !t.done).length;

  const row = (t: Task, sub = false) => (
    <li key={t.id} className={sub ? s.sub : undefined}>
      <button className={s.task} aria-pressed={t.done} onClick={() => toggle(t.id)}>
        <span className={s.box} aria-hidden>
          {t.done && <Check size={16} strokeWidth={3.5} />}
        </span>
        <span className={s.title}>{t.title}</span>
        <span className={s.fields}>
          {t.est ? <span>{fmtMinutes(t.est)}</span> : null}
          {t.due && today ? <span className={s.due}>{relDue(t.due, today)}</span> : null}
        </span>
      </button>
    </li>
  );

  return (
    <div className={s.stage}>
      <section className={`sticker ${s.card}`} aria-label="Try it: a sample list">
        <header className={s.head}>
          <span className="display">inbox</span>
          <span className={s.count}>{left} open</span>
        </header>
        <ul className={s.list}>{tasks.map((t) => [row(t), ...t.sub.map((x) => row(x, true))])}</ul>
        <p className={s.hint}>Tick one. Watch the file.</p>
      </section>

      <figure className={s.term} aria-label="The same list as a Markdown file">
        <figcaption className={s.bar}>
          <span className={s.dots} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          ~/.todone/inbox.md
        </figcaption>
        <pre className={s.code}>
          {md.map((line, i) => {
            const id = flat[i]?.id;
            const m = /^(\s*- \[)(.)(\] )(.*)$/.exec(line);
            return (
              <span key={`${id}-${flat[i]?.done}`} className={id === flash ? s.flash : undefined}>
                {m ? (
                  <>
                    {m[1]}
                    <b className={m[2] === "x" ? s.on : undefined}>{m[2]}</b>
                    {m[3]}
                    {m[4]}
                  </>
                ) : (
                  line
                )}
                {"\n"}
              </span>
            );
          })}
        </pre>
      </figure>
    </div>
  );
}
