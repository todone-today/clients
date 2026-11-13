"use client";

import { useState } from "react";
import { Gift, Plus, Target, Trash2, X } from "lucide-react";
import { draggable, useDrop } from "@/lib/drag";
import { BIN, GOALS, REWARDS, type Draft, drop, newLists, newName, newPlace, rename, titleOf } from "@/lib/askBoard";
import type { List } from "@todone/sdk/tasks";
import { ListIcon, NOTES, listColor, noteColor } from "./listIcon";
import s from "./app.module.css";

const TRAY = "tray";

// What a suggestion says besides its title, the way a list note shows its chips.
function meta(d: Draft) {
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
  return [t.due, t.at, t.est ? `${t.est}m` : "", t.sub.length ? `${t.sub.length} steps` : ""].filter(Boolean) as string[];
}

// Ask todone's results as stickers: a tray of what's not placed yet, and a tile for each place they can go (your
// lists, new lists, Goals, Rewards, the Bin). Drag a sticker onto a tile, or tap it and then tap the tile.
export function AskBoard({
  drafts,
  onChange,
  lists,
  made,
  onMake,
}: {
  drafts: Draft[];
  onChange: (ds: Draft[]) => void;
  lists: List[];
  made: string[];
  onMake: (name: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [naming, setNaming] = useState("");
  const put = (id: string, place: string) => {
    onChange(drop(drafts, id, place === TRAY ? null : place));
    setPicked(null);
  };
  const dropOn = useDrop("ask", {
    accept: (p) => p.kind === "draft",
    drop: (p, arg) => p.kind === "draft" && put(p.id, arg),
  });
  // A tile is a drop target, and with a sticker picked, a tap places it there.
  const target = (place: string) => ({
    ...dropOn(place),
    onClick: () => picked && put(picked, place),
    "data-armed": picked ? "" : undefined,
  });
  const fill = (d: Draft) =>
    d.kind === "goal"
      ? "var(--lime)"
      : d.kind === "reward"
        ? "var(--pink)"
        : d.place && !newName(d.place)
          ? listColor(d.place)
          : NOTES[noteColor(newName(d.place) ?? newName(d.ai) ?? d.id)];

  const sticker = (d: Draft, small = false) => (
    <div
      key={d.id}
      data-id={d.id}
      data-card
      className={small ? s.askChip : s.askNote}
      data-kind={d.kind}
      data-picked={picked === d.id || undefined}
      style={{ "--fill": fill(d) } as React.CSSProperties}
      {...draggable({ kind: "draft", id: d.id }, titleOf(d))}
      onClick={(e) => {
        e.stopPropagation(); // not a tap on the tile it sits in
        setPicked(picked === d.id ? null : d.id);
      }}
      onDoubleClick={() => setEditing(d.id)}
      role="button"
      tabIndex={0}
      aria-pressed={picked === d.id}
      aria-label={`${titleOf(d)}${picked === d.id ? ", picked: now choose where it goes" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setPicked(picked === d.id ? null : d.id);
        }
      }}
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
      {!small && meta(d).length > 0 && (
        <span className={s.askMeta}>
          {meta(d).map((m) => (
            <i key={m}>{m}</i>
          ))}
        </span>
      )}
      <button
        className={s.askX}
        aria-label={`Remove ${titleOf(d)}`}
        onClick={(e) => {
          e.stopPropagation();
          onChange(drop(drafts, d.id, BIN));
        }}
      >
        <X size={12} strokeWidth={3} />
      </button>
    </div>
  );

  const tile = (place: string, head: React.ReactNode, style?: React.CSSProperties, dashed = false) => {
    const here = drafts.filter((d) => d.place === place);
    return (
      <li key={place} className={s.askTile} data-new={dashed || undefined} style={style} {...target(place)}>
        <span className={s.askTileHead}>
          {head}
          <span className={s.askCount}>{here.length || ""}</span>
        </span>
        {here.map((d) => sticker(d, true))}
      </li>
    );
  };
  const tray = drafts.filter((d) => d.place === null);
  const fresh = newLists(drafts, made, lists);

  return (
    <div className={s.askBoard}>
      <section className={s.askTray} aria-label="Suggested" {...target(TRAY)}>
        <h3>
          Suggested <span className={s.askCount}>{tray.length || ""}</span>
        </h3>
        {tray.length ? (
          <div className={s.askNotes}>{tray.map((d) => sticker(d))}</div>
        ) : (
          <p>{drafts.length ? "All placed. Drag any back here to rethink it." : "Nothing yet."}</p>
        )}
      </section>

      <section aria-label="Put them in">
        <h3>Put them in</h3>
        <ul className={s.askTiles}>
          {lists.map((l) =>
            tile(
              l.id,
              <>
                <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
              </>,
              { "--fill": listColor(l.id) } as React.CSSProperties,
            ),
          )}
          {fresh.map((n) =>
            tile(newPlace(n), <>{n} · new</>, { "--fill": NOTES[noteColor(n)] } as React.CSSProperties, true),
          )}
          <li className={s.askTile} data-new>
            <form
              className={s.askMake}
              onSubmit={(e) => {
                e.preventDefault();
                const n = naming.trim().slice(0, 60);
                if (!n) return;
                onMake(n);
                if (picked) put(picked, newPlace(n));
                setNaming("");
              }}
            >
              <input value={naming} onChange={(e) => setNaming(e.target.value)} placeholder="New list…" aria-label="New list name" maxLength={60} />
              <button aria-label="Make list" disabled={!naming.trim()}>
                <Plus size={14} strokeWidth={3} />
              </button>
            </form>
          </li>
          {tile(
            GOALS,
            <>
              <Target size={14} strokeWidth={2.5} aria-hidden /> Goals
            </>,
            { "--fill": "var(--lime)" } as React.CSSProperties,
          )}
          {tile(
            REWARDS,
            <>
              <Gift size={14} strokeWidth={2.5} aria-hidden /> Rewards
            </>,
            { "--fill": "var(--pink)" } as React.CSSProperties,
          )}
          <li className={s.askBin} {...target(BIN)} aria-label="Bin: leave it out">
            <Trash2 size={16} strokeWidth={2.5} aria-hidden /> Leave out
          </li>
        </ul>
      </section>
    </div>
  );
}
