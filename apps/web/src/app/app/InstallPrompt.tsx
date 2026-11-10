"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, X } from "lucide-react";
import s from "./app.module.css";

// On a phone, in the browser (not yet installed): a small note offering to put todone on the home screen. Android
// and desktop Chrome get the browser's own install prompt; iPhone gets the two taps it takes (/install). Dismissed
// once, it stays away on this device.
const KEY = "todone:install-hidden";
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [native, setNative] = useState<Prompt | null>(null);
  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(KEY) === "1";
    } catch {}
    const installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    const phone = matchMedia("(pointer: coarse)").matches && innerWidth < 900;
    if (hidden || installed || !phone) return;
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const offer = (e: Event) => {
      if (apple) return; // iPhones install from Safari's Share menu; only Chrome-style browsers have a prompt
      e.preventDefault(); // we show our own note; the prompt comes when they tap Install
      setNative(e as Prompt);
      setShow(true);
    };
    addEventListener("beforeinstallprompt", offer);
    Promise.resolve().then(() => {
      setIos(apple);
      if (apple) setShow(true);
    });
    return () => removeEventListener("beforeinstallprompt", offer);
  }, []);
  const hide = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  if (!show) return null;
  return (
    <div className={s.installBar} role="region" aria-label="Install todone">
      <Smartphone size={20} strokeWidth={2.5} aria-hidden />
      <p>
        <b>Put todone on your home screen.</b> It opens like an app, works offline, and can remind you.
      </p>
      {native ? (
        <button
          className="btn"
          style={{ "--fill": "var(--lime)" } as React.CSSProperties}
          onClick={async () => {
            await native.prompt();
            await native.userChoice.catch(() => null);
            hide();
          }}
        >
          Install
        </button>
      ) : (
        <Link href={ios ? "/install#iphone" : "/install"} className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
          How
        </Link>
      )}
      <button className={s.installClose} onClick={hide} aria-label="Not now">
        <X size={18} strokeWidth={2.75} aria-hidden />
      </button>
    </div>
  );
}
