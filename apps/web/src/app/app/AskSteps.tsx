"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Gift, Plus, Sparkles, Target, X } from "lucide-react";
import { Select } from "@/components/Select";
import {
  type Draft,
  type Step,
  changeLabel,
  commit,
  drop,
  newLists,
  newPlace,
  rename,
  stepAt,
  stepsOf,
  titleOf,
  toggle,
} from "@/lib/askBoard";
import type { List } from "@todone/sdk/tasks";
import { meta } from "./AskBoard";
import { ListIcon, NOTES, listColor, noteColor } from "./listIcon";
import s from "./app.module.css";

const NONE = "none";
const MAKE = "make";
// Each step is a sticker of its own colour, like New goal and the reward cards.
const LOOK: Record<Step, { fill: string; title: string; hint: string; unit: [string, string] }> = {
  questions: { fill: "#fff8ef", title: "A few questions", hint: "Answer what you can and todone remakes the plan. Or skip and go on with what it has.", unit: ["question", "questions"] },
  task: { fill: "var(--butter)", title: "Your to-dos", hint: "Untick any you don't want. Rename by typing; pick where each one goes.", unit: ["to-do", "to-dos"] },
  change: { fill: "#fff8ef", title: "Changes to your lists", hint: "What would change in the lists you shared. Untick any to leave as they are.", unit: ["change", "changes"] },
  goal: { fill: "var(--lime)", title: "Your goals", hint: "Goals to work towards. You can add their why and first steps later in Goals.", unit: ["goal", "goals"] },
  reward: { fill: "var(--pink)", title: "Your rewards", hint: "Treats your finished tasks pay for. Set what each one costs in XP.", unit: ["reward", "rewards"] },
  review: { fill: "var(--cyan)", title: "Ready to add", hint: "Here's everything going in, by where it goes.", unit: ["thing", "things"] },
};

// Ask todone's results, one kind at a time, as a step dialog in the style of New goal: questions it asked back,
// to-dos, changes, goals, rewards, then a review with Add. Each suggestion is a row to untick, rename or move.
// Closing it (×, Esc, Ask more) goes back to Ask todone with everything kept.
export function AskSteps({
  drafts,
  onChange,
  lists,
  made,
  onMake,
  today,
  onAdd,
  onAddSome,
  onClear,
  onExit,
  questions,
  replies,
  onReply,
  onAnswer,
  onSkip,
  busy,
}: {
  drafts: Draft[];
  onChange: (ds: Draft[]) => void;
  lists: List[];
  made: string[];
  onMake: (name: string) => void;
  today: string;
  onAdd: () => void;
  onAddSome: (kind: Draft["kind"]) => void; // just this step's kind, now
  onClear: () => void;
  onExit: () => void;
  questions: string[];
  replies: string[];
  onReply: (i: number, v: string) => void;
  onAnswer: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  const [want, setWant] = useState<Step>(questions.length ? "questions" : "task");
  const asks = questions.length > 0;
  const steps = stepsOf(drafts, asks);
  const step = stepAt(drafts, want, asks);
  const at = steps.indexOf(step);
  const go = (x: Step) => {
    setWant(x);
    body.current?.scrollTo({ top: 0 });
  };
  const look = LOOK[step];
  const mine = step === "questions" || step === "review" ? [] : drafts.filter((d) => d.kind === step);
  const on = drafts.filter((d) => !d.off);
  const ready = on.filter((d) => d.place !== null).length;
  const count = step === "questions" ? questions.length : step === "review" ? ready : mine.filter((d) => !d.off).length;
  const nextStep = steps[at + 1];
  // Skip a whole kind (all the goals, say): none of them go in; Keep all brings them back.
  const allOff = mine.length > 0 && mine.every((d) => d.off);
  const skipAll = () => {
    onChange(drafts.map((d) => (d.kind === step ? ({ ...d, off: allOff ? undefined : true } as Draft) : d)));
    if (!allOff && nextStep) go(nextStep);
  };

  return (
    <dialog
      ref={ref}
      className={`${s.goalDialog} ${s.askDialog}`}
      style={{ "--fill": look.fill } as React.CSSProperties}
      onClose={onExit}
      aria-labelledby="ask-step-h"
    >
      <header className={s.askDHead}>
        <div>
          <p className={s.goalStep}>
            Step {at + 1} of {steps.length} · {count} {look.unit[count === 1 ? 0 : 1]}
          </p>
          <h2 id="ask-step-h" className="display">
            {look.title}
          </h2>
        </div>
        <button className={s.panelClose} onClick={() => ref.current?.close()} aria-label="Back to Ask todone">
          <X size={18} strokeWidth={2.75} />
        </button>
      </header>
      <ol className={s.askDots} aria-label="Steps">
        {steps.map((k, i) => (
          <li key={k}>
            <button
              type="button"
              aria-current={k === step ? "step" : undefined}
              data-done={i < at || undefined}
              onClick={() => go(k)}
              title={LOOK[k].title}
            >
              <span className="sr-only">{LOOK[k].title}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className={s.askDHint}>{look.hint}</p>

      {busy && (
        <p className={s.askDBusy} role="status">
          <Sparkles size={15} strokeWidth={2.5} aria-hidden className={s.askSpark} data-busy /> Updating your plan…
        </p>
      )}
      <div ref={body} className={s.askDBody} aria-busy={busy}>
        {step === "questions" ? (
          <div className={s.askDQs}>
            {questions.map((q, i) => (
              <label key={q} className={s.goalField}>
                <span>{q}</span>
                <input
                  value={replies[i] ?? ""}
                  disabled={busy}
                  autoFocus={i === 0}
                  onChange={(e) => onReply(i, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && replies.some((r) => r?.trim()) && onAnswer()}
                  placeholder="Your answer"
                />
              </label>
            ))}
          </div>
        ) : step === "review" ? (
          <Review drafts={drafts} lists={lists} onFix={(k) => go(k)} />
        ) : (
          <ul className={s.askRows}>
            {mine.map((d) => (
              <Row key={d.id} d={d} drafts={drafts} onChange={onChange} lists={lists} made={made} onMake={onMake} today={today} />
            ))}
          </ul>
        )}
      </div>

      <footer className={s.askDFoot}>
        <button type="button" className={s.askDLink} onClick={() => ref.current?.close()}>
          Ask more
        </button>
        {drafts.length > 0 && (
          <button type="button" className={s.askDLink} onClick={onClear}>
            Clear all
          </button>
        )}
        {mine.length > 0 && (
          <button type="button" className={s.askDLink} onClick={skipAll} disabled={busy}>
            {allOff ? `Keep all ${look.unit[1]}` : `Skip ${mine.length === 1 ? `this ${look.unit[0]}` : `these ${look.unit[1]}`}`}
          </button>
        )}
        <span className={s.wizGap} />
        {at > 0 && (
          <button type="button" className="btn" style={{ "--fill": "#fff" } as React.CSSProperties} onClick={() => go(steps[at - 1])}>
            <ArrowLeft size={16} strokeWidth={2.75} aria-hidden /> Back
          </button>
        )}
        {step === "questions" ? (
          <>
            {drafts.length > 0 && (
              <button type="button" className="btn" style={{ "--fill": "#fff" } as React.CSSProperties} disabled={busy} onClick={onSkip}>
                Skip
              </button>
            )}
            <button
              type="button"
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              disabled={busy || !replies.some((r) => r?.trim())}
              onClick={onAnswer}
            >
              <Sparkles size={16} strokeWidth={2.5} aria-hidden /> Answer and update
            </button>
          </>
        ) : step === "review" ? (
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!ready || busy} onClick={onAdd}>
            <Check size={16} strokeWidth={3} aria-hidden /> Add {ready} {ready === 1 ? "thing" : "things"}
          </button>
        ) : (
          <>
            {/* Just these, now (the rewards without the lists, say); the rest stays to review. */}
            {count > 0 && (
              <button
                type="button"
                className="btn"
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                disabled={busy}
                onClick={() => onAddSome(step as Draft["kind"])}
              >
                <Check size={16} strokeWidth={3} aria-hidden /> Add {count === 1 ? "it" : `these ${count}`}
              </button>
            )}
            {nextStep && (
              <button type="button" className="btn" style={{ "--fill": "var(--black)", color: "#fff8ef" } as React.CSSProperties} onClick={() => go(nextStep)}>
                Next: {LOOK[nextStep].title.replace(/^Your (.)/, (_, c: string) => c.toUpperCase())} <ArrowRight size={16} strokeWidth={2.75} aria-hidden />
              </button>
            )}
          </>
        )}
      </footer>
    </dialog>
  );
}

// One suggestion: tick to keep, type to rename, and where it goes (a list for a to-do, the XP for a reward).
function Row({
  d,
  drafts,
  onChange,
  lists,
  made,
  onMake,
  today,
}: {
  d: Draft;
  drafts: Draft[];
  onChange: (ds: Draft[]) => void;
  lists: List[];
  made: string[];
  onMake: (name: string) => void;
  today: string;
}) {
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState(titleOf(d));
  const [unfolded, setUnfolded] = useState(false);
  const fresh = newLists(drafts, made, lists);
  const places = [
    ...(d.place ? [] : [{ value: NONE, label: "Choose a list…" }]),
    ...lists.map((l) => ({ value: l.id, label: l.name })),
    ...fresh.map((n) => ({ value: newPlace(n), label: `${n} (new)` })),
    { value: MAKE, label: "+ New list…" },
  ];
  const chips = d.kind === "change" ? [] : meta(d, today);
  const why = d.kind === "task" ? d.task.note : d.kind === "change" ? d.change.why : undefined;
  const subs = d.kind === "task" ? d.task.sub : [];
  const steps = subs.length;
  return (
    <li className={s.askRow} data-off={d.off || undefined} data-kind={d.kind}>
      <button
        type="button"
        className={s.askTick}
        role="checkbox"
        aria-checked={!d.off}
        aria-label={`Keep ${titleOf(d)}`}
        onClick={() => onChange(toggle(drafts, d.id))}
      >
        {!d.off && <Check size={15} strokeWidth={3.5} />}
      </button>
      <div className={s.askRowMain}>
        {d.kind === "change" ? (
          <p className={s.askRowTitle}>
            <i className={s.askOp}>{changeLabel(d.change)}</i> {d.task.title}
          </p>
        ) : (
          <input
            className={s.askRowTitle}
            value={title}
            aria-label="Name"
            maxLength={500}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => (title.trim() ? onChange(rename(drafts, d.id, title)) : setTitle(titleOf(d)))}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        )}
        {(chips.length > 0 || steps > 0) && (
          <span className={s.askMeta}>
            {d.kind === "goal" && <Target size={12} strokeWidth={2.75} aria-hidden />}
            {chips.map((c) => (
              <i key={c}>{c}</i>
            ))}
          </span>
        )}
        {/* The smaller steps the AI broke it into: they come along as the task's steps. */}
        {steps > 0 && (
          <button type="button" className={s.askFold} aria-expanded={unfolded} onClick={() => setUnfolded((u) => !u)}>
            <ChevronRight size={12} strokeWidth={3} aria-hidden /> {steps === 1 ? "1 step inside" : `${steps} steps inside`}
          </button>
        )}
        {unfolded && (
          <ul className={s.askSteps} aria-label="Steps">
            {subs.map((x) => (
              <li key={x.id}>
                {x.title}
                {x.est ? <small> · {x.est >= 60 ? `${Math.floor(x.est / 60)}h${x.est % 60 ? ` ${x.est % 60}m` : ""}` : `${x.est}m`}</small> : null}
              </li>
            ))}
          </ul>
        )}
        {why && <p className={s.askRowWhy}>{why}</p>}
      </div>
      <div className={s.askRowWhere}>
        {d.kind === "task" &&
          (naming ? (
            <form
              className={s.askMake}
              onSubmit={(e) => {
                e.preventDefault();
                const n = new FormData(e.currentTarget).get("name")?.toString().trim().slice(0, 60);
                if (!n) return;
                onMake(n);
                onChange(drop(drafts, d.id, newPlace(n)));
                setNaming(false);
              }}
            >
              <input name="name" autoFocus placeholder="New list name" aria-label="New list name" maxLength={60} onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setNaming(false))} />
              <button aria-label="Make list">
                <Plus size={14} strokeWidth={3} />
              </button>
            </form>
          ) : (
            <Select
              label={`Where ${titleOf(d)} goes`}
              className={d.place ? undefined : s.askNeeds}
              value={d.place ?? NONE}
              options={places}
              onChange={(v) => (v === MAKE ? setNaming(true) : v !== NONE && onChange(drop(drafts, d.id, v)))}
            />
          ))}
        {d.kind === "reward" && (
          <label className={s.askXp}>
            <input
              inputMode="numeric"
              value={d.reward.cost}
              aria-label="Cost in XP"
              onChange={(e) => {
                const cost = Math.max(1, Math.min(100000, Math.round(+e.target.value.replace(/\D/g, "") || 0)));
                onChange(drafts.map((x) => (x.id === d.id && x.kind === "reward" ? { ...x, reward: { ...x.reward, cost } } : x)));
              }}
            />
            XP
          </label>
        )}
      </div>
    </li>
  );
}

// The last step: what goes where, a sticker per place, and anything still without a list.
function Review({ drafts, lists, onFix }: { drafts: Draft[]; lists: List[]; onFix: (k: Step) => void }) {
  const { groups, goals, rewards, changes } = commit(drafts);
  const homeless = drafts.filter((d) => d.place === null && !d.off);
  const off = drafts.filter((d) => d.off).length;
  const rows = [
    ...groups.map((g) => {
      const l = g.listId ? lists.find((x) => x.id === g.listId) : undefined;
      return {
        key: g.listId ?? `new:${g.name}`,
        head: l ? (
          <>
            <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
          </>
        ) : (
          <>{g.name} · new list</>
        ),
        fill: l ? listColor(l.id) : NOTES[noteColor(g.name ?? "")],
        items: g.tasks.map((t) => t.title),
      };
    }),
    ...(changes.length ? [{ key: "changes", head: <>Changes</>, fill: "#fff8ef", items: changes.map((c) => `${changeLabel(c.change)}: ${c.task.title}`) }] : []),
    ...(goals.length ? [{ key: "goals", head: <><Target size={14} strokeWidth={2.5} aria-hidden /> Goals</>, fill: "var(--lime)", items: goals.map((g) => g.title) }] : []),
    ...(rewards.length ? [{ key: "rewards", head: <><Gift size={14} strokeWidth={2.5} aria-hidden /> Rewards</>, fill: "var(--pink)", items: rewards.map((r) => `${r.title} · ${r.cost} XP`) }] : []),
  ];
  return (
    <div className={s.askReviewD}>
      {homeless.length > 0 && (
        <p className={s.askFix} role="alert">
          {homeless.length === 1 ? "1 to-do needs" : `${homeless.length} to-dos need`} a list first.
          <button type="button" onClick={() => onFix("task")}>
            Choose a list
          </button>
        </p>
      )}
      {rows.map((r) => (
        <section key={r.key} className={s.askGroup} style={{ "--fill": r.fill } as React.CSSProperties}>
          <h3>
            {r.head} <span className={s.askCount}>{r.items.length}</span>
          </h3>
          <ul>
            {r.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      ))}
      {!rows.length && <p className={s.askDHint}>Nothing ticked yet. Go back and tick what you want.</p>}
      {off > 0 && <p className={s.askDHint}>{off === 1 ? "1 suggestion is" : `${off} suggestions are`} left out.</p>}
    </div>
  );
}
