"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import s from "./Welcome.module.css";

// After each sign-in the app greets you with a haiku on why writing things down matters.
// The sign-in page leaves it in sessionStorage; the app shows it once and clears it.
const KEY = "todone:welcome";
const subs = new Set<() => void>();
const read = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function greet(haiku: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(haiku));
  } catch {}
}

function dismiss() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  subs.forEach((f) => f());
}

export function Welcome() {
  const raw = useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    read,
    () => null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (raw && !dialog.current?.open) dialog.current?.showModal();
  }, [raw]);
  if (!raw) return null;
  let lines: string[] = [];
  try {
    lines = JSON.parse(raw);
  } catch {}
  return (
    <dialog ref={dialog} className={s.welcome} aria-label="A haiku to start" onClose={dismiss}>
      <p className={s.lines}>
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </p>
      <form method="dialog">
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} autoFocus>
          Let&apos;s go
        </button>
      </form>
    </dialog>
  );
}
