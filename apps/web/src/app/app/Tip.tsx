"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Gift, Lightbulb, Target } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { type TipKey, closeTip, tipOpen } from "@/lib/onboard";
import s from "./app.module.css";

// Each page's own colour and icon, as on its tab and sidebar button.
const LOOK: Record<TipKey, { fill: string; Icon: typeof Gift }> = {
  ideas: { fill: "var(--pink)", Icon: Lightbulb },
  calendar: { fill: "var(--cyan)", Icon: CalendarDays },
  goals: { fill: "var(--lime)", Icon: Target },
  rewards: { fill: "var(--butter)", Icon: Gift },
};

// A one-time dialog the first time someone opens Brainstorm, Calendar, Goals or Rewards: what the page is for and
// how it works, plus anything else the page puts in (Goals and Rewards: what Ask todone suggested). However it's
// closed, it doesn't come back on this device.
export function Tip({ k, title, children }: { k: TipKey; title: string; children: React.ReactNode }) {
  const who = authClient.useSession().data?.user.id ?? "demo";
  const [open, setOpen] = useState(() => typeof window !== "undefined" && tipOpen(who, k));
  const ref = useRef<HTMLDialogElement>(null);
  // Waits its turn: never on top of another dialog (the "About you" questions, a greeting, a goal being made).
  useEffect(() => {
    if (!open) return;
    const show = () => {
      const d = ref.current;
      if (!d || d.open) return true;
      if (document.querySelector("dialog[open]")) return false;
      d.showModal();
      return true;
    };
    if (show()) return;
    const t = setInterval(() => show() && clearInterval(t), 400);
    return () => clearInterval(t);
  }, [open]);
  if (!open) return null;
  const { fill, Icon } = LOOK[k];
  return (
    <dialog
      ref={ref}
      className={`${s.disclosure} ${s.tipDialog}`}
      style={{ "--fill": fill } as React.CSSProperties}
      aria-label={title}
      onClose={() => {
        closeTip(who, k);
        setOpen(false);
      }}
      onMouseDown={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <span className={s.tipIcon} aria-hidden>
        <Icon size={30} strokeWidth={2.5} />
      </span>
      <h2 className="display">{title}</h2>
      {children}
      <form method="dialog">
        <button className="btn" style={{ "--fill": k === "goals" ? "var(--ground)" : "var(--lime)" } as React.CSSProperties} autoFocus>
          Got it
        </button>
      </form>
    </dialog>
  );
}
