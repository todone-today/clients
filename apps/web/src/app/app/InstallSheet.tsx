"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
import { snooze, snoozed, usePwaInstall } from "@/lib/pwa";
import { useReminders } from "@/lib/remind";
import s from "./app.module.css";

// Phones, opened from the home screen: a sheet from the bottom that turns on reminders, once they haven't been asked
// about. (Installing is InstallGate's.) "Not now" keeps it away for a week. Never on a computer, never on the first
// visit (they're meeting the app). Preview it anywhere with ?pwa=ios or ?pwa=android.
const FIRST = "todone:first-seen";

export function InstallSheet() {
  const pwa = usePwaInstall();
  const reminders = useReminders();
  const box = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // Whether to show at all, decided once things are known: a phone, not snoozed, from a later visit on, and
  // something left to do (install, or reminders not asked about yet).
  const notifyOnly = !!pwa.installed && reminders.state === "off" && typeof Notification !== "undefined" && Notification.permission === "default";
  const due = pwa.ready && pwa.phone && notifyOnly && reminders.state !== "loading";
  useEffect(() => {
    if (!due) return;
    let later = !!pwa.preview;
    try {
      const first = Number(localStorage.getItem(FIRST) ?? 0);
      if (!first) localStorage.setItem(FIRST, String(Date.now()));
      else if (Date.now() - first > 3_600_000) later = true;
    } catch {}
    if (!later || (snoozed() && !pwa.preview)) return;
    const t = setTimeout(() => setOpen(true), 1500); // a moment after the page settles, not over it
    return () => clearTimeout(t);
  }, [due, pwa.preview]);
  useEffect(() => {
    if (open && !box.current?.open) box.current?.showModal();
  }, [open]);
  const close = (later = true) => {
    if (later) snooze();
    box.current?.close();
    setOpen(false);
  };
  if (!open || !pwa.where) return null;
  return (
    <dialog
      ref={box}
      className={s.sheet}
      aria-labelledby="sheet-h"
      onClose={() => setOpen(false)}
      onCancel={() => snooze()}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className={s.sheetBody}>
        <header>
          <h2 id="sheet-h" className="display">
            Turn on reminders
          </h2>
          <button className={s.panelClose} onClick={() => close()} aria-label="Not now">
            <X size={20} strokeWidth={2.75} />
          </button>
        </header>

        {/* Reminders: a nudge before a task's time, and your day each morning. */}
        <section className={s.sheetNotify} aria-label="Reminders">
          {reminders.state === "unsupported" ? null : reminders.state === "on" ? (
            <p data-on>
              <Check size={16} strokeWidth={3} aria-hidden /> Reminders are on.
            </p>
          ) : reminders.state === "blocked" ? (
            <p>
              <BellOff size={16} strokeWidth={2.5} aria-hidden /> Reminders are blocked. Turn them back on in{" "}
              your phone&apos;s settings for todone.
            </p>
          ) : (
            <>
              <p>
                <Bell size={16} strokeWidth={2.5} aria-hidden /> A nudge before a task is due, and your day each morning.
              </p>
              <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={reminders.turnOn}>
                Turn on reminders
              </button>
            </>
          )}
        </section>

        <button className={s.link} onClick={() => close()}>
          Not now
        </button>
      </div>
    </dialog>
  );
}
