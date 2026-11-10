"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Gem, Heart, Minus, Plus, X } from "lucide-react";
import { PLAN_EVENT, api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { PLANS } from "@/lib/landing";
import { Confetti } from "@/components/Confetti";
import { NAME, PAID_EVENT, type PaidPlan, type PlansAsk, type Quote, type Status, TERMS, type Term, buyFounding, buyPlan, day, every, rupees } from "./checkout";
import s from "./app.module.css";

// The plans, right where a limit is hit (an 11th list, a new team, an invite, a share link), from a pricing link, or
// from Account. Plus and Team side by side with what each adds, a pay button on each (checkout opens on the spot),
// and a personal note for anyone who'd rather back the project as a founding member. Nothing was lost meanwhile:
// the thing just wasn't made yet.
export const needsPlan = (reason: string) => dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: { reason } }));

const FILL: Record<PaidPlan, string> = { plus: "var(--lime)", team: "var(--cyan)" };
const points = (p: PaidPlan) => PLANS.find((x) => x.name.toLowerCase() === p)?.points ?? [];

export function PlanPrompt() {
  const [ask, setAsk] = useState<PlansAsk | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [term, setTerm] = useState<Term>("year");
  const [seats, setSeats] = useState(3);
  const [quotes, setQuotes] = useState<Partial<Record<PaidPlan, Quote | string>>>({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [paid, setPaid] = useState("");

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const a: PlansAsk = typeof d === "string" ? { reason: d } : (d ?? {});
      setAsk(a);
      setErr("");
      setPaid("");
      const t = TERMS.find(([k]) => a.want?.endsWith(k))?.[0];
      if (t) setTerm(t);
      api<Status>("GET", "/billing").then(setSt, (x) => setErr(x.message));
    };
    addEventListener(PLAN_EVENT, on);
    return () => removeEventListener(PLAN_EVENT, on);
  }, []);
  const close = useCallback(() => setAsk(null), []);
  useEffect(() => {
    if (!ask) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !busy && close();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [ask, busy, close]);
  // What each plan costs this person today: the launch price, an upgrade's difference, or nothing until renewal.
  const minSeats = (st?.usage.people ?? 0) + 1;
  const teamSeats = Math.max(seats, minSeats);
  useEffect(() => {
    if (!ask || !st?.on) return;
    const t = setTimeout(() => {
      for (const p of ["plus", "team"] as const)
        api<Quote>("POST", "/billing/quote", { plan: p, term, seats: p === "team" ? teamSeats : 1 }).then(
          (q) => setQuotes((x) => ({ ...x, [p]: q })),
          (e) => setQuotes((x) => ({ ...x, [p]: e.message })),
        );
    }, 120);
    return () => clearTimeout(t);
  }, [ask, st, term, teamSeats]);

  if (!ask) return null;
  const run = async (what: string, f: () => Promise<Status | null>, thanks: string) => {
    setBusy(what);
    setErr("");
    try {
      const next = await f();
      if (next) {
        setSt(next);
        setPaid(thanks);
      }
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy("");
  };
  const founding = ask.want === "founding";
  // Came for founding member: the note leads. Otherwise the plans do, and the note follows them.
  const note = st && st.plan?.term !== "founding" && (
    <FoundingNote price={rupees(st.prices.founding)} busy={busy} first={founding} onBack={() => run("founding", buyFounding, "Welcome, founding member!")} />
  );

  return createPortal(
    <div className={s.planScrim} onClick={(e) => e.target === e.currentTarget && !busy && close()}>
      <div className={s.paywall} role="dialog" aria-modal="true" aria-labelledby="plans-h">
        <button className={s.paywallClose} onClick={close} aria-label="Close" disabled={!!busy}>
          <X size={20} strokeWidth={2.75} />
        </button>
        {paid ? (
          <div className={s.paywallDone}>
            <Confetti />
            <Check size={40} strokeWidth={3} aria-hidden />
            <h2 id="plans-h" className="display">
              {paid}
            </h2>
            <p>Thank you for backing todone. Your plan and receipt are in Account.</p>
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={close} autoFocus>
              Carry on
            </button>
          </div>
        ) : (
          <>
            <p className={s.paywallKicker}>
              <Gem size={14} strokeWidth={2.75} aria-hidden /> {ask.reason ? "That needs a plan" : "Plans"}
            </p>
            <h2 id="plans-h" className="display">
              {ask.reason ?? (founding ? "Back todone for the long run." : "Pick what fits.")}
            </h2>

            {founding && note}

            <div className={s.termPick} role="radiogroup" aria-label="How often to pay">
              {TERMS.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={term === k} onClick={() => setTerm(k)}>
                  {label}
                  {st?.intro && st.prices.intro.plus[k] && <small>launch price</small>}
                </button>
              ))}
            </div>
            {!st ? (
              <p className={s.fine}>{err || "Loading the plans…"}</p>
            ) : (
              <div className={s.payCards}>
                {(["plus", "team"] as const).map((p) => {
                  const q = quotes[p];
                  const intro = st.intro ? st.prices.intro[p][term] : undefined;
                  const price = st.prices.price[p][term];
                  const mine = typeof q === "string";
                  const total = price * (p === "team" ? teamSeats : 1);
                  return (
                    <div key={p} className={s.payCard} style={{ "--fill": FILL[p] } as React.CSSProperties}>
                      <h3 className="display">{NAME[p]}</h3>
                      <p className={s.payPrice}>
                        {intro && <s>{rupees(price)}</s>} <b className="display">{rupees(intro ?? price)}</b>{" "}
                        <small>
                          {p === "team" ? "a person, " : ""}
                          {intro ? (term === "half" ? "first 6 months" : "first year") : every(term)}
                        </small>
                      </p>
                      <ul>
                        {points(p).map((t) => (
                          <li key={t}>
                            <Check size={15} strokeWidth={3} aria-hidden /> {t}
                          </li>
                        ))}
                      </ul>
                      {p === "team" && (
                        <div className={s.seats}>
                          <span>Seats</span>
                          <button aria-label="One seat fewer" onClick={() => setSeats(Math.max(minSeats, teamSeats - 1))} disabled={teamSeats <= minSeats}>
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <input
                            aria-label="Seats"
                            inputMode="numeric"
                            value={teamSeats}
                            onChange={(e) => setSeats(Math.min(500, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                          />
                          <button aria-label="One seat more" onClick={() => setSeats(Math.min(500, teamSeats + 1))}>
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                      <button
                        className="btn"
                        style={{ "--fill": "#fff8ef" } as React.CSSProperties}
                        disabled={!q || mine || !!busy}
                        onClick={() => run(p, () => buyPlan(p, term, p === "team" ? teamSeats : 1), `You're on ${NAME[p]}!`)}
                      >
                        {busy === p ? "Opening…" : mine ? "Your plan" : q && !q.upfront ? `Switch on ${day(q.startAt)}` : `Pay ${q ? rupees(q.upfront) : ""}`}
                      </button>
                      <small className={s.payNote}>
                        {mine
                          ? q
                          : q?.upgrade
                            ? `For the time you've already paid for; then ${rupees(total)} ${every(term)}.`
                            : q?.upfront
                              ? `Then ${rupees(total)} ${every(term)}. Cancel any time.`
                              : " "}
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
            {!founding && note}
            {err && st && <p className={s.err}>{err}</p>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Founding member, as a note from the person making todone rather than a price tag.
function FoundingNote({ price, busy, first, onBack }: { price: string; busy: string; first: boolean; onBack: () => void }) {
  return (
    <div className={s.foundNote} data-first={first || undefined}>
      <span className={s.foundFace} aria-hidden>
        K
      </span>
      <div>
        <p className={s.foundHi}>Know Kartikey personally? Like where todone is going?</p>
        <p>
          I&apos;m building todone in the open: private lists, no ads, no selling your data, then phones and a calm e-ink
          screen. If that&apos;s the kind of thing you want to exist, back it once and you&apos;re part of it from the
          start.
        </p>
        <p className={s.foundSign}>— Kartikey, who makes todone</p>
        <div className={s.foundAct}>
          <button className="btn" style={{ "--fill": "var(--pink)" } as React.CSSProperties} disabled={!!busy} onClick={onBack}>
            <Heart size={16} strokeWidth={2.75} aria-hidden /> {busy === "founding" ? "Opening…" : `Back todone · ${price} once`}
          </button>
          <small>
            One payment gives you three years of Plus, and nothing renews. Every rupee goes towards the app-store accounts
            and the first hardware prototypes.
          </small>
        </div>
      </div>
    </div>
  );
}

// The plan someone is on, for the diamonds on what needs an upgrade. Fetched once and shared; refreshed after paying.
// ponytail: cached per page load; signing in as someone else without a reload keeps the first person's plan until then.
let cached: Promise<Status | null> | null = null;
const fetchPlan = () => (cached ??= api<Status>("GET", "/billing").catch(() => null));
export function usePlan() {
  const [st, setSt] = useState<Status | null>(null);
  useEffect(() => {
    let on = true;
    fetchPlan().then((x) => on && setSt(x));
    const paid = () => {
      cached = null;
      fetchPlan().then((x) => on && setSt(x));
    };
    addEventListener(PAID_EVENT, paid);
    return () => {
      on = false;
      removeEventListener(PAID_EVENT, paid);
    };
  }, []);
  const free = !!st?.on && st.level === "free";
  // In a team, sharing follows the team owner's plan; the diamonds are for your own space.
  const personal = !authClient.useSession().data?.session.activeOrganizationId;
  return { free, gated: free && personal, listLimit: free ? (st!.usage.listLimit ?? Infinity) : Infinity };
}
// The diamond on things that need a plan.
export const Diamond = () => <Gem className={s.diamond} size={13} strokeWidth={2.75} aria-label="Needs Plus" />;
