"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Check, RotateCcw, SkipForward } from "lucide-react";
import { type List, type Task, relDue, tick, todayISO, waiting } from "@todone/sdk/tasks";
import { addDays, shiftMonths, weekStart } from "@todone/sdk/calendar";
import { mapTask } from "@/lib/store";
import { authClient } from "@/lib/auth-client";
import { listColor } from "./listIcon";
import s from "./app.module.css";

// Sort your tasks one card at a time, the way dating apps sort people: from every list, the late ones first, then the
// ones with no day, then a few others at random. Swipe right for today, up for tomorrow, down for this week, left to
// leave it as it is; or tap a button (or use the arrow keys). Each choice saves at once and can be undone.
type Card = { list: List; task: Task; why: "late" | "undated" | "planned" };
type Choice = "today" | "tomorrow" | "week" | "month" | "done" | "skip";
const DAY: Record<Exclude<Choice, "done" | "skip">, (d: string) => string> = {
  today: (d) => d,
  tomorrow: (d) => addDays(d, 1),
  week: (d) => addDays(weekStart(d), 6), // by Sunday
  month: (d) => addDays(shiftMonths(`${d.slice(0, 7)}-01`, 1), -1), // by its last day
};
const SWIPE: Record<string, Choice> = { right: "today", up: "tomorrow", down: "week", left: "skip" };
const STAMP: Partial<Record<Choice, string>> = { today: "Today", tomorrow: "Tomorrow", week: "This week", skip: "Later" };

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
  const start = useRef<{ x: number; y: number } | null>(null);

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

  // Arrow keys: → today, ↑ tomorrow, ↓ this week, ← later; Enter done; Backspace undoes.
  const keys = useRef({ choose, undo });
  useEffect(() => {
    keys.current = { choose, undo };
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input, textarea, select")) return;
      const c = { ArrowRight: "today", ArrowUp: "tomorrow", ArrowDown: "week", ArrowLeft: "skip", Enter: "done" }[e.key] as
        | Choice
        | undefined;
      if (c) keys.current.choose(c);
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
                start.current = null;
                if (h) choose(SWIPE[h]);
                else setDrag(null);
              }}
              onPointerCancel={() => ((start.current = null), setDrag(null))}
            >
              {stamp && <b className={s.sortStamp}>{stamp}</b>}
              <p className={s.sortWhy}>
                {card.why === "late" ? relDue(card.task.due!, today) : card.why === "undated" ? "No day yet" : relDue(card.task.due!, today)}
              </p>
              <h2 className="display">{live(card).title}</h2>
              <p className={s.sortMeta}>
                <span>{card.list.name}</span>
                {card.task.sub.length > 0 && (
                  <span>
                    {card.task.sub.filter((x) => x.done).length}/{card.task.sub.length} steps
                  </span>
                )}
              </p>
              <p className={s.sortHint} aria-hidden>
                <ArrowRight size={14} strokeWidth={3} /> today · <ArrowUp size={14} strokeWidth={3} /> tomorrow ·{" "}
                <ArrowDown size={14} strokeWidth={3} /> this week · <ArrowLeft size={14} strokeWidth={3} /> later
              </p>
            </article>
          </div>

          <div className={s.sortButtons}>
            <button className={s.sortSmall} onClick={undo} disabled={!log.length} aria-label="Undo" data-tip="Undo">
              <RotateCcw size={20} strokeWidth={2.5} />
            </button>
            <button className={s.sortSmall} onClick={() => choose("skip")} aria-label="Later: leave it as it is" data-tip="Later">
              <SkipForward size={20} strokeWidth={2.5} />
            </button>
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={() => choose("today")}>
              Today
            </button>
            <button className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties} onClick={() => choose("tomorrow")}>
              Tomorrow
            </button>
            <button className="btn" style={{ "--fill": "var(--cyan)" } as React.CSSProperties} onClick={() => choose("week")}>
              This week
            </button>
            <button className="btn" style={{ "--fill": "var(--peri)" } as React.CSSProperties} onClick={() => choose("month")}>
              <CalendarDays size={16} strokeWidth={2.5} aria-hidden /> This month
            </button>
            <button className={s.sortSmall} onClick={() => choose("done")} aria-label="Already done" data-tip="Done">
              <Check size={20} strokeWidth={3} />
            </button>
          </div>
        </>
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
