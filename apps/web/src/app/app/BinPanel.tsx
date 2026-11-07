"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { type Binned, emptyBin, fresh, restore, useLists } from "@/lib/store";
import s from "./app.module.css";

// The Bin (sidebar → Bin): tasks deleted in the last 7 days, newest first, each restorable to the list it came from
// (or `fallback` if that list is gone).
export function BinView({ fallback }: { fallback: string | null }) {
  const { lists } = useLists();
  const [now] = useState(() => Date.now());
  const [armed, setArmed] = useState(false);
  const items = fresh(lists?.find((l) => l.kind === "bin")?.tasks ?? []) as Binned[];
  const left = (t: Binned) => {
    const d = Math.min(7, Math.ceil((t.binnedAt + 7 * 86_400_000 - now) / 86_400_000));
    return d <= 1 ? "goes today" : `${d} days left`;
  };
  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Bin</h1>
        <p className={s.binLead}>Tasks you delete wait here for 7 days, then they&apos;re gone for good.</p>
      </div>
      {items.length ? (
        <ul className={s.binList} aria-label="Recently deleted">
          {items.map((t) => (
            <li key={t.id}>
              <span>
                <b>{t.title}</b>
                <small>
                  from {t.fromName} · deleted{" "}
                  {new Date(t.binnedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {left(t)}
                  {t.sub.length ? ` · ${t.sub.length} step${t.sub.length === 1 ? "" : "s"}` : ""}
                </small>
              </span>
              <button
                className={s.ghost}
                disabled={!fallback && !lists?.some((l) => l.id === t.from)}
                onClick={() => fallback && restore(t.id, fallback)}
                title={`Put it back in ${t.fromName}`}
              >
                <RotateCcw size={14} strokeWidth={2.5} aria-hidden /> Restore
              </button>
            </li>
          ))}
          <li className={s.binClear}>
            {/* Asks twice: nothing comes back after this. */}
            <button
              className={`${s.ghost} ${s.danger}`}
              data-armed={armed || undefined}
              onBlur={() => setArmed(false)}
              onClick={() => {
                if (!armed) return setArmed(true);
                emptyBin();
                setArmed(false);
              }}
            >
              <Trash2 size={14} strokeWidth={2.5} aria-hidden />{" "}
              {armed ? `Delete ${items.length} task${items.length === 1 ? "" : "s"} for good? Click again` : "Clear bin"}
            </button>
          </li>
        </ul>
      ) : (
        <div className={s.empty}>
          <Trash2 size={32} strokeWidth={2} aria-hidden />
          <p className="display">The bin is empty.</p>
          <p>Drop a task on a list&apos;s Bin to delete it; it waits here for 7 days in case you change your mind.</p>
        </div>
      )}
    </>
  );
}
