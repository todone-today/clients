"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Logo } from "@/components/Logo";
import s from "@/app/login/login.module.css";

// The recovery key, shown once: the only way back into your lists if you forget your password. Continuing needs a
// tick that it's been saved, because nobody (us included) can recover encrypted lists without it.
export function RecoveryKey({ value, onDone, again }: { value: string; onDone: () => void; again?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <main className={s.page}>
      <span className={s.mark}>
        <Logo size={34} />
      </span>
      <div className={`sticker ${s.card}`}>
        <h1 className="display">{again ? "Your new recovery key" : "Save your recovery key"}</h1>
        <p className={s.fine}>
          Your lists are end-to-end encrypted: only your password opens them, and we can&apos;t reset it. If you forget
          it, this key is the only way back in. Keep it somewhere safe, like a password manager or on paper.
        </p>
        <output className={s.recovery} aria-label="Recovery key">
          {value}
        </output>
        <div className={s.recoveryActions}>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              await navigator.clipboard.writeText(value).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? <Check size={16} strokeWidth={3} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}{" "}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            className="btn"
            download="todone-recovery-key.txt"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(
              `todone recovery key\n\n${value}\n\nIf you forget your password, use this on todone.today's "Forgot password?" page.\nWithout it (or your password) nobody can open your lists.\n`,
            )}`}
          >
            <Download size={16} strokeWidth={2.5} aria-hidden /> Download
          </a>
        </div>
        <label className={s.agree}>
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          <span>I&apos;ve saved my recovery key somewhere safe.</span>
        </label>
        <button
          className="btn"
          style={{ "--fill": "var(--lime)" } as React.CSSProperties}
          disabled={!saved}
          onClick={onDone}
        >
          Continue
        </button>
      </div>
    </main>
  );
}
