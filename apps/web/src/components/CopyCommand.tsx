"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import s from "./CopyCommand.module.css";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <button className={s.cmd} onClick={copy} aria-label={`Copy: ${command}`}>
      <span className={s.prompt} aria-hidden>
        $
      </span>
      <code>{command}</code>
      <span className={s.icon} aria-hidden>
        {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
