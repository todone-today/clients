"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, Gift, Layers, Lightbulb, ListTodo, Search as SearchIcon, Target, Trash2 } from "lucide-react";
import type { List } from "@todone/sdk/tasks";
import { find, type Hit, type Kind } from "@/lib/search";
import { listColor } from "./listIcon";
import s from "./app.module.css";

const MAX = 12; // per kind
// The kinds, in the order they show, each as a coloured sticker of its own.
const KINDS: { kind: Kind; name: string; fill: string; Icon: typeof Check }[] = [
  { kind: "task", name: "Tasks", fill: "var(--butter)", Icon: ListTodo },
  { kind: "list", name: "Lists", fill: "var(--cyan)", Icon: Layers },
  { kind: "idea", name: "Ideas", fill: "var(--pink)", Icon: Lightbulb },
  { kind: "goal", name: "Goals", fill: "var(--lime)", Icon: Target },
  { kind: "reward", name: "Rewards", fill: "var(--peri)", Icon: Gift },
  { kind: "bin", name: "In the Bin", fill: "var(--orange)", Icon: Trash2 },
];

export function Search({ lists, onPick, tile }: { lists: List[]; onPick: (h: Hit) => void; tile: string }) {
  const [open, setOpen] = useState(false);
  // Ctrl/Cmd+F or Ctrl/Cmd+K (in place of the browser's find), or "/" when not typing, opens it anywhere in the app.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as Element).closest?.("input, textarea, select, [contenteditable]");
      if (((e.metaKey || e.ctrlKey) && !e.altKey && ["k", "f"].includes(e.key.toLowerCase())) || (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <button
        className={tile}
        style={{ "--fill": "var(--butter)" } as React.CSSProperties}
        onClick={() => setOpen(true)}
        aria-label="Search everything"
        data-tip="Search (Ctrl F)"
        aria-haspopup="dialog"
      >
        <SearchIcon size={18} strokeWidth={2.5} aria-hidden />
      </button>
      {open && (
        <Finder
          lists={lists}
          onClose={() => setOpen(false)}
          onPick={(h) => {
            setOpen(false);
            onPick(h);
          }}
        />
      )}
    </>
  );
}

// The words searched for, lit up in a name or snippet.
function Lit({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return text;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>));
}

function Finder({ lists, onClose, onPick }: { lists: List[]; onClose: () => void; onPick: (h: Hit) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const hits = useMemo(() => find(lists, q), [lists, q]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  // Grouped by kind, a few of each; the arrow keys walk them top to bottom.
  const groups = KINDS.map((k) => ({ ...k, all: hits.filter((h) => h.kind === k.kind) }))
    .filter((g) => g.all.length)
    .map((g) => ({ ...g, shown: g.all.slice(0, MAX) }));
  const flat = groups.flatMap((g) => g.shown);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  // What sits on a result's right: the list a task is in, a list's size, a goal already reached.
  const where = (h: Hit) =>
    h.kind === "task" ? `${h.step ? "Step · " : ""}${h.list.name}` : h.kind === "list" ? `${h.list.tasks.length} tasks` : h.kind === "goal" && h.done ? "Reached" : "";
  let n = -1;
  return (
    <dialog
      ref={ref}
      className={`${s.disclosure} ${s.finder}`}
      onClose={onClose}
      onMouseDown={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-label="Search everything"
    >
      <label className={s.finderBox}>
        <span className={s.finderLens} aria-hidden>
          <SearchIcon size={20} strokeWidth={2.75} />
        </span>
        <input
          autoFocus
          type="search"
          enterKeyHint="go"
          placeholder="Search tasks, goals, rewards…"
          aria-label="Search tasks, notes, lists, ideas, goals and rewards"
          aria-controls="finder-results"
          aria-activedescendant={flat[at] ? `hit-${at}` : undefined}
          value={q}
          onChange={(e) => (setQ(e.target.value), setAt(0))}
          onKeyDown={(e) => {
            if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;
            e.preventDefault();
            if (e.key === "Enter") return flat[at] && onPick(flat[at]);
            setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), flat.length - 1)));
          }}
        />
        <kbd className={s.finderEsc}>Esc</kbd>
      </label>

      {!words.length ? (
        // Before typing: what it looks through, as the stickers each kind of result wears.
        <div className={s.finderHello}>
          <p>Find anything you&apos;ve written down.</p>
          <ul>
            {KINDS.map(({ kind, name, fill, Icon }) => (
              <li key={kind} style={{ "--fill": fill } as React.CSSProperties}>
                <Icon size={15} strokeWidth={2.5} aria-hidden /> {name}
              </li>
            ))}
          </ul>
        </div>
      ) : !hits.length ? (
        <div className={s.finderNone} role="status">
          <SearchIcon size={28} strokeWidth={2.25} aria-hidden />
          <p>
            Nothing for <b>“{q.trim()}”</b>
          </p>
          <small>Try fewer words, or another way to say it.</small>
        </div>
      ) : (
        <div id="finder-results" className={s.finderList} role="listbox" aria-label="Results">
          <p className={s.finderCount} role="status">
            {hits.length} found
          </p>
          {groups.map((g) => (
            <section key={g.kind} aria-label={g.name}>
              <h3 className={s.finderHead} style={{ "--fill": g.fill } as React.CSSProperties}>
                <g.Icon size={14} strokeWidth={2.75} aria-hidden /> {g.name}
                <span>{g.all.length > g.shown.length ? `${g.shown.length} of ${g.all.length}` : g.all.length}</span>
              </h3>
              <ul>
                {g.shown.map((h) => {
                  const i = ++n;
                  return (
                    <li
                      key={h.kind + h.list.id + h.id}
                      id={`hit-${i}`}
                      role="option"
                      aria-selected={i === at}
                      onPointerEnter={() => setAt(i)}
                      onClick={() => onPick(h)}
                      style={{ "--list": h.list.kind ? g.fill : listColor(h.list.id) } as React.CSSProperties}
                    >
                      {h.kind === "task" || h.kind === "bin" || h.kind === "idea" ? (
                        <span className={s.finderDone} aria-label={h.done ? "Done" : "Open"}>
                          {h.done && <Check size={13} strokeWidth={3.5} aria-hidden />}
                        </span>
                      ) : (
                        <span className={s.finderIcon} aria-hidden>
                          <g.Icon size={15} strokeWidth={2.5} />
                        </span>
                      )}
                      <span className={s.finderText}>
                        <b data-done={(h.done && h.kind !== "goal") || undefined}>
                          <Lit text={h.title} words={words} />
                        </b>
                        {h.snippet && (
                          <small>
                            <Lit text={h.snippet} words={words} />
                          </small>
                        )}
                      </span>
                      {where(h) && <span className={s.finderWhere}>{where(h)}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className={s.finderKeys} aria-hidden>
        <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open
      </p>
    </dialog>
  );
}
