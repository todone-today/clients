"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { GoalItem } from "@todone/sdk/goals";
import { START_STEPS, START_XP, type StartKey, onDid, startWinId, writeStart } from "@/lib/start";
import { changeGoals, useGoalItems } from "./goalStore";
import type { Panel } from "./Workspaces";
import s from "./app.module.css";

// Getting started, for new people: a checklist in the bottom-right corner that ticks itself as they do each thing,
// paying XP for each (wins "start-<key>" in the goals list, so the XP tile counts them). It replaces the welcome
// video and the automatic tour; Skip hides it for good, and so does finishing.
export function Start({
  who,
  me,
  lists,
  panel,
  onPanel,
  onEnd,
}: {
  who: string;
  me?: string;
  lists: { id: string; kind?: string }[] | null;
  panel: Panel;
  onPanel: (p: Panel) => void;
  onEnd: () => void;
}) {
  const items = useGoalItems().items;
  const [open, setOpen] = useState(true);
  const [just, setJust] = useState<StartKey | null>(null);
  const got = new Set(items.filter((i) => i.t === "win" && i.id.startsWith("start-")).map((i) => i.id));
  const has = (k: StartKey) => got.has(startWinId(k));
  const done = START_STEPS.filter((st) => has(st.key));
  const all = done.length === START_STEPS.length;

  // Pays a step once: the check runs again inside the change, so two tabs can't pay it twice.
  const award = (key: StartKey) => {
    const st = START_STEPS.find((x) => x.key === key)!;
    const id = startWinId(key);
    changeGoals(lists, (xs) =>
      xs.some((x) => x.id === id)
        ? xs
        : [...xs, { t: "win", id, title: `Getting started: ${st.label}`, at: Date.now(), xp: st.xp, ...(me ? { by: me } : {}) } as GoalItem],
    );
    setJust(key);
  };

  // Steps told by the app (Ask todone added things, a task was typed in).
  useEffect(() => onDid((k) => !got.has(startWinId(k)) && award(k)));
  // Steps seen in the data or on screen.
  const ticked = items.some((i) => i.t === "win" && !i.spend && !i.log && !i.id.startsWith("start-"));
  const goal = items.some((i) => i.t === "goal");
  const reward = items.some((i) => i.t === "reward");
  useEffect(() => {
    if (!lists) return;
    const due: StartKey[] = [];
    if (ticked && !has("done")) due.push("done");
    if (goal && !has("goal")) due.push("goal");
    if (reward && !has("reward")) due.push("reward");
    if (panel === "calendar" && !has("calendar")) due.push("calendar");
    if (due.length) Promise.resolve().then(() => due.forEach(award));
  });
  useEffect(() => {
    if (!just) return;
    const t = setTimeout(() => setJust(null), 1600);
    return () => clearTimeout(t);
  }, [just]);

  const finish = () => {
    writeStart(who, "off");
    onEnd();
  };
  // "Show me": takes them to where the step happens.
  const show = (k: StartKey) => {
    const focus = (sel: string) =>
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(sel);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus();
      }, 120);
    if (k === "calendar" || k === "goal" || k === "reward") return onPanel(k === "goal" ? "goals" : k === "reward" ? "rewards" : "calendar");
    onPanel(null);
    if (k === "ask") focus("[data-tour='ask'] input");
    if (k === "add") focus("#new-task");
    if (k === "done") focus("li[data-card] [role=checkbox], li[data-card] button");
  };

  if (!open)
    return (
      <button className={s.startPill} onClick={() => setOpen(true)} aria-label={`Get started: ${done.length} of ${START_STEPS.length} done`}>
        <Sparkles size={16} strokeWidth={2.5} aria-hidden />
        Get started
        <span className={s.startCount}>
          {done.length}/{START_STEPS.length}
        </span>
        <ChevronUp size={16} strokeWidth={2.75} aria-hidden />
      </button>
    );

  return (
    <aside className={s.start} aria-labelledby="start-h">
      <header>
        <div>
          <h2 id="start-h" className="display">
            {all ? "You're all set" : "Get started"}
          </h2>
          <p>
            {all
              ? `You earned ${START_XP} XP. Spend it in Rewards.`
              : `${done.length} of ${START_STEPS.length} done · ${START_XP - done.reduce((n, st) => n + st.xp, 0)} XP to earn`}
          </p>
        </div>
        <button className={s.startFold} onClick={() => setOpen(false)} aria-label="Hide the checklist">
          <ChevronDown size={18} strokeWidth={2.75} />
        </button>
      </header>
      <span className={s.bar} aria-hidden>
        <i style={{ transform: `scaleX(${done.length / START_STEPS.length})` }} />
      </span>
      <ol>
        {START_STEPS.map((st) => {
          const ok = has(st.key);
          return (
            <li key={st.key} data-done={ok || undefined} data-just={just === st.key || undefined}>
              <span className={s.startBox} aria-hidden>
                {ok && <Check size={14} strokeWidth={3.5} />}
              </span>
              <span className={s.startLabel}>
                {st.label}
                <span className="sr-only">{ok ? ", done" : ""}</span>
              </span>
              {ok ? (
                <i className={s.startXp}>+{st.xp} XP</i>
              ) : (
                <button className={s.startShow} onClick={() => show(st.key)}>
                  Show me
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <footer>
        {all ? (
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={finish}>
            Done
          </button>
        ) : (
          <button className={s.startSkip} onClick={finish}>
            Skip the tutorial
          </button>
        )}
      </footer>
    </aside>
  );
}
