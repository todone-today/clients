"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { type Binned, emptyBin, fresh, restore, useLists } from "@/lib/store";
import s from "./app.module.css";

const FILLS = ["var(--butter)", "var(--pink)", "var(--cyan)", "var(--lime)", "var(--peri)"];

// The Bin (sidebar → Bin), laid out like a list: deleted tasks as notes on the board, each with a Restore button,
// and the same Bin box top right, clicked twice to empty it for good. Tasks stay 7 days.
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
        <button
          className={s.bin}
          data-armed={armed}
          disabled={!items.length}
          onClick={() => {
            if (!armed) return setArmed(true);
            emptyBin();
            setArmed(false);
          }}
          onBlur={() => setArmed(false)}
          aria-label={armed ? "Click again to empty the bin for good" : "Empty the bin"}
          title={armed ? "Click again: nothing comes back after this" : "Empty the bin"}
        >
          <Trash2 size={28} strokeWidth={2.5} />
          <span>{armed ? "Empty for good?" : "Empty bin"}</span>
        </button>
        <h1 className={`display ${s.title}`}>Bin</h1>
        <p className={s.progress}>{items.length ? `${items.length} deleted · kept 7 days` : "Empty"}</p>
      </div>
      {items.length ? (
        <div className={s.listBody} style={{ gridTemplateColumns: "1fr" }}>
          <ul className={s.tasks}>
            {items.map((t, i) => (
              <li key={t.id} className={s.note} style={{ "--fill": FILLS[i % FILLS.length] } as React.CSSProperties}>
                <div className={s.row}>
                  <button
                    className={s.check}
                    disabled={!fallback && !lists?.some((l) => l.id === t.from)}
                    onClick={() => fallback && restore(t.id, fallback)}
                    aria-label={`Restore “${t.title}” to ${t.fromName}`}
                    title={`Restore to ${t.fromName}`}
                  >
                    <RotateCcw size={15} strokeWidth={3} aria-hidden />
                  </button>
                  <span className={s.taskTitle}>{t.title}</span>
                  <span className={s.chips}>
                    <span>{t.fromName}</span>
                    <span>{left(t)}</span>
                    {t.sub.length ? <span>{`${t.sub.length} step${t.sub.length === 1 ? "" : "s"}`}</span> : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className={s.hint}>Click ↺ on a note to put it back in its list.</p>
        </div>
      ) : (
        <div className={s.empty}>
          <p className="display">The bin is empty.</p>
          <p>Drop a task on a list&apos;s Bin to delete it; it waits here for 7 days in case you change your mind.</p>
        </div>
      )}
    </>
  );
}
