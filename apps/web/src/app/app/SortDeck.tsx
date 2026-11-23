"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { type List, type Task, relDue, tick, todayISO, waiting } from "@todone/sdk/tasks";
import { authClient } from "@/lib/auth-client";
import { addDays, shiftMonths, weekStart } from "@todone/sdk/calendar";
import { mapTask } from "@/lib/store";
import { listColor } from "./listIcon";
import s from "./app.module.css";

// Sort your tasks one card at a time, the way dating apps sort people: from every list, the late ones first, then the
// ones with no day, then a few others at random. Four choices, as buttons along the bottom: Today, This week, This
// month, Later (leave it as it is). Or swipe: right today, up this week, down this month, left later; or the arrow
// keys. Done: double-tap the card on a phone, or Space on a keyboard. Each choice saves at once (Backspace undoes it).
type Card = { list: List; task: Task; why: "late" | "undated" | "planned" };
type Choice = "today" | "week" | "month" | "skip" | "done";
const DAY: Record<Exclude<Choice, "skip" | "done">, (d: string) => string> = {
  today: (d) => d,
  week: (d) => addDays(weekStart(d), 6), // by Sunday
  month: (d) => addDays(shiftMonths(`${d.slice(0, 7)}-01`, 1), -1), // by its last day
};
const SWIPE: Record<string, Choice> = { right: "today", up: "week", down: "month", left: "skip" };
const STAMP: Record<Choice, string> = { today: "Today", week: "This week", month: "This month", skip: "Later", done: "Done ✓" };

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// The deck, made once when it opens (so it doesn't reshuffle as you sort).
export function deckOf(lists: List[], today: string, others = 8): Card[] {
  const open = lists
    .filter((l) => !l.kind)
    .flatMap((list) => list.tasks.filter((t) => !t.done && !waiting(t, today)).map((task) => ({ list, task })));
  const late = open.filter((c) => c.task.due && c.task.due < today).map((c) => ({ ...c, why: "late" as const }));
  const undated = shuffle(open.filter((c) => !c.task.due)).map((c) => ({ ...c, why: "undated" as const }));
  const planned = shuffle(open.filter((c) => c.task.due && c.task.due >= today))
    .slice(0, others)
    .map((c) => ({ ...c, why: "planned" as const }));
  return [...late.sort((a, b) => a.task.due!.localeCompare(b.task.due!)), ...undated, ...planned];
}
// How many cards are waiting: the sidebar's count (late and undated, not the random extras).
export const toSort = (lists: List[], today: string) => deckOf(lists, today, 0).length;

export function SortDeck({
  lists,
  update,
  onDone,
}: {
  lists: List[];
  update: (id: string, f: (l: List) => List | null) => void;
  onDone: () => void;
}) {
  const today = todayISO();
  const me = authClient.useSession().data?.user.id;
  const [deck] = useState(() => deckOf(lists, today));
  const [at, setAt] = useState(0);
  const [log, setLog] = useState<{ card: Card; before: Task; choice: Choice }[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  // Cards on their way out: each flies off the way it was sent (Later greys out and slides away), from wherever the
  // drag left it, while the next one rises from the deck.
  const [flying, setFlying] = useState<{ id: number; card: Card; choice: Choice; from: { x: number; y: number } }[]>([]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0); // a second tap soon after the first, without a drag, means done

  const card = deck[at];
  // The live task (it may have changed since the deck was dealt).
  const live = (c: Card) => lists.find((l) => l.id === c.list.id)?.tasks.find((t) => t.id === c.task.id) ?? c.task;

  const choose = (choice: Choice) => {
    if (!card) return;
    const before = live(card);
    if (choice === "done") update(card.list.id, (l) => ({ ...l, tasks: tick(l.tasks, card.task.id, today, me) }));
    else if (choice !== "skip")
      update(card.list.id, (l) => ({ ...l, tasks: mapTask(l.tasks, card.task.id, (t) => ({ ...t, due: DAY[choice](today) })) }));
    setLog((x) => [...x, { card, before, choice }]);
    const id = Date.now() + Math.random();
    setFlying((f) => [...f, { id, card, choice, from: drag ?? { x: 0, y: 0 } }]);
    setTimeout(() => setFlying((f) => f.filter((x) => x.id !== id)), 520);
    setAt((n) => n + 1);
    setDrag(null);
  };
  const undo = () => {
    const last = log.at(-1);
    if (!last) return;
    if (last.choice !== "skip")
      update(last.card.list.id, (l) => ({ ...l, tasks: mapTask(l.tasks, last.card.task.id, () => last.before) }));
    setLog((x) => x.slice(0, -1));
    setAt((n) => n - 1);
  };

  // Arrow keys: → today, ↑ this week, ↓ this month, ← later; Space done; Backspace undoes.
  const keys = useRef({ choose, undo });
  useEffect(() => {
    keys.current = { choose, undo };
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input, textarea, select")) return;
      const c = { ArrowRight: "today", ArrowUp: "week", ArrowDown: "month", ArrowLeft: "skip", " ": "done" }[e.key] as
        | Choice
        | undefined;
      if (c) {
        if (e.key === " ") (document.activeElement as HTMLElement | null)?.blur?.(); // not also a press of a focused button
        keys.current.choose(c);
      }
      else if (e.key === "Backspace") keys.current.undo();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  // Which way a drag is heading, once it's gone far enough to mean it.
  const dir = (d: { x: number; y: number } | null) => {
    if (!d) return null;
    const ax = Math.abs(d.x);
    const ay = Math.abs(d.y);
    if (Math.max(ax, ay) < 90) return null;
    return ax > ay ? (d.x > 0 ? "right" : "left") : d.y < 0 ? "up" : "down";
  };
  const heading = dir(drag);
  const stamp = heading ? STAMP[SWIPE[heading]] : null;

  // What a card shows: why it's here, the task, its list and steps.
  const face = (c: Card) => (
    <>
      <p className={s.sortWhy}>
        {c.why === "late" ? relDue(c.task.due!, today) : c.why === "undated" ? "No day yet" : relDue(c.task.due!, today)}
      </p>
      <h2 className="display">{live(c).title}</h2>
      <p className={s.sortMeta}>
        <span>{c.list.name}</span>
        {c.task.sub.length > 0 && (
          <span>
            {c.task.sub.filter((x) => x.done).length}/{c.task.sub.length} steps
          </span>
        )}
      </p>
    </>
  );
  const flyers = (
    <>
              {flying.map((f) => (
                <article
                  key={f.id}
                  className={`${s.sortCard} ${s.sortFly}`}
                  data-fly={f.choice}
                  aria-hidden
                  style={
                    {
                      "--fill": listColor(f.card.list.id),
                      "--fx": `${f.from.x}px`,
                      "--fy": `${f.from.y}px`,
                      "--fr": `${f.from.x / 18}deg`,
                    } as React.CSSProperties
                  }
                >
                  <b className={s.sortStamp} data-for={f.choice}>
                    {STAMP[f.choice]}
                  </b>
                  {face(f.card)}
                </article>
              ))}
    </>
  );
  const sorted = log.filter((x) => x.choice !== "skip").length;
  return (
    <div className={s.sortPage}>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Sort</h1>
        <p className={s.progress}>
          {card ? `${deck.length - at} to go${sorted ? ` · ${sorted} sorted` : ""}` : `${sorted} sorted`}
        </p>
      </div>

      {card ? (
        <>
          <div className={s.deck}>
            {/* The next card peeks out from under this one. */}
            {deck[at + 1] && <div className={s.deckNext} style={{ "--fill": listColor(deck[at + 1].list.id) } as React.CSSProperties} />}
            <article
              key={card.task.id}
              className={s.sortCard}
              data-dragging={drag ? true : undefined}
              data-dir={heading ?? undefined}
              data-to={heading ? SWIPE[heading] : undefined}
              style={
                {
                  "--fill": listColor(card.list.id),
                  translate: drag ? `${drag.x}px ${drag.y}px` : undefined,
                  rotate: drag ? `${drag.x / 18}deg` : undefined,
                } as React.CSSProperties
              }
              onPointerDown={(e) => {
                if ((e.target as Element).closest("button")) return;
                start.current = { x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => start.current && setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })}
              onPointerUp={() => {
                const h = dir(drag);
                const moved = drag && Math.hypot(drag.x, drag.y) > 10;
                start.current = null;
                if (h) return choose(SWIPE[h]);
                setDrag(null);
                if (moved) return;
                const now = Date.now();
                if (now - lastTap.current < 320) {
                  lastTap.current = 0;
                  choose("done");
                } else lastTap.current = now;
              }}
              onPointerCancel={() => ((start.current = null), setDrag(null))}
            >
              {stamp && heading && (
                <b className={s.sortStamp} data-for={SWIPE[heading]}>
                  {stamp}
                </b>
              )}
              {face(card)}
            </article>
            {flyers}
          </div>

          <p className={s.sortTip}>Done already? Double-tap the card (Space on a keyboard).</p>
          <div className={s.sortButtons}>
            {(
              [
                ["today", "Today", "var(--lime)"],
                ["week", "This week", "var(--cyan)"],
                ["month", "This month", "var(--peri)"],
                ["skip", "Later", "#fff8ef"],
              ] as const
            ).map(([c, name, fill]) => (
              <button key={c} className="btn" style={{ "--fill": fill } as React.CSSProperties} onClick={() => choose(c)}>
                {name}
              </button>
            ))}
          </div>
        </>
      ) : flying.length ? (
        // The last card on its way out, before "All sorted".
        <div className={s.deck}>{flyers}</div>
      ) : (
        <div className={s.sortEnd}>
          <p className="display">{deck.length ? "All sorted." : "Nothing to sort."}</p>
          <p>{deck.length ? "Every late and undated task has a day now. Clear head, clear list." : "No late tasks, nothing without a day. Nice."}</p>
          <div>
            {log.length > 0 && (
              <button className="btn" onClick={undo}>
                <RotateCcw size={16} strokeWidth={2.5} aria-hidden /> Undo the last one
              </button>
            )}
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={onDone}>
              Back to my lists
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
