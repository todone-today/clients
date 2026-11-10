"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Minus, Plus, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import s from "./app.module.css";

// Plans and payments (server: actions/billing.ts). Checkout is Razorpay's own window; nothing about your lists is
// involved, only your name, email and the payment.
type PaidPlan = "plus" | "team";
type Term = "month" | "half" | "year";
type Status = {
  on: boolean;
  key: string;
  level: "free" | PaidPlan | "unlimited";
  grandfathered: boolean;
  plan: { plan: PaidPlan; term: Term | "founding"; seats: number; until: string; renews: boolean } | null;
  next: { plan: PaidPlan; term: Term; seats: number; from: string } | null;
  intro: boolean;
  usage: { lists: number; listLimit: number | null; people: number; peopleLimit: number | null };
  prices: { price: Record<PaidPlan, Record<Term, number>>; intro: Record<PaidPlan, Partial<Record<Term, number>>>; founding: number };
  payments: { id: string; amount: number; refunded: number; what: string; invoice_no: string; created_at: string }[];
  refundable: string | null;
};
type Quote = { upfront: number; startAt: number; upgrade: boolean; intro: boolean };
type Opened = { key: string; subscription?: string; order?: string; amount: number; name: string; email: string; what: string };

const NAME = { plus: "Plus", team: "Team" } as const;
const TERMS: [Term, string, string][] = [
  ["month", "Monthly", "a month"],
  ["half", "6 months", "every 6 months"],
  ["year", "Yearly", "a year"],
];
const every = (t: Term) => TERMS.find((x) => x[0] === t)![2];
export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (d: string | number) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// Razorpay Checkout's script, loaded the first time someone pays.
type Rzp = { open: () => void; on: (e: string, f: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => Rzp;
  }
}
const loadCheckout = () =>
  window.Razorpay
    ? Promise.resolve()
    : new Promise<void>((ok, fail) => {
        const sc = Object.assign(document.createElement("script"), { src: "https://checkout.razorpay.com/v1/checkout.js", onload: () => ok(), onerror: fail });
        document.head.append(sc);
      });

// Opens checkout; resolves with the new status once paid and checked, or null if closed.
async function pay(o: Opened): Promise<Status | null> {
  await loadCheckout();
  return new Promise((done, fail) => {
    const r = new window.Razorpay!({
      key: o.key,
      ...(o.subscription ? { subscription_id: o.subscription } : { order_id: o.order, amount: o.amount, currency: "INR" }),
      name: "todone",
      description: o.what,
      prefill: { name: o.name, email: o.email },
      theme: { color: "#d4f04a" },
      handler: (res: Record<string, string>) =>
        api<Status>("POST", "/billing/confirm", {
          payment: res.razorpay_payment_id,
          subscription: res.razorpay_subscription_id,
          order: res.razorpay_order_id,
          signature: res.razorpay_signature,
        }).then(done, fail),
      modal: { ondismiss: () => done(null) },
    });
    r.on("payment.failed", (e) => fail(new Error(e.error?.description ?? "The payment didn't go through.")));
    r.open();
  });
}

export function Billing({ want }: { want?: string | null }) {
  const [st, setSt] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState("");
  // The picker starts on what the pricing page asked for (?plan=team-year), else Plus yearly.
  const [plan, setPlan] = useState<PaidPlan>(() => (want?.startsWith("team") ? "team" : "plus"));
  const [term, setTerm] = useState<Term>(() => (["month", "half", "year"].find((t) => want?.endsWith(t)) as Term) ?? "year");
  const [seats, setSeats] = useState(3);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [sure, setSure] = useState<"" | "cancel" | "refund">("");

  const load = useCallback(() => api<Status>("GET", "/billing").then(setSt, (e) => setErr(e.message)), []);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    if (!st?.on) return;
    const t = setTimeout(
      () =>
        api<Quote>("POST", "/billing/quote", { plan, term, seats }).then(
          (q) => (setQuote(q), setQuoteErr("")),
          (e) => (setQuote(null), setQuoteErr(e.message)),
        ),
      150,
    );
    return () => clearTimeout(t);
  }, [st, plan, term, seats]);

  if (!st) return err ? <p className={s.err}>{err}</p> : null;
  const run = async (what: string, f: () => Promise<Status | null>, ok: string) => {
    setBusy(what);
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
    setBusy("");
    setSure("");
  };
  const buy = () => run("buy", async () => pay(await api<Opened>("POST", "/billing/checkout", { plan, term, seats })), "Done. Thank you for backing todone!");
  const found = () => run("founding", async () => pay(await api<Opened>("POST", "/billing/founding")), "Welcome, founding member. Thank you!");

  const p = st.prices;
  const regular = p.price[plan][term] * (plan === "team" ? seats : 1);
  const minSeats = st.usage.people + 1;
  const { usage: u } = st;

  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Plan</h1>
        <p className={s.progress}>
          {st.level === "unlimited"
            ? st.on
              ? "Everything, free: you joined before paid plans."
              : "Everything: this server has no plans."
            : st.plan
              ? `${NAME[st.plan.plan]}${st.plan.term === "founding" ? ", founding member" : ""}${st.plan.plan === "team" ? `, ${st.plan.seats} seats` : ""}`
              : "Free"}
        </p>
      </div>

      {!st.on ? (
        <section className={s.integration}>
          <p>Payments aren&apos;t set up on this server, so there are no plans or limits. Every feature is yours.</p>
        </section>
      ) : (
        <>
          <section className={s.integration} id="plan">
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
          </section>

          <section className={s.integration}>
            <h2>{st.plan ? "Change plan" : "Pick a plan"}</h2>
            <div className={s.planPick} role="radiogroup" aria-label="Plan">
              {(["plus", "team"] as const).map((k) => (
                <button key={k} role="radio" aria-checked={plan === k} onClick={() => setPlan(k)} style={{ "--fill": k === "plus" ? "var(--lime)" : "var(--cyan)" } as React.CSSProperties}>
                  <b>{NAME[k]}</b>
                  <small>{k === "plus" ? "Unlimited lists, share with up to 6 people" : "Unlimited people and teams, a seat each"}</small>
                </button>
              ))}
            </div>
            <div className={s.termPick} role="radiogroup" aria-label="How often to pay">
              {TERMS.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={term === k} onClick={() => setTerm(k)}>
                  {label}
                  {st.intro && p.intro[plan][k] && <small>launch price</small>}
                </button>
              ))}
            </div>
            {plan === "team" && (
              <div className={s.seats}>
                <span>Seats (you count as one)</span>
                <button aria-label="One seat fewer" onClick={() => setSeats((n) => Math.max(minSeats, 1, n - 1))} disabled={seats <= Math.max(1, minSeats)}>
                  <Minus size={16} strokeWidth={3} />
                </button>
                <input
                  aria-label="Seats"
                  inputMode="numeric"
                  value={seats}
                  onChange={(e) => setSeats(Math.min(500, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                />
                <button aria-label="One seat more" onClick={() => setSeats((n) => Math.min(500, n + 1))}>
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
            )}
            <p className={s.quote} role="status">
              {quoteErr
                ? quoteErr
                : !quote
                  ? " "
                  : quote.upgrade
                    ? `${rupees(quote.upfront)} now for the time you've already paid for, then ${rupees(regular)} ${every(term)} from ${day(quote.startAt)}.`
                    : quote.upfront
                      ? `${rupees(quote.upfront)} now${quote.intro ? " (launch price)" : ""} for the first ${term === "month" ? "month" : term === "half" ? "6 months" : "year"}, then ${rupees(regular)} ${every(term)}. Cancel any time.`
                      : `Nothing now. It starts on ${day(quote.startAt)} at ${rupees(regular)} ${every(term)}, when your current plan ends.`}
            </p>
            <button
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              disabled={!quote || !!busy || (plan === "team" && seats < minSeats)}
              onClick={buy}
            >
              {busy === "buy" ? "Opening…" : quote && !quote.upfront ? "Switch then" : `Pay ${quote ? rupees(quote.upfront) : ""} with Razorpay`}
            </button>
            <p className={s.fine}>UPI, cards and netbanking. Renews by itself until you stop it; prices include taxes.</p>
          </section>

          {!st.plan || st.plan.term !== "founding" ? (
            <section className={s.integration}>
              <h2>Founding member</h2>
              <p>
                {rupees(p.founding)} once for three years of Plus, no renewals. It goes straight to the goals on the home page: the
                app-store accounts, then hardware prototypes.
              </p>
              <button className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties} disabled={!!busy} onClick={found}>
                {busy === "founding" ? "Opening…" : `Become a founding member, ${rupees(p.founding)}`}
              </button>
            </section>
          ) : null}

          {(st.plan?.renews || st.next || st.refundable) && (
            <section className={s.integration}>
              <h2>Stop or refund</h2>
              {(st.plan?.renews || st.next) && (
                <p>
                  {sure === "cancel" ? (
                    <>
                      Stop renewing? You keep {st.plan ? NAME[st.plan.plan] : "your plan"} until {st.plan ? day(st.plan.until) : "it ends"}.{" "}
                      <button className={s.link} onClick={() => run("cancel", () => api<Status>("POST", "/billing/cancel"), "It won't renew.")}>
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
                      <button className={s.link} onClick={() => run("refund", () => api<Status>("POST", "/billing/refund"), "Refunded. It reaches you in 5 to 7 working days.")}>
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
