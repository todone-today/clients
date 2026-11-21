"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Check, GraduationCap, Lightbulb, Zap } from "lucide-react";
import { uid } from "@todone/sdk/tasks";
import type { Task } from "@todone/sdk/tasks";
import { Confetti } from "@/components/Confetti";
import { type Counts, MISSIONS, TOTAL_XP, measure, nextMission } from "@/lib/training";
import { changeGoals, useGoalItems } from "./goalStore";
import s from "./app.module.css";

// The training (lib/training.ts for the missions): first a word on why it's worth five minutes, then one mission at
// a time on a card that stays put while you use the app, pointing at the control when it's guided, then a cheer.
// Where it got to is kept in this browser, so a reload picks it up again.
type State = { at: number; base: Counts; xp: number };
const keyFor = (who: string) => `todone:training:${who}`;
function load(who: string): State | null {
  try {
    const st = JSON.parse(localStorage.getItem(keyFor(who)) ?? "null") as State | null;
    return st && st.at < MISSIONS.length ? st : null; // finished: next time starts over
  } catch {
    return null;
  }
}
const save = (who: string, st: State) => {
  try {
    localStorage.setItem(keyFor(who), JSON.stringify(st));
  } catch {}
};

export function Training({
  who,
  lists,
  onEnd,
}: {
  who: string | undefined;
  lists: { id: string; kind?: string; tasks: Task[] }[];
  onEnd: () => void;
}) {
  const me = who ?? "demo";
  const { items } = useGoalItems();
  const now = measure(lists, items);
  const [st, setSt] = useState<State | null>(() => load(me));
  const [hint, setHint] = useState(false); // "your turn" missions point at the control only when asked
  const [finished, setFinished] = useState(false);

  // Something changed in the lists: check off what's now done, and pay for it in real XP.
  const sig = JSON.stringify(now);
  useEffect(() => {
    if (!st) return;
    const n = nextMission(st.at, st.base, now);
    if (n === st.at) return;
    const paid = MISSIONS.slice(st.at, n).filter((m) => m.xp);
    const next = { ...st, at: n, xp: st.xp + paid.reduce((x, m) => x + m.xp, 0) };
    if (paid.length)
      changeGoals(lists, (xs) => [
        ...xs,
        ...paid.map((m) => ({
          t: "win" as const,
          id: `train-${m.id}-${uid()}`,
          title: `Training: ${m.title.replace(/^Your turn: /, "")}`,
          at: Date.now(),
          xp: m.xp,
          ...(who ? { by: who } : {}),
        })),
      ]);
    navigator.vibrate?.(12);
    Promise.resolve().then(() => {
      setSt(next);
      setHint(false);
      if (n >= MISSIONS.length) setFinished(true);
    });
    save(me, next);
    // `sig` stands for `now`; the rest are read fresh when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, st?.at]);

  const start = () => {
    const first = { at: nextMission(0, now, now), base: now, xp: 0 };
    save(me, first);
    setSt(first);
  };
  const stop = () => {
    try {
      localStorage.removeItem(keyFor(me));
    } catch {}
    onEnd();
  };

  if (finished && st) return <Finished xp={st.xp} onDone={stop} />;
  if (!st) return <Welcome onStart={start} onLater={stop} />;

  const m = MISSIONS[st.at];
  const phone = typeof matchMedia !== "undefined" && matchMedia("(max-width: 760px)").matches;
  const target = m && (m.mode === "guided" || hint) ? (phone && m.phoneTarget) || m.target : undefined;
  const left = MISSIONS.length - st.at;
  return (
    <>
      {target && <Spot target={target} />}
      <aside className={s.trainCard} aria-label="Training" aria-live="polite">
        <header>
          <GraduationCap size={16} strokeWidth={2.5} aria-hidden />
          <b>Training</b>
          <span>
            {st.at} of {MISSIONS.length} · {left === 1 ? "last one!" : `${left} to go`}
          </span>
          <span className={s.trainXp}>
            <Zap size={13} strokeWidth={2.75} aria-hidden /> {st.xp} XP
          </span>
        </header>
        <Meter at={st.at} />
        {m && (
          <div key={m.id} className={s.trainMission} data-solo={m.mode === "solo" || undefined}>
            <h2>
              {m.title} <small>+{m.xp} XP</small>
            </h2>
            <p>{(phone && m.phone) || m.how}</p>
          </div>
        )}
        <div className={s.trainNav}>
          <button className={s.link} onClick={stop}>
            Skip training
          </button>
          {m?.mode === "solo" && !hint && (
            <button className={s.ghost} onClick={() => setHint(true)}>
              <Lightbulb size={15} strokeWidth={2.5} aria-hidden /> Hint
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

// The missions as a row of ticks, filled up to where you are: some already done before you begin.
function Meter({ at }: { at: number }) {
  return (
    <ol className={s.trainMeter} aria-label={`${at} of ${MISSIONS.length} done`}>
      {MISSIONS.map((m, i) => (
        <li key={m.id} data-done={i < at || undefined} data-now={i === at || undefined} title={m.title} />
      ))}
    </ol>
  );
}

// Why it's worth five minutes, before anything starts. Two missions already ticked: you've begun.
function Welcome({ onStart, onLater }: { onStart: () => void; onLater: () => void }) {
  return (
    <div className={s.trainShade}>
      <div className={s.trainWelcome} role="dialog" aria-modal="true" aria-labelledby="train-h">
        <GraduationCap size={34} strokeWidth={2.25} aria-hidden />
        <h2 id="train-h" className="display">
          Learn todone in 5 minutes
        </h2>
        <p>
          todone is a system, not just a list: lists and tasks, stickers for when and how important, goals they add up
          to, and rewards they pay for. It works best once you know how the pieces fit, so sit in for five minutes and
          get acquainted. You&apos;ll do each thing once, for real, and earn XP as you go.
        </p>
        <Meter at={2} />
        <ul className={s.trainGiven}>
          {MISSIONS.filter((m) => m.mode === "given").map((m) => (
            <li key={m.id}>
              <Check size={15} strokeWidth={3} aria-hidden /> {m.title}
            </li>
          ))}
          <li data-todo>{MISSIONS.length - 2} quick missions to go · up to {TOTAL_XP} XP</li>
        </ul>
        <div className={s.trainNav}>
          <button className={s.link} onClick={onLater}>
            Not now
          </button>
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={onStart} autoFocus>
            Start training
          </button>
        </div>
      </div>
    </div>
  );
}

function Finished({ xp, onDone }: { xp: number; onDone: () => void }) {
  return (
    <div className={s.trainShade}>
      <Confetti />
      <div className={s.trainWelcome} role="dialog" aria-modal="true" aria-labelledby="train-done">
        <h2 id="train-done" className="display">
          Training done!
        </h2>
        <p>
          <b>+{xp} XP.</b> You know the loop now: write tasks, stick on when and how important, tick them off, and let
          the XP pay for the things you enjoy, on the way to your goals. The rest is yours.
        </p>
        <Meter at={MISSIONS.length} />
        <div className={s.trainNav}>
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={onDone} autoFocus>
            Back to my lists
          </button>
        </div>
      </div>
    </div>
  );
}

// A ring around the control a guided mission is about, following it as the page moves. It doesn't block anything.
function Spot({ target }: { target: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    let raf = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      return el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" ? el : null;
    };
    const track = () => {
      const r = find()?.getBoundingClientRect() ?? null;
      setRect((o) => (o && r && o.x === r.x && o.y === r.y && o.width === r.width && o.height === r.height ? o : r));
      raf = requestAnimationFrame(track);
    };
    const t = setTimeout(() => find()?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
    track();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [target]);
  if (!rect) return null;
  const pad = 6;
  return (
    <div
      className={s.trainSpot}
      aria-hidden
      style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }}
    />
  );
}
