"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Gem, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { NAME, PAID_EVENT, type Status, day, every, openPlans, rupees } from "./checkout";
import s from "./app.module.css";

// Your plan on the Account page: what you're on, what you use, stopping or refunding, and receipts. Picking a plan
// happens in the plans dialog (PlanPrompt.tsx).
export function Billing() {
  const [st, setSt] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [sure, setSure] = useState<"" | "cancel" | "refund">("");

  const load = useCallback(() => api<Status>("GET", "/billing").then(setSt, (e) => setErr(e.message)), []);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    addEventListener(PAID_EVENT, load);
    return () => removeEventListener(PAID_EVENT, load);
  }, [load]);

  if (!st) return err ? <p className={s.err}>{err}</p> : null;
  const run = async (f: () => Promise<Status | null>, ok: string) => {
    setErr("");
    setDone("");
    try {
      const next = await f();
      if (next) {
        setSt(next);
        setDone(ok);
      }
    } catch (e) {
      setErr((e as Error).message);
    }
    setSure("");
  };
  const p = st.prices;
  const { usage: u } = st;

  return (
    <>
      <section className={s.integration} id="plan">
        <h2 className={`display ${s.planTitle}`}>Plan &amp; billing</h2>
        <p className={s.planNow}>
          {st.level === "unlimited"
            ? st.on
              ? "Everything, free: you joined before paid plans."
              : "Everything: this server has no plans."
            : st.plan
              ? `${NAME[st.plan.plan]}${st.plan.term === "founding" ? ", founding member" : ""}${st.plan.plan === "team" ? `, ${st.plan.seats} seats` : ""}`
              : "Free"}
        </p>
      </section>

      {!st.on ? (
        <section className={s.integration}>
          <p>Payments aren&apos;t set up on this server, so there are no plans or limits. Every feature is yours.</p>
        </section>
      ) : (
        <>
          <section className={s.integration}>
            <h2>Your plan</h2>
            {st.grandfathered && (
              <p>You were here before paid plans, so everything stays free for you, for good. Picking a plan anyway backs todone.</p>
            )}
            {st.plan && (
              <p>
                {st.plan.term === "founding"
                  ? `Three years of Plus, paid once, until ${day(st.plan.until)}.`
                  : st.plan.renews
                    ? `Renews on ${day(st.plan.until)} at ${rupees(p.price[st.plan.plan][st.plan.term] * (st.plan.plan === "team" ? st.plan.seats : 1))} ${every(st.plan.term)}.`
                    : `Ends on ${day(st.plan.until)}; it won't renew. Everything you made stays.`}
                {st.next && ` Then ${NAME[st.next.plan]}${st.next.plan === "team" ? ` (${st.next.seats} seats)` : ""}, ${every(st.next.term)}, from ${day(st.next.from)}.`}
              </p>
            )}
            {!st.grandfathered && (
              <div className={s.usage}>
                <Meter label="Lists" n={u.lists} of={u.listLimit} />
                {u.peopleLimit !== 0 && <Meter label="People in your teams" n={u.people} of={u.peopleLimit} />}
              </div>
            )}
            {st.level === "free" && <p>Free: up to 10 lists, just you. Plus adds unlimited lists and sharing with up to 6 people; Team, everyone.</p>}
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={() => openPlans()}>
              <Gem size={16} strokeWidth={2.75} aria-hidden /> {st.plan ? "Change plan" : "See plans"}
            </button>
          </section>

          {(st.plan?.renews || st.next || st.refundable) && (
            <section className={s.integration}>
              <h2>Stop or refund</h2>
              {(st.plan?.renews || st.next) && (
                <p>
                  {sure === "cancel" ? (
                    <>
                      Stop renewing? You keep {st.plan ? NAME[st.plan.plan] : "your plan"} until {st.plan ? day(st.plan.until) : "it ends"}.{" "}
                      <button className={s.link} onClick={() => run(() => api<Status>("POST", "/billing/cancel"), "It won't renew.")}>
                        Yes, stop it
                      </button>{" "}
                      <button className={s.link} onClick={() => setSure("")}>
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button className={s.link} onClick={() => setSure("cancel")}>
                      Stop renewing
                    </button>
                  )}
                </p>
              )}
              {st.refundable && (
                <p>
                  {sure === "refund" ? (
                    <>
                      Refund your last payment and end that plan now? Nothing you made goes anywhere.{" "}
                      <button className={s.link} onClick={() => run(() => api<Status>("POST", "/billing/refund"), "Refunded. It reaches you in 5 to 7 working days.")}>
                        Yes, refund it
                      </button>{" "}
                      <button className={s.link} onClick={() => setSure("")}>
                        No
                      </button>
                    </>
                  ) : (
                    <button className={s.link} onClick={() => setSure("refund")}>
                      Refund my last payment (within 7 days)
                    </button>
                  )}
                </p>
              )}
            </section>
          )}
        </>
      )}

      {done && (
        <p className={s.saved} role="status">
          <Check size={16} strokeWidth={3} aria-hidden /> {done}
        </p>
      )}
      {err && <p className={s.err}>{err}</p>}

      {st.payments.length > 0 && (
        <section className={s.integration}>
          <h2>Payments</h2>
          <ul className={s.payments}>
            {st.payments.map((x) => (
              <li key={x.id}>
                <time>{day(x.created_at)}</time>
                <span>{x.what}</span>
                <b>
                  {rupees(x.amount)}
                  {x.refunded ? ` · refunded ${rupees(x.refunded)}` : ""}
                </b>
                <a href={`/app/receipt/${x.id}`} target="_blank" rel="noopener">
                  <Receipt size={14} strokeWidth={2.5} aria-hidden /> {x.invoice_no}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Meter({ label, n, of }: { label: string; n: number; of: number | null }) {
  return (
    <div className={s.meter}>
      <span>
        {label}: <b>{n}</b>
        {of !== null ? ` of ${of}` : ""}
      </span>
      {of !== null && (
        <i aria-hidden>
          <i style={{ width: `${Math.min(100, (n / Math.max(of, 1)) * 100)}%` }} />
        </i>
      )}
    </div>
  );
}
