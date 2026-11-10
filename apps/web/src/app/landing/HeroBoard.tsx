"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publishHero } from "@/lib/hero-sync";
import { ArrowRight } from "lucide-react";
import { draggable, placeOn, useDrop } from "@/lib/drag";
import { useGlide } from "@/lib/glide";
import { fmtMinutes, relDue, repeatLabel, todayISO, type Task } from "@todone/sdk/tasks";
import { sticker } from "../app/Stickers";
import s from "./landing.module.css";

// The first screen is a working board: the app's own stickers dropped onto notes do exactly what they do in
// todone (drag one, or pick one and then click a note), notes tick off, and dragging a note up or down opens a
// slot where it will land while the others slide aside, as on a real list.
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

// The chips a note shows, coloured the way the app colours them.
function chips(t: Partial<Task>, today: string) {
  return [
    t.pri ? { text: PRI[t.pri as 1 | 2 | 3], pri: t.pri } : null,
    t.due ? { text: relDue(t.due, today), due: true } : null,
    t.est ? { text: fmtMinutes(t.est) } : null,
    t.rep ? { text: repeatLabel(t.rep) } : null,
  ].filter((c) => !!c);
}

export function HeroBoard() {
  const [notes, setNotes] = useState(NOTES);
  // The hardware concepts further down mirror these notes.
  useEffect(
    () =>
      publishHero(
        notes.map((n) => ({
          title: n.title,
          done: !!n.done,
          fill: n.fill.match(/--(\w+)/)?.[1],
          tag: n.task.at ?? (n.task.est ? fmtMinutes(n.task.est) : n.task.pri === 1 ? "High" : undefined),
        })),
      ),
    [notes],
  );
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
  const glide = useGlide<HTMLDivElement>();
  const [gap, setGap] = useState<{ target: string; place: "before" | "after"; id: string } | null>(null);
  const isNote = (id: string) => notes.some((n) => n.id === id);
  const drop = useDrop("hero", {
    accept: (p, id) =>
      p.kind === "sticker" ? id !== "gap" : p.kind === "demo" && isNote(p.id) && (id === "gap" ? !!gap : id !== p.id),
    where: (p, id, at) => {
      if (p.kind !== "demo" || id === "gap") return "inside";
      const place = placeOn(at, "y", false) as "before" | "after";
      setGap((g) => (g?.target === id && g.place === place ? g : { target: id, place, id: p.id }));
      return place;
    },
    leave: () => setGap(null),
    drop: (p, id, at) => {
      setGap(null);
      if (p.kind === "sticker") return apply(p.key, id);
      if (p.kind !== "demo") return;
      const to = id === "gap" && gap ? gap : { target: id, place: placeOn(at, "y", false) as "before" | "after" };
      setNotes((ns) => {
        const moved = ns.find((n) => n.id === p.id)!;
        const rest = ns.filter((n) => n.id !== p.id);
        const at = rest.findIndex((n) => n.id === to.target) + (to.place === "after" ? 1 : 0);
        return [...rest.slice(0, at), moved, ...rest.slice(at)];
      });
    },
  });
  const tickNote = (id: string) => setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));

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

        <div className={s.stack} ref={glide}>
          {notes.flatMap((n) => {
            const note = (
              <div
                key={n.id}
                data-id={n.id}
                className={s.note}
                style={{ "--fill": n.fill } as React.CSSProperties}
                data-done={n.done || undefined}
                data-landed={landed === n.id || undefined}
                data-dragged={gap?.id === n.id || undefined}
                data-holding={held ? "" : undefined}
                {...drop(n.id)}
                {...draggable({ kind: "demo", id: n.id }, n.title)}
                onClick={() => held && apply(held, n.id)}
              >
                <button
                  type="button"
                  className={s.box}
                  aria-pressed={!!n.done}
                  aria-label={held ? `Put the sticker on “${n.title}”` : `Tick off “${n.title}”`}
                  onClick={(e) => {
                    if (held) return;
                    e.stopPropagation();
                    tickNote(n.id);
                  }}
                />
                <b>{n.title}</b>
                <span className={s.chips}>
                  {chips(n.task, today).map((c) => (
                    <i key={c.text} data-pri={c.pri} data-due={c.due || undefined}>
                      {c.text}
                    </i>
                  ))}
                </span>
              </div>
            );
            if (gap?.target !== n.id) return [note];
            const slot = <div key="gap" className={s.heroSlot} {...drop("gap")} aria-hidden />;
            return gap.place === "before" ? [slot, note] : [note, slot];
          })}
        </div>
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
