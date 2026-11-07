"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { type Binned, fresh, restore, useLists } from "@/lib/store";
import s from "./app.module.css";

// "Recently deleted": tasks dropped on the bin in the last 7 days, newest first, each restorable to its list.
export function BinPanel({ listId }: { listId: string }) {
  const { lists } = useLists();
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const items = fresh(lists?.find((l) => l.kind === "bin")?.tasks ?? []) as Binned[];
  if (!items.length) return null;
  const left = (t: Binned) => {
    const d = Math.min(7, Math.ceil((t.binnedAt + 7 * 86_400_000 - now) / 86_400_000));
    return d <= 1 ? "goes today" : `${d} days left`;
  };
  return (
    <div className={s.binPanel}>
      <button className={s.binLink} aria-expanded={open} onClick={() => setOpen(!open)}>
        Recently deleted · {items.length}
      </button>
      {open && (
        <ul className={s.binList} aria-label="Recently deleted">
          {items.map((t) => (
            <li key={t.id}>
              <span>
                <b>{t.title}</b>
                <small>
                  from {t.fromName} · {left(t)}
                </small>
              </span>
              <button className={s.ghost} onClick={() => restore(t.id, listId)} title={`Put it back in ${t.fromName}`}>
                <RotateCcw size={14} strokeWidth={2.5} aria-hidden /> Restore
              </button>
            </li>
          ))}
          <li className={s.binNote}>Deleted tasks stay here for 7 days.</li>
        </ul>
      )}
    </div>
  );
}
