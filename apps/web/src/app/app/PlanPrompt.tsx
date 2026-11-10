"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { PLAN_EVENT } from "@/lib/api";
import s from "./app.module.css";

// When something needs a paid plan (an 11th list, a team, a share link), the server answers 402 and lib/api.ts
// announces it; this says why, plainly, with a way to the plans. Nothing was lost: the thing just wasn't made.
export const needsPlan = (message: string) => dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: message }));

export function PlanPrompt({ onPlans }: { onPlans: () => void }) {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const on = (e: Event) => setMsg(String((e as CustomEvent).detail ?? ""));
    addEventListener(PLAN_EVENT, on);
    return () => removeEventListener(PLAN_EVENT, on);
  }, []);
  useEffect(() => {
    if (!msg) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMsg("");
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [msg]);
  if (!msg) return null;
  return createPortal(
    <div className={s.planScrim} onClick={(e) => e.target === e.currentTarget && setMsg("")}>
      <div className={s.planNote} role="alertdialog" aria-modal="true" aria-labelledby="plan-msg">
        <Sparkles size={22} strokeWidth={2.5} aria-hidden />
        <p id="plan-msg" className={`display ${s.planMsg}`}>
          {msg}
        </p>
        <p className={s.fine}>Plus starts at ₹99 a month; the first year is ₹599. Everything you&apos;ve made stays either way.</p>
        <div>
          <button
            className="btn"
            autoFocus
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() => {
              setMsg("");
              onPlans();
            }}
          >
            See plans
          </button>
          <button className={s.link} onClick={() => setMsg("")}>
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
