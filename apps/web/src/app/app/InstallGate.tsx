"use client";

import { useEffect, useState } from "react";
import { Check, Copy, EllipsisVertical, Plus, Share, SquarePlus } from "lucide-react";
import { usePwaInstall } from "@/lib/pwa";
import s from "./app.module.css";

// Phones, in the browser: todone is an app on the home screen, so the lists wait behind a full screen that installs
// it, with this phone's steps acted out on a little phone (Safari's Share, Add to Home Screen, Add; Android's one tap
// or its ⋮ menu). "Use it in the browser" lets them in for this visit only: the next one asks again. Never on a
// computer, never once installed. Preview anywhere with ?pwa=ios or ?pwa=android. A hook, so the app shows the gate
// instead of itself (nothing else, no intro or dialogs, opens over it).
const SKIP = "todone:browser-ok"; // this tab only (sessionStorage)

type Step = { icon: React.ReactNode; text: React.ReactNode };

export function useInstallGate(): React.ReactNode {
  const pwa = usePwaInstall();
  const [skipped, setSkipped] = useState(true); // until read: no flash of the gate on a computer
  const [at, setAt] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let ok = false;
    try {
      ok = sessionStorage.getItem(SKIP) === "1";
    } catch {}
    Promise.resolve().then(() => setSkipped(ok));
  }, []);
  const show = !!pwa.ready && !!pwa.phone && !pwa.installed && !skipped;

  const where = pwa.where;
  const ios = where?.platform === "ios";
  const elsewhere = !!where && (where.inApp || where.iosOtherBrowser); // can't install here: open the real browser
  const steps: Step[] = elsewhere
    ? []
    : ios
      ? [
          { icon: <Share size={20} strokeWidth={2.5} aria-hidden />, text: <>Tap <b>Share</b> at the bottom of Safari</> },
          { icon: <SquarePlus size={20} strokeWidth={2.5} aria-hidden />, text: <>Scroll down, tap <b>Add to Home Screen</b></> },
          { icon: <Plus size={20} strokeWidth={2.5} aria-hidden />, text: <>Tap <b>Add</b>, then open todone from your Home Screen</> },
        ]
      : pwa.canPrompt
        ? []
        : [
            { icon: <EllipsisVertical size={20} strokeWidth={2.5} aria-hidden />, text: <>Tap the browser&apos;s menu <b>⋮</b></> },
            { icon: <SquarePlus size={20} strokeWidth={2.5} aria-hidden />, text: <>Tap <b>Install app</b> (or <b>Add to Home screen</b>)</> },
            { icon: <Plus size={20} strokeWidth={2.5} aria-hidden />, text: <>Tap <b>Install</b>, then open todone from your home screen</> },
          ];

  // The steps play in turn on the little phone, over and over (held still for reduced motion: all shown, none moving).
  useEffect(() => {
    if (!show || steps.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAt((n) => (n + 1) % steps.length), 2400);
    return () => clearInterval(t);
  }, [show, steps.length]);

  if (!show || !where) return null;
  const skip = () => {
    try {
      sessionStorage.setItem(SKIP, "1");
    } catch {}
    setSkipped(true);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(location.origin + "/").catch(() => {});
    setCopied(true);
  };

  return (
    <div className={s.gate} role="dialog" aria-modal="true" aria-labelledby="gate-h">
      <div className={s.gateBody}>
        <h1 id="gate-h" className="display">
          Get the todone app
        </h1>
        <p className={s.gateLead}>
          Free, and no app store. It opens from your home screen like any app, works offline, and can remind you.
        </p>

        {elsewhere ? (
          <>
            <p className={s.gateLead}>
              <b>First, open this page in {ios ? "Safari" : "Chrome"}.</b>{" "}
              {where.inApp ? "Tap ⋯ (top right) and choose “Open in browser”." : "Copy the link and paste it into Safari."}
            </p>
            <button className={`btn ${s.gateGo}`} onClick={copy}>
              {copied ? <Check size={18} strokeWidth={3} aria-hidden /> : <Copy size={18} strokeWidth={2.5} aria-hidden />}{" "}
              {copied ? "Link copied" : "Copy the link"}
            </button>
          </>
        ) : steps.length === 0 ? (
          <button className={`btn ${s.gateGo}`} onClick={() => void pwa.install()}>
            <SquarePlus size={18} strokeWidth={2.5} aria-hidden /> Install todone
          </button>
        ) : (
          <>
            <Phone ios={ios} at={at} />
            <ol className={s.sheetSteps}>
              {steps.map((x, i) => (
                <li key={i} data-on={at === i || undefined} onClick={() => setAt(i)}>
                  {x.icon} <span>{x.text}</span>
                </li>
              ))}
            </ol>
          </>
        )}

        <button className={s.gateSkip} onClick={skip}>
          Use it in the browser for now
        </button>
      </div>
    </div>
  );
}

// A little phone acting out the step: where to tap, lit up. iPhone: Safari's bar at the bottom, then its share sheet.
// Android: the ⋮ top right, then its menu.
function Phone({ ios, at }: { ios: boolean; at: number }) {
  return (
    <div className={s.gatePhone} data-ios={ios || undefined} data-at={at} aria-hidden>
      <div className={s.gateScreen}>
        <i className={s.gateBar} data-top={!ios || undefined}>
          <span>todone.today</span>
          {ios ? <Share size={14} strokeWidth={2.75} data-hot={at === 0 || undefined} /> : <EllipsisVertical size={14} strokeWidth={2.75} data-hot={at === 0 || undefined} />}
        </i>
        {at >= 1 && (
          <div className={s.gateMenu} data-ios={ios || undefined}>
            {at === 1 ? (
              <>
                <span>{ios ? "Copy" : "New tab"}</span>
                <span>{ios ? "Add to Reading List" : "Bookmarks"}</span>
                <span data-hot>
                  <SquarePlus size={12} strokeWidth={2.75} /> {ios ? "Add to Home Screen" : "Install app"}
                </span>
              </>
            ) : (
              <>
                <span className={s.gateIcon}>✓</span>
                <span>todone</span>
                <span data-hot>{ios ? "Add" : "Install"}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
