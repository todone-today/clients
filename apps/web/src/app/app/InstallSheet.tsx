"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Copy, EllipsisVertical, Plus, Share, SquarePlus, X } from "lucide-react";
import { snooze, snoozed, usePwaInstall } from "@/lib/pwa";
import { useReminders } from "@/lib/remind";
import s from "./app.module.css";

// Phones: a sheet from the bottom that puts todone on the home screen and turns on reminders, the way this phone
// does it. In the browser it shows how to install (Android: one tap where the browser allows, else its menu;
// iPhone: Safari's Share, Add to Home Screen, Add), with reminders. Opened from the home screen with reminders not
// yet asked about, it's just the reminders. "Not now" keeps it away for a week. Never on a computer, never on the
// first visit (they're meeting the app). Preview it anywhere with ?pwa=ios or ?pwa=android.
const FIRST = "todone:first-seen";

export function InstallSheet() {
  const pwa = usePwaInstall();
  const reminders = useReminders();
  const box = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Whether to show at all, decided once things are known: a phone, not snoozed, from a later visit on, and
  // something left to do (install, or reminders not asked about yet).
  const notifyOnly = !!pwa.installed && reminders.state === "off" && typeof Notification !== "undefined" && Notification.permission === "default";
  const due = pwa.ready && pwa.phone && (!pwa.installed || notifyOnly) && reminders.state !== "loading";
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
  // Installed while the sheet was up (Android's prompt): the install part is done.
  useEffect(() => {
    if (pwa.installed && open && !notifyOnly) Promise.resolve().then(() => close(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwa.installed]);

  if (!open || !pwa.where) return null;
  const { platform, inApp, iosOtherBrowser } = pwa.where;
  const ios = platform === "ios";
  const copy = async () => {
    await navigator.clipboard.writeText(location.origin + "/app").catch(() => {});
    setCopied(true);
  };

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
            {notifyOnly ? "Turn on reminders" : "Put todone on your phone"}
          </h2>
          <button className={s.panelClose} onClick={() => close()} aria-label="Not now">
            <X size={20} strokeWidth={2.75} />
          </button>
        </header>

        {!notifyOnly &&
          (inApp || iosOtherBrowser ? (
            // An app's built-in browser (or Chrome on iPhone) can't install: open the page in the real browser.
            <>
              <p className={s.sheetLead}>
                Open this page in {ios ? "Safari" : "Chrome"} to install todone. {inApp ? "Tap ⋯ and choose “Open in browser”" : "Copy the link and paste it into Safari"}.
              </p>
              <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={copy}>
                {copied ? <Check size={16} strokeWidth={3} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}{" "}
                {copied ? "Link copied" : "Copy the link"}
              </button>
            </>
          ) : ios ? (
            <>
              <p className={s.sheetLead}>It opens like an app, works offline, and can remind you. Three taps in Safari:</p>
              <ol className={s.sheetSteps}>
                <li>
                  <Share size={20} strokeWidth={2.5} aria-hidden /> <span>Tap <b>Share</b> at the bottom of Safari</span>
                </li>
                <li>
                  <SquarePlus size={20} strokeWidth={2.5} aria-hidden /> <span>Scroll down, tap <b>Add to Home Screen</b></span>
                </li>
                <li>
                  <Plus size={20} strokeWidth={2.5} aria-hidden /> <span>Tap <b>Add</b>, then open todone from your Home Screen</span>
                </li>
              </ol>
            </>
          ) : pwa.canPrompt ? (
            <>
              <p className={s.sheetLead}>It opens like an app, works offline, and can remind you.</p>
              <button
                className="btn"
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                onClick={async () => {
                  await pwa.install();
                }}
              >
                Install todone
              </button>
            </>
          ) : (
            <>
              <p className={s.sheetLead}>It opens like an app, works offline, and can remind you. Two taps:</p>
              <ol className={s.sheetSteps}>
                <li>
                  <EllipsisVertical size={20} strokeWidth={2.5} aria-hidden /> <span>Tap the browser&apos;s menu <b>⋮</b></span>
                </li>
                <li>
                  <SquarePlus size={20} strokeWidth={2.5} aria-hidden /> <span>Tap <b>Install app</b> (or <b>Add to Home screen</b>)</span>
                </li>
              </ol>
            </>
          ))}

        {/* Reminders: a nudge before a task's time, and your day each morning. */}
        <section className={s.sheetNotify} aria-label="Reminders">
          {ios && !pwa.installed ? (
            <p>
              <Bell size={16} strokeWidth={2.5} aria-hidden /> On iPhone, reminders work once todone is on your Home Screen.
              Open it from there and you&apos;ll be asked.
            </p>
          ) : reminders.state === "unsupported" || inApp ? null : reminders.state === "on" ? (
            <p data-on>
              <Check size={16} strokeWidth={3} aria-hidden /> Reminders are on.
            </p>
          ) : reminders.state === "blocked" ? (
            <p>
              <BellOff size={16} strokeWidth={2.5} aria-hidden /> Reminders are blocked. Turn them back on in{" "}
              {pwa.installed ? "your phone's settings for todone" : "the browser's site settings (the icon left of the address)"}.
            </p>
          ) : (
            <>
              <p>
                <Bell size={16} strokeWidth={2.5} aria-hidden /> A nudge before a task is due, and your day each morning.
              </p>
              <button
                className={notifyOnly ? "btn" : s.ghost}
                style={notifyOnly ? ({ "--fill": "var(--lime)" } as React.CSSProperties) : undefined}
                onClick={reminders.turnOn}
              >
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
