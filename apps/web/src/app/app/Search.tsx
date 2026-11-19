"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search as SearchIcon } from "lucide-react";
import type { List } from "@todone/sdk/tasks";
import { find, type Hit } from "@/lib/search";
import { listColor } from "./listIcon";
import s from "./app.module.css";

const MAX = 40;

export function Search({ lists, onOpen, tile }: { lists: List[]; onOpen: (list: string, task: string) => void; tile: string }) {
  const [open, setOpen] = useState(false);
  // Ctrl/Cmd+K, or "/" when not typing, opens it from anywhere in the app.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as Element).closest?.("input, textarea, select, [contenteditable]");
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey)) {
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
        aria-label="Search tasks"
        data-tip="Search (Ctrl K)"
        aria-haspopup="dialog"
      >
        <SearchIcon size={18} strokeWidth={2.5} aria-hidden />
      </button>
      {open && (
        <Finder
          lists={lists}
          onClose={() => setOpen(false)}
          onOpen={(l, t) => {
            setOpen(false);
            onOpen(l, t);
          }}
        />
      )}
    </>
  );
}

function Finder({ lists, onClose, onOpen }: { lists: List[]; onClose: () => void; onOpen: (list: string, task: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const hits = useMemo(() => find(lists, q), [lists, q]);
  const shown = hits.slice(0, MAX);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  const pick = (h: Hit | undefined) => h && onOpen(h.list.id, h.task.id);
  return (
    <dialog
      ref={ref}
      className={`${s.disclosure} ${s.finder}`}
      onClose={onClose}
      onMouseDown={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-label="Search tasks"
    >
      <label className={s.finderBox}>
        <SearchIcon size={20} strokeWidth={2.5} aria-hidden />
        <input
          autoFocus
          type="search"
          enterKeyHint="go"
          placeholder="Search tasks, steps and notes"
          aria-label="Search tasks, steps and notes"
          aria-controls="finder-results"
          aria-activedescendant={shown[at] ? `hit-${at}` : undefined}
          value={q}
          onChange={(e) => (setQ(e.target.value), setAt(0))}
          onKeyDown={(e) => {
            if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;
            e.preventDefault();
            if (e.key === "Enter") pick(shown[at]);
            else setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), shown.length - 1)));
          }}
        />
      </label>
      {q.trim() && (
        <p className={s.finderCount} role="status">
          {hits.length ? `${hits.length} found${hits.length > MAX ? `, showing ${MAX}` : ""}` : "Nothing found"}
        </p>
      )}
      <ul id="finder-results" className={s.finderList} role="listbox" aria-label="Results">
        {shown.map((h, i) => (
          <li
            key={h.list.id + h.task.id}
            id={`hit-${i}`}
            role="option"
            aria-selected={i === at}
            onPointerEnter={() => setAt(i)}
            onClick={() => pick(h)}
            style={{ "--list": listColor(h.list.id) } as React.CSSProperties}
          >
            <span className={s.finderDone} aria-label={h.task.done ? "Done" : "Open"}>
              {h.task.done && <Check size={14} strokeWidth={3.5} aria-hidden />}
            </span>
            <span className={s.finderText}>
              <b data-done={h.task.done || undefined}>{h.task.title}</b>
              {h.snippet && <small>{h.snippet}</small>}
            </span>
            <span className={s.finderWhere}>
              {h.step ? "Step · " : ""}
              {h.list.name}
            </span>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
