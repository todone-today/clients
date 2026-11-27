"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import type { List } from "@todone/sdk/tasks";
import { useLists } from "@/lib/store";
import { ListIcon } from "./listIcon";
import s from "./app.module.css";

// Opens Account at Privacy, from anywhere in the app (a list's lock, Connect an AI, Integrations).
export const PRIVACY_EVENT = "todone:privacy";
export const openPrivacy = () => dispatchEvent(new Event(PRIVACY_EVENT));

const KIND: Record<string, string> = { goals: "Goals and rewards", ideas: "Brainstorm", bin: "Bin" };
const name = (l: List) => (l.kind ? KIND[l.kind] : l.name);

// Which of your things are readable. Everything is end-to-end encrypted until you switch it off here; readable
// ones can be used by your connected AI apps, calendar link and integrations, and our server can read them too.
// Turning one readable asks twice; encrypting again is one tap.
export function Privacy() {
  const { lists, update } = useLists();
  const [armed, setArmed] = useState<string | null>(null);
  const all = [
    ...(lists ?? []).filter((l) => l.kind === "goals" || l.kind === "ideas"),
    ...(lists ?? []).filter((l) => !l.kind),
    ...(lists ?? []).filter((l) => l.kind === "bin"),
  ];
  const open = all.filter((l) => l.plain).length;
  const set = (ls: List[], plain: boolean) => ls.forEach((l) => !!l.plain !== plain && update(l.id, (x) => ({ ...x, plain })));
  const flip = (key: string, ls: List[], on: boolean) => {
    if (!on) return set(ls, false);
    if (armed !== key) return setArmed(key);
    set(ls, true);
    setArmed(null);
  };
  const row = (key: string, text: string, ls: List[], icon?: React.ReactNode, note?: string) => {
    const readable = ls.length > 0 && ls.every((l) => l.plain);
    return (
      <li key={key}>
        <span className={s.e2eName}>
          {icon} {icon ? text : <b>{text}</b>}
          {note && <small>{note}</small>}
        </span>
        {armed === key && <span className={s.e2eWarn}>Our server could read {key === "all" ? "them" : "it"}. Tap again</span>}
        <button
          role="switch"
          aria-checked={!readable}
          aria-label={`Encrypt ${text}`}
          className={s.e2eSwitch}
          data-armed={armed === key || undefined}
          onBlur={() => setArmed((x) => (x === key ? null : x))}
          onClick={() => flip(key, ls, !readable)}
        >
          <i aria-hidden />
          <span>
            {readable ? <LockOpen size={13} strokeWidth={2.75} aria-hidden /> : <Lock size={13} strokeWidth={2.75} aria-hidden />}
            {readable ? "Readable" : "Encrypted"}
          </span>
        </button>
      </li>
    );
  };
  return (
    <div className={s.e2e}>
      <p>
        Everything is end-to-end encrypted: only you can read it. Not us, not your AI apps, not your calendar. Make
        something readable to let your connected AI apps, calendar link and integrations use it. Our server can read it
        then too. Switch it back any time.
      </p>
      <p className={s.e2eCount}>{open ? `${open} of ${all.length} readable` : "Everything is encrypted."}</p>
      <ul className={s.e2eLists}>
        {all.length > 1 && row("all", "Everything", all)}
        {all.map((l) =>
          row(
            l.id,
            name(l),
            [l],
            l.kind ? undefined : <ListIcon id={l.id} name={l.name} icon={l.icon} />,
            l.kind === "bin" ? "Deleted tasks, kept 7 days. An AI app needs it readable to delete for you." : undefined,
          ),
        )}
      </ul>
    </div>
  );
}
