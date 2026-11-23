"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check } from "lucide-react";
import { type List, type Task, relDue, tick, todayISO, waiting } from "@todone/sdk/tasks";
import { authClient } from "@/lib/auth-client";
import { addDays, shiftMonths, weekStart } from "@todone/sdk/calendar";
import { mapTask } from "@/lib/store";
import { listColor } from "./listIcon";
import s from "./app.module.css";

// Sort your tasks one card at a time, the way dating apps sort people: from every list, the late ones first, then the
// ones with no day, then a few others at random. Throw the card where it goes: right today, up this week, down this
// month, left later; done is a double-tap (Space on a keyboard; the arrow keys throw too). The four places are
// labelled around the card and light up as it heads their way. The first time, a practice card teaches each move,
// the way this device does it. Each choice saves at once (Backspace undoes it).
type Card = { list: List; task: Task; why: "late" | "undated" | "planned" | "practice" };
type Choice = "today" | "week" | "month" | "skip" | "done";
const DAY: Record<Exclude<Choice, "skip" | "done">, (d: string) => string> = {
  today: (d) => d,
  week: (d) => addDays(weekStart(d), 6), // by Sunday
  month: (d) => addDays(shiftMonths(`${d.slice(0, 7)}-01`, 1), -1), // by its last day
};
const SWIPE: Record<string, Choice> = { right: "today", up: "week", down: "month", left: "skip" };
const ARROW = { today: ArrowRight, week: ArrowUp, month: ArrowDown, skip: ArrowLeft } as const;
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

// The first time: one practice card, thrown each way in turn, then done. Said the way this device does it.
const TRAINED = "todone:sort-trained";
const PRACTICE: List = { id: "practice", name: "Practice", tasks: [] } as unknown as List;
type Lesson = { choice: Choice; touch: string; mouse: string };
const LESSONS: Lesson[] = [
  { choice: "today", touch: "Swipe the card right: today.", mouse: "Drag the card right (or press →): today." },
  { choice: "week", touch: "Swipe it up: this week.", mouse: "Drag it up (or press ↑): this week." },
  { choice: "month", touch: "Swipe it down: this month.", mouse: "Drag it down (or press ↓): this month." },
  { choice: "skip", touch: "Swipe it left: later. It stays as it is.", mouse: "Drag it left (or press ←): later. It stays as it is." },
  { choice: "done", touch: "Already done? Double-tap the card.", mouse: "Already done? Press Space." },
];

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
  // Practice: which lesson (null: none, or done before), and whether this device is touch-first.
  const [lesson, setLesson] = useState<number | null>(null);
  const [touch, setTouch] = useState(false);
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    let trained = false;
    try {
      trained = localStorage.getItem(TRAINED) === "1";
    } catch {}
    const coarse = matchMedia("(pointer: coarse)").matches;
    Promise.resolve().then(() => {
      setTouch(coarse);
      if (!trained && deck.length) setLesson(0);
    });
  }, [deck.length]);
  const practicing = lesson !== null;
  const practiceCard: Card = {
    list: PRACTICE,
    task: { id: `practice-${lesson}`, title: "Practice card", done: false, sub: [] } as unknown as Task,
    why: "practice",
  };
  const finishPractice = () => {
    try {
      localStorage.setItem(TRAINED, "1");
    } catch {}
    setLesson(null);
  };

  const card = practicing ? practiceCard : deck[at];
  // The live task (it may have changed since the deck was dealt).
  const live = (c: Card) => lists.find((l) => l.id === c.list.id)?.tasks.find((t) => t.id === c.task.id) ?? c.task;

  const fly = (c: Card, choice: Choice) => {
    const id = Date.now() + Math.random();
    setFlying((f) => [...f, { id, card: c, choice, from: drag ?? { x: 0, y: 0 } }]);
    setTimeout(() => setFlying((f) => f.filter((x) => x.id !== id)), 520);
    setDrag(null);
  };
  const choose = (choice: Choice) => {
    if (!card) return;
    if (practicing) {
      // Only the move being taught counts; anything else is a gentle shake.
      if (choice !== LESSONS[lesson].choice) {
        setDrag(null);
        setWrong(true);
        setTimeout(() => setWrong(false), 450);
        return;
      }
      fly(card, choice);
      if (lesson + 1 >= LESSONS.length) setTimeout(finishPractice, 350);
      else setLesson(lesson + 1);
      return;
    }
    const before = live(card);
    if (choice === "done") update(card.list.id, (l) => ({ ...l, tasks: tick(l.tasks, card.task.id, today, me) }));
    else if (choice !== "skip")
      update(card.list.id, (l) => ({ ...l, tasks: mapTask(l.tasks, card.task.id, (t) => ({ ...t, due: DAY[choice](today) })) }));
    setLog((x) => [...x, { card, before, choice }]);
    fly(card, choice);
    setAt((n) => n + 1);
  };
  const undo = () => {
    const last = log.at(-1);
    if (!last || practicing) return;
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
      } else if (e.key === "Backspace") keys.current.undo();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  // Which way a drag is heading (once it's gone far enough to mean it), and how far toward letting go it is (0–1).
  const dir = (d: { x: number; y: number } | null) => {
    if (!d) return null;
    const ax = Math.abs(d.x);
    const ay = Math.abs(d.y);
    if (Math.max(ax, ay) < 30) return null;
    return ax > ay ? (d.x > 0 ? "right" : "left") : d.y < 0 ? "up" : "down";
  };
  const heading = dir(drag);
  const pull = drag ? Math.min(1, Math.max(Math.abs(drag.x), Math.abs(drag.y)) / 90) : 0;
  const going = heading && pull >= 1 ? SWIPE[heading] : null; // let go now and it goes here
  const aim = heading ? SWIPE[heading] : practicing ? LESSONS[lesson].choice : null; // the label that lights up

  // Letting go: thrown if it went far enough, a tap (two quick ones are done) if it barely moved, else back it goes.
  // Also called when the phone loses the touch (a finger off the screen's edge, a system gesture): the card never
  // stays stranded.
  const release = () => {
    if (!start.current) return;
    const moved = drag && Math.hypot(drag.x, drag.y) > 10;
    start.current = null;
    if (going) return choose(going);
    setDrag(null);
    if (moved) return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      choose("done");
    } else lastTap.current = now;
  };
  const cancel = () => {
    start.current = null;
    setDrag(null);
  };
  // While a card is held, the page itself mustn't move under the finger: Safari on iPhone can still pan or zoom it
  // despite touch-action, so touch moves are cancelled outright (the card follows pointer events, not these).
  useEffect(() => {
    const hold = (e: TouchEvent) => {
      if (start.current) e.preventDefault();
    };
    addEventListener("touchmove", hold, { passive: false });
    return () => removeEventListener("touchmove", hold);
  }, []);
  // A touch that ends anywhere (not just on the card) ends the drag.
  const ends = useRef({ release, cancel });
  useEffect(() => {
    ends.current = { release, cancel };
  });
  useEffect(() => {
    const up = () => ends.current.release();
    const off = () => ends.current.cancel();
    addEventListener("pointerup", up);
    addEventListener("pointercancel", off);
    addEventListener("blur", off);
    return () => {
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", off);
      removeEventListener("blur", off);
    };
  }, []);


  // What a card shows: why it's here, the task, its list and steps.
  const face = (c: Card) => (
    <>
      <p className={s.sortWhy}>
        {c.why === "practice"
          ? `Practice · ${(lesson ?? 0) + 1} of ${LESSONS.length}`
          : c.why === "undated"
            ? "No day yet"
            : relDue(c.task.due!, today)}
      </p>
      <h2 className="display">{c.why === "practice" ? "Practice card" : live(c).title}</h2>
      {c.why !== "practice" && (
        <p className={s.sortMeta}>
          <span>{c.list.name}</span>
          {c.task.sub.length > 0 && (
            <span>
              {c.task.sub.filter((x) => x.done).length}/{c.task.sub.length} steps
            </span>
          )}
        </p>
      )}
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
              "--fill": f.card.why === "practice" ? "var(--butter)" : listColor(f.card.list.id),
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
  const next = practicing ? null : deck[at + 1];

  return (
    <div className={s.sortPage}>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Sort</h1>
        <p className={s.progress}>
          {practicing
            ? "First, a quick practice"
            : card
              ? `${deck.length - at} to go${sorted ? ` · ${sorted} sorted` : ""}`
              : `${sorted} sorted`}
        </p>
      </div>

      {card ? (
        <>
          {practicing && (
            <p className={s.sortLesson} role="status" data-wrong={wrong || undefined}>
              {touch ? LESSONS[lesson].touch : LESSONS[lesson].mouse}
              <button className={s.link} onClick={finishPractice}>
                Skip practice
              </button>
            </p>
          )}
          {/* That edge of the screen glows in the colour of where the card is heading. */}
          {heading && <i className={s.sortGlow} data-side={heading} data-for={SWIPE[heading]} style={{ "--pull": pull } as React.CSSProperties} aria-hidden />}
          {/* Where each throw goes, around the card: the one it's heading for lights up. */}
          <div className={s.sortArena} data-aim={aim ?? undefined} data-going={going ?? undefined}>
            {(
              [
                ["week", "This week", "up"],
                ["today", "Today", "right"],
                ["month", "This month", "down"],
                ["skip", "Later", "left"],
              ] as const
            ).map(([c, name, side]) => (
              <span key={c} className={s.sortTarget} data-side={side} data-on={aim === c || undefined} aria-hidden>
                {name}
              </span>
            ))}
            <div className={s.deck}>
              {next && <div className={s.deckNext} style={{ "--fill": listColor(next.list.id) } as React.CSSProperties} />}
              <article
                key={card.task.id}
                className={s.sortCard}
                data-held={drag ? true : undefined}
                data-to={going ?? undefined}
                data-wrong={wrong || undefined}
                data-aim={heading ? SWIPE[heading] : undefined}
                style={
                  {
                    "--fill": practicing ? "var(--butter)" : listColor(card.list.id),
                    "--pull": pull,
                    translate: drag ? `${drag.x}px ${drag.y}px` : undefined,
                    rotate: drag ? `${drag.x / 18}deg` : undefined,
                  } as React.CSSProperties
                }
                onPointerDown={(e) => {
                  if ((e.target as Element).closest("button") || start.current) return;
                  start.current = { x: e.clientX, y: e.clientY };
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!start.current) return;
                  // Kept mostly on screen while held: at most about half the screen in any direction.
                  const cx = innerWidth * 0.55;
                  const cy = innerHeight * 0.4;
                  setDrag({
                    x: Math.max(-cx, Math.min(cx, e.clientX - start.current.x)),
                    y: Math.max(-cy, Math.min(cy, e.clientY - start.current.y)),
                  });
                }}
                onPointerUp={release}
                onPointerCancel={cancel}
                onLostPointerCapture={() => start.current && release()}
              >
                {face(card)}
                {/* Where it's going, unmissable: the card fills with that place's colour and its name grows across it. */}
                {heading && SWIPE[heading] !== "done" && (() => {
                  const c = SWIPE[heading] as keyof typeof ARROW;
                  const Icon = ARROW[c];
                  return (
                    <span className={s.sortGo} data-for={c} data-sure={going ? true : undefined} aria-hidden>
                      <Icon size={44} strokeWidth={3.5} />
                      {STAMP[c]}
                    </span>
                  );
                })()}
              </article>
              {flyers}
            </div>
          </div>
          {/* For screen readers and keyboards: the same choices as buttons. */}
          <div className="sr-only">
            {(["today", "week", "month", "skip", "done"] as const).map((c) => (
              <button key={c} onClick={() => choose(c)}>
                {STAMP[c]}
              </button>
            ))}
          </div>
        </>
      ) : flying.length ? (
        // The last card on its way out, before "All sorted".
        <div className={s.sortArena}>
          <div className={s.deck}>{flyers}</div>
        </div>
      ) : (
        <div className={s.sortEnd}>
          <span className={s.sortEndIcon} aria-hidden>
            <Check size={44} strokeWidth={3.5} />
          </span>
          <p className="display">{deck.length ? "All sorted." : "Nothing to sort."}</p>
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={onDone}>
            Back to my lists
          </button>
        </div>
      )}
    </div>
  );
}
