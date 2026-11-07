"use client";

import { useEffect, useRef, useState } from "react";
import { Bell as BellIcon, BellOff, MessageCircle } from "lucide-react";
import { todayISO } from "@todone/sdk/tasks";
import { useReminders } from "@/lib/remind";
import { useLists } from "@/lib/store";
import { useUnreadAll } from "./unread";
import s from "./app.module.css";

// The bell in the top bar: what's new (comments on shared tasks), what's due today, and this device's reminders.
// Everything here is worked out in the browser from the decrypted lists; nothing about tasks goes to the server.
export function NotificationBell({
  onOpen,
}: {
  onOpen: (listId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { lists } = useLists();
  const unread = useUnreadAll();
  const reminders = useReminders();
  const today = open ? todayISO() : ""; // only needed once open; never read while prerendering
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) =>
      !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", esc);
    };
  }, [open]);

  const all = (lists ?? []).filter((l) => !l.kind);
  const items = all.flatMap((l) =>
    l.tasks.flatMap((t) => [t, ...t.sub]).map((t) => ({ t, l })),
  );
  const comments = unread
    .map(([share, n]) => ({ n, it: items.find(({ t }) => t.share === share) }))
    .filter((c): c is { n: number; it: (typeof items)[number] } => !!c.it);
  const dueToday = items
    .filter(({ t }) => !t.done && t.due === today)
    .sort((a, b) => (a.t.at ?? "99").localeCompare(b.t.at ?? "99"));
  const late = items.filter(
    ({ t }) => !t.done && t.due && t.due < today,
  ).length;
  const count = comments.reduce((n, c) => n + c.n, 0);
  const go = (listId: string) => {
    onOpen(listId);
    setOpen(false);
  };

  return (
    <div className={s.bellBox} ref={box}>
      <button
        className={s.tile}
        style={{ "--fill": "var(--pink)" } as React.CSSProperties}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={count ? `Notifications, ${count} new` : "Notifications"}
        data-tip={open ? undefined : "Notifications"}
      >
        {reminders.state === "on" || reminders.state === "loading" ? (
          <BellIcon size={18} strokeWidth={2.5} aria-hidden />
        ) : (
          <BellOff size={18} strokeWidth={2.5} aria-hidden />
        )}
        {count > 0 && (
          <b className={`${s.unread} ${s.bellBadge}`}>
            {count > 9 ? "9+" : count}
          </b>
        )}
      </button>

      {open && (
        <div className={s.bellPanel} role="dialog" aria-label="Notifications">
          <h2>Notifications</h2>

          <section>
            <h3>New comments</h3>
            {comments.length ? (
              <ul>
                {comments.map(({ n, it }) => (
                  <li key={it.t.id}>
                    <button onClick={() => go(it.l.id)}>
                      <MessageCircle size={14} strokeWidth={2.5} aria-hidden />
                      <span>{it.t.title}</span>
                      <b className={s.unread}>{n > 9 ? "9+" : n}</b>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.bellEmpty}>All caught up.</p>
            )}
          </section>

          <section>
            <h3>Today{late > 0 && <small> · {late} late</small>}</h3>
            {dueToday.length ? (
              <ul>
                {dueToday.slice(0, 6).map(({ t, l }) => (
                  <li key={t.id}>
                    <button onClick={() => go(l.id)}>
                      <time>{t.at ?? "Any time"}</time>
                      <span>{t.title}</span>
                      <small>{l.name}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.bellEmpty}>Nothing due today.</p>
            )}
          </section>

          <section className={s.bellRemind}>
            <h3>Reminders on this device</h3>
            {reminders.state === "unsupported" ? (
              <p>
                This browser can&apos;t show notifications. On an iPhone or
                iPad, add todone to your Home Screen (Share → Add to Home
                Screen) and open it from there.
              </p>
            ) : reminders.state === "blocked" ? (
              <p>
                Notifications are blocked for todone. Allow them from the lock
                icon next to the address, then come back.
              </p>
            ) : (
              <>
                <button
                  role="switch"
                  aria-checked={reminders.state === "on"}
                  className={s.e2eSwitch}
                  onClick={() =>
                    reminders.state === "on"
                      ? reminders.turnOff()
                      : reminders.turnOn()
                  }
                >
                  <i aria-hidden />
                  <span>{reminders.state === "on" ? "On" : "Off"}</span>
                </button>
                <p>
                  A nudge 15 minutes before a task&apos;s time, and at 8 a.m.
                  what&apos;s due. Made on this device from your encrypted
                  lists, so it works while todone is open in a tab.
                </p>
                {reminders.state === "on" && (
                  <button className={s.link} onClick={reminders.test}>
                    Send a test
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
