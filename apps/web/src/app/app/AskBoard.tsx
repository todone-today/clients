"use client";

import { useState } from "react";
import { ChevronRight, Gift, Plus, Target, X } from "lucide-react";
import { Select } from "@/components/Select";
import { draggable, useDrop } from "@/lib/drag";
import { BIN, GOALS, REWARDS, type Draft, drop, newLists, newName, newPlace, rename, titleOf } from "@/lib/askBoard";
import { type List, relDue } from "@todone/sdk/tasks";
import { ListIcon, NOTES, listColor, noteColor } from "./listIcon";
import s from "./app.module.css";

const NONE = "none"; // tasks the AI gave no list
const MAKE = "make"; // "New list…" in a sticker's Move to
const PRI = ["High", "Medium", "Low"];
const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

// What a suggestion says besides its title, the way a list note shows its chips.
function meta(d: Draft, today: string) {
  if (d.kind === "reward") return [`${d.reward.cost} XP`];
  if (d.kind === "goal") {
    const g = d.goal;
    return [
      g.kind === "habit"
        ? `${g.perWeek}× a week`
        : g.kind === "outcome"
          ? g.by
            ? `by ${g.by}`
            : "to finish"
          : g.kind === "target"
            ? `${g.start} → ${g.target} ${g.unit ?? ""}`
            : `${g.target} ${g.unit ?? ""} a day`,
    ];
  }
  const t = d.task;
  return [
    t.pri ? `${PRI[t.pri - 1]} priority` : "",
    t.due ? relDue(t.due, today) + (t.at ? ` ${t.at}` : "") : "",
    t.est ? mins(t.est) : "",
    t.effort ? `Effort ${t.effort.toUpperCase()}` : "",
  ].filter(Boolean);
}

// Ask todone's results, already sorted: a lane for each place something is going (your lists, new lists, Goals,
// Rewards), each suggestion a sticker with its priority, timing, effort, steps and the AI's reason. To move one, pick
// where it goes in its "Move to" (any list, a new one, Goals, Rewards), or drag it onto another lane.
export function AskBoard({
  drafts,
  onChange,
  lists,
  made,
  onMake,
  today,
}: {
  drafts: Draft[];
  onChange: (ds: Draft[]) => void;
  lists: List[];
  made: string[];
  onMake: (name: string) => void;
  today: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null); // the sticker getting a new list
  const [unfolded, setUnfolded] = useState<string[]>([]); // steps start folded
  const put = (id: string, place: string) => onChange(drop(drafts, id, place === NONE ? null : place));
  const dropOn = useDrop("ask", {
    accept: (p) => p.kind === "draft",
    drop: (p, arg) => p.kind === "draft" && put(p.id, arg),
  });
  const fill = (d: Draft) =>
    d.kind === "goal"
      ? "var(--lime)"
      : d.kind === "reward"
        ? "var(--pink)"
        : d.place && !newName(d.place)
          ? listColor(d.place)
          : NOTES[noteColor(newName(d.place) ?? newName(d.ai) ?? d.id)];

  const sticker = (d: Draft) => {
    const chips = meta(d, today);
    const steps = d.kind === "task" ? d.task.sub : [];
    const why = d.kind === "task" ? d.task.note : undefined;
    return (
      <div
        key={d.id}
        data-id={d.id}
        data-card
        className={s.askNote}
        data-kind={d.kind}
        data-pri={d.kind === "task" ? d.task.pri : undefined}
        style={{ "--fill": fill(d) } as React.CSSProperties}
        {...draggable({ kind: "draft", id: d.id }, titleOf(d))}
        onDoubleClick={() => setEditing(d.id)}
      >
        {d.kind === "goal" && <Target size={14} strokeWidth={2.5} aria-hidden />}
        {d.kind === "reward" && <Gift size={14} strokeWidth={2.5} aria-hidden />}
        {editing === d.id ? (
          <input
            autoFocus
            defaultValue={titleOf(d)}
            aria-label="Rename"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onChange(rename(drafts, d.id, e.target.value));
              setEditing(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(null);
            }}
          />
        ) : (
          <b>{titleOf(d)}</b>
        )}
        {chips.length > 0 && (
          <span className={s.askMeta}>
            {chips.map((m) => (
              <i key={m}>{m}</i>
            ))}
          </span>
        )}
        {steps.length > 0 && (
          <button
            type="button"
            className={s.askFold}
            aria-expanded={unfolded.includes(d.id)}
            onClick={() => {
              setUnfolded((u) => (u.includes(d.id) ? u.filter((x) => x !== d.id) : [...u, d.id]));
            }}
          >
            <ChevronRight size={12} strokeWidth={3} aria-hidden /> {steps.length} {steps.length === 1 ? "step" : "steps"}
          </button>
        )}
        {steps.length > 0 && unfolded.includes(d.id) && (
          <ul className={s.askSteps} aria-label="Steps">
            {steps.map((t) => (
              <li key={t.id}>
                {t.title}
                {t.est ? <small> · {mins(t.est)}</small> : null}
              </li>
            ))}
          </ul>
        )}
        {why && <p className={s.askWhy}>{why}</p>}
        <div className={s.askMove} data-nodrag>
          {naming === d.id ? (
            <form
              className={s.askMake}
              onSubmit={(e) => {
                e.preventDefault();
                const n = new FormData(e.currentTarget).get("name")?.toString().trim().slice(0, 60);
                if (!n) return;
                onMake(n);
                put(d.id, newPlace(n));
                setNaming(null);
              }}
            >
              <input name="name" autoFocus placeholder="New list name" aria-label="New list name" maxLength={60} onKeyDown={(e) => e.key === "Escape" && setNaming(null)} />
              <button aria-label="Make list">
                <Plus size={14} strokeWidth={3} />
              </button>
            </form>
          ) : (
            <Select
              label={`Move ${titleOf(d)} to`}
              value={d.place ?? NONE}
              options={[...(d.place ? [] : [{ value: NONE, label: "Choose a list…" }]), ...moveTo, { value: MAKE, label: "+ New list…" }]}
              onChange={(v) => (v === MAKE ? setNaming(d.id) : put(d.id, v))}
            />
          )}
        </div>
        <button
          className={s.askX}
          aria-label={`Leave out ${titleOf(d)}`}
          onClick={() => onChange(drop(drafts, d.id, BIN))}
        >
          <X size={12} strokeWidth={3} />
        </button>
      </div>
    );
  };

  // Every place, and how it's shown: a lane when something is going there, a small spot below otherwise.
  const fresh = newLists(drafts, made, lists);
  const places: { id: string; head: React.ReactNode; fill: string; dashed?: boolean }[] = [
    ...lists.map((l) => ({
      id: l.id,
      head: (
        <>
          <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
        </>
      ),
      fill: listColor(l.id),
    })),
    ...fresh.map((n) => ({ id: newPlace(n), head: <>{n} · new list</>, fill: NOTES[noteColor(n)], dashed: true })),
    { id: GOALS, head: <><Target size={14} strokeWidth={2.5} aria-hidden /> Goals</>, fill: "var(--lime)" },
    { id: REWARDS, head: <><Gift size={14} strokeWidth={2.5} aria-hidden /> Rewards</>, fill: "var(--pink)" },
  ];
  const moveTo = [
    ...lists.map((l) => ({ value: l.id, label: l.name })),
    ...fresh.map((n) => ({ value: newPlace(n), label: `${n} (new)` })),
    { value: GOALS, label: "Goals" },
    { value: REWARDS, label: "Rewards" },
  ];
  const at = (id: string) => drafts.filter((d) => (d.place ?? NONE) === id);
  const homeless = at(NONE);
  const lanes = places.filter((p) => at(p.id).length);

  return (
    <div className={s.askBoard}>
      <ul className={s.askLanes}>
        {homeless.length > 0 && (
          <li className={s.askTile} data-new {...dropOn(NONE)}>
            <span className={s.askTileHead}>
              Needs a list <span className={s.askCount}>{homeless.length}</span>
            </span>
            {homeless.map(sticker)}
          </li>
        )}
        {lanes.map((p) => (
          <li
            key={p.id}
            className={s.askTile}
            data-new={p.dashed || undefined}
            style={{ "--fill": p.fill } as React.CSSProperties}
            {...dropOn(p.id)}
          >
            <span className={s.askTileHead}>
              {p.head}
              <span className={s.askCount}>{at(p.id).length}</span>
            </span>
            {at(p.id).map(sticker)}
          </li>
        ))}
      </ul>

    </div>
  );
}
