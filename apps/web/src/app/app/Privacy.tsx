"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, LockOpen, X } from "lucide-react";
import type { List } from "@todone/sdk/tasks";
import { useLists } from "@/lib/store";
import { ListIcon } from "./listIcon";
import s from "./app.module.css";

// Opens the Privacy dialog from anywhere (Account, a list's lock, Connect an AI, Integrations, …/app#privacy).
export const PRIVACY_EVENT = "todone:privacy";
export const openPrivacy = () => dispatchEvent(new Event(PRIVACY_EVENT));

const KIND: Record<string, string> = { goals: "Goals and rewards", ideas: "Brainstorm", bin: "Bin" };
const NOTE: Record<string, string> = { bin: "Deleted tasks, kept 7 days. An AI app needs this to delete for you." };
// Everything that can be made readable, in the order people think of it.
const things = (lists: List[] | null) => [
  ...(lists ?? []).filter((l) => l.kind === "goals" || l.kind === "ideas"),
  ...(lists ?? []).filter((l) => !l.kind),
  ...(lists ?? []).filter((l) => l.kind === "bin"),
];

// Account's Privacy section: where things stand, and the button to change it.
export function PrivacySummary() {
  const all = things(useLists().lists);
  const open = all.filter((l) => l.plain).length;
  return (
    <>
      <p>
        {open
          ? `${open} of ${all.length} readable by your AI apps and integrations. The rest only you can read.`
          : "Everything is end-to-end encrypted: only you can read it."}
      </p>
      <button className={s.ghost} onClick={openPrivacy}>
        <Lock size={16} strokeWidth={2.5} aria-hidden /> Choose what&apos;s readable
      </button>
    </>
  );
}

// Tap what your AI apps, calendar link and integrations may read, then Save. Nothing changes until Save, so one
// tap per row is enough; the dialog says once, plainly, what readable means.
export function PrivacyDialog() {
  const { lists, update } = useLists();
  const ref = useRef<HTMLDialogElement>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const all = things(lists);
  const now = new Set(all.filter((l) => l.plain).map((l) => l.id));
  const changed = all.some((l) => pick.has(l.id) !== now.has(l.id));
  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  useEffect(() => {
    const open = () => {
      setPick(new Set(things(listsRef.current).filter((l) => l.plain).map((l) => l.id)));
      document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((d) => d !== ref.current && d.close());
      if (!ref.current?.open) ref.current?.showModal();
    };
    addEventListener(PRIVACY_EVENT, open);
    if (location.hash === "#privacy") {
      history.replaceState(null, "", location.pathname + location.search);
      setTimeout(open, 600); // once the lists are in
    }
    return () => removeEventListener(PRIVACY_EVENT, open);
  }, []);

  const flip = (ids: string[], on: boolean) =>
    setPick((p) => {
      const n = new Set(p);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });
  const everything = all.length > 0 && all.every((l) => pick.has(l.id));
  const row = (key: string, name: React.ReactNode, on: boolean, toggle: () => void, note?: string, strong = false) => (
    <li key={key}>
      <button type="button" role="switch" aria-checked={on} className={s.privRow} data-strong={strong || undefined} onClick={toggle}>
        <span className={s.privName}>
          {name}
          {note && <small>{note}</small>}
        </span>
        <span className={s.privState}>
          {on ? <LockOpen size={15} strokeWidth={2.75} aria-hidden /> : <Lock size={15} strokeWidth={2.75} aria-hidden />}
          {on ? "Readable" : "Encrypted"}
        </span>
      </button>
    </li>
  );

  return (
    <dialog ref={ref} className={s.aiDialog} aria-labelledby="privacy-title">
      <div className={s.aiHead}>
        <h2 id="privacy-title" className="display">
          Privacy
        </h2>
        <button className={s.ghost} onClick={() => ref.current?.close()} aria-label="Close">
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
      <p className={s.privIntro}>
        <b>Encrypted</b> things only you can read. Make something <b>readable</b> so your AI apps, calendar link and
        integrations can use it. Our server can read it then too.
      </p>
      <ul className={s.privList}>
        {all.length > 1 && row("all", "Everything", everything, () => flip(all.map((l) => l.id), !everything), undefined, true)}
        {all.map((l) =>
          row(
            l.id,
            l.kind ? (
              KIND[l.kind]
            ) : (
              <>
                <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
              </>
            ),
            pick.has(l.id),
            () => flip([l.id], !pick.has(l.id)),
            l.kind ? NOTE[l.kind] : undefined,
          ),
        )}
      </ul>
      <div className={s.privFoot}>
        <button
          className="btn"
          style={{ "--fill": "var(--lime)" } as React.CSSProperties}
          disabled={!changed}
          onClick={() => {
            all.forEach((l) => pick.has(l.id) !== now.has(l.id) && update(l.id, (x) => ({ ...x, plain: pick.has(l.id) })));
            ref.current?.close();
          }}
        >
          Save
        </button>
        <button className={s.ghost} onClick={() => ref.current?.close()}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
