"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { type TipKey, closeTip, tipOpen } from "@/lib/onboard";
import s from "./app.module.css";

// A one-time card at the top of Brainstorm, Calendar, Goals or Rewards the first time someone opens it: what the
// page is for, in a sentence or two, plus anything else the page puts in (Goals: what Ask todone suggested). Once
// closed it doesn't come back on this device.
export function Tip({ k, title, children }: { k: TipKey; title: string; children: React.ReactNode }) {
  const who = authClient.useSession().data?.user.id ?? "demo";
  const [open, setOpen] = useState(() => typeof window !== "undefined" && tipOpen(who, k));
  if (!open) return null;
  return (
    <aside className={s.tip} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button
          className={s.tipClose}
          onClick={() => {
            closeTip(who, k);
            setOpen(false);
          }}
          aria-label="Got it, hide this"
        >
          <X size={16} strokeWidth={2.75} aria-hidden />
        </button>
      </header>
      {children}
    </aside>
  );
}
