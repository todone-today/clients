"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  GOAL_AREAS,
  GOAL_TEMPLATES,
  REWARD_AREAS,
  REWARD_TEMPLATES,
  type GoalTemplate,
  type RewardTemplate,
  goalNote,
  matches,
} from "@/lib/templates";
import { Select } from "@/components/Select";
import s from "./app.module.css";

// Sticker colours, one per area, so a glance tells the areas apart.
const FILLS = ["var(--lime)", "var(--cyan)", "var(--butter)", "var(--pink)", "var(--peri)", "var(--peach)"];
const fill = (areas: readonly string[], area: string) => FILLS[areas.indexOf(area) % FILLS.length];

// Pick a starting point, or start from nothing. A search across every template, the areas as one row of chips (it
// scrolls sideways on a phone), then the cards. Picking one hands it back to be checked and changed before saving.
function Picker<T extends { title: string; area: string }>({
  label,
  areas,
  items,
  taken,
  note,
  own,
  onPick,
  onOwn,
  onClose,
}: {
  label: string;
  areas: readonly string[];
  items: T[];
  taken: string[]; // titles already made: they're left out
  note: (t: T) => string;
  own: string;
  onPick: (t: T) => void;
  onOwn: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [area, setArea] = useState<string | null>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  const have = useMemo(() => new Set(taken.map((t) => t.toLowerCase())), [taken]);
  const shown = items.filter(
    (t) => !have.has(t.title.toLowerCase()) && (q ? matches(q, t.title, t.area) : !area || t.area === area),
  );
  return (
    <dialog ref={ref} className={`${s.goalDialog} ${s.tplDialog}`} aria-label={label} onClose={onClose}>
      <header className={s.tplHead}>
        <h2 className="display">{label}</h2>
        <button className={s.panelClose} onClick={() => ref.current?.close()} aria-label="Close">
          <X size={18} strokeWidth={2.75} />
        </button>
      </header>
      <label className={s.tplSearch}>
        <Search size={16} strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Search templates</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: water, save, read…" />
      </label>
      {!q && (
        // Phones: the areas as one dropdown (a long row of chips would need sideways scrolling).
        <div className={s.tplAreaPick}>
          <Select
            label="Area"
            value={area ?? ""}
            options={[{ value: "", label: "All areas" }, ...areas.map((a) => ({ value: a, label: a }))]}
            onChange={(v) => setArea(v || null)}
          />
        </div>
      )}
      {!q && (
        <div className={s.tplAreas} role="group" aria-label="Areas">
          <button aria-pressed={!area} onClick={() => setArea(null)}>
            All
          </button>
          {areas.map((a) => (
            <button key={a} aria-pressed={area === a} onClick={() => setArea(a)}>
              {a}
            </button>
          ))}
        </div>
      )}
      <ul className={`${s.starters} ${s.tplGrid}`}>
        <li>
          <button type="button" className={s.tplOwn} onClick={onOwn}>
            <b>
              <Plus size={16} strokeWidth={3} aria-hidden /> {own}
            </b>
            <small>Start from a blank page</small>
          </button>
        </li>
        {shown.map((t) => (
          <li key={t.title}>
            <button type="button" onClick={() => onPick(t)} style={{ "--fill": fill(areas, t.area) } as React.CSSProperties}>
              <b>{t.title}</b>
              <small>{note(t)}</small>
              {(q || !area) && <small className={s.tplArea}>{t.area}</small>}
            </button>
          </li>
        ))}
      </ul>
      {!shown.length && <p className={s.goalHint}>Nothing matches “{q}”. Make your own instead.</p>}
    </dialog>
  );
}

export function GoalTemplates({
  taken,
  onPick,
  onOwn,
  onClose,
}: {
  taken: string[];
  onPick: (t: GoalTemplate) => void;
  onOwn: () => void;
  onClose: () => void;
}) {
  return (
    <Picker
      label="New goal"
      areas={GOAL_AREAS}
      items={GOAL_TEMPLATES}
      taken={taken}
      note={goalNote}
      own="My own goal"
      onPick={onPick}
      onOwn={onOwn}
      onClose={onClose}
    />
  );
}

// Rewards are priced in tasks like yours: `perTask` is what one of your tasks usually earns.
export function RewardTemplates({
  taken,
  perTask,
  onPick,
  onOwn,
  onClose,
}: {
  taken: string[];
  perTask: number;
  onPick: (t: RewardTemplate) => void;
  onOwn: () => void;
  onClose: () => void;
}) {
  return (
    <Picker
      label="New reward"
      areas={REWARD_AREAS}
      items={REWARD_TEMPLATES}
      taken={taken}
      note={(t) => `About ${t.size} task${t.size === 1 ? "" : "s"} · ${t.size * perTask} XP`}
      own="My own reward"
      onPick={onPick}
      onOwn={onOwn}
      onClose={onClose}
    />
  );
}
