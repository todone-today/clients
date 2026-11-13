"use client";

// Plans and payments on the client (server: actions/billing.ts): the shapes, formatting, and Razorpay Checkout.
// Checkout is Razorpay's own window; nothing about your lists is involved, only your name, email and the payment.
import { PLAN_EVENT, api } from "@/lib/api";

export type PaidPlan = "plus" | "team";
export type Term = "month" | "half" | "year";
export type Status = {
  on: boolean;
  key: string;
  level: "free" | PaidPlan | "unlimited";
  grandfathered: boolean;
  plan: { plan: PaidPlan; term: Term | "founding"; seats: number; until: string; renews: boolean } | null;
  next: { plan: PaidPlan; term: Term; seats: number; from: string } | null;
  intro: boolean;
  launch?: { left: number; total: number }; // launch-price spots left (the first 100 paid purchases)
  usage: { lists: number; listLimit: number | null; people: number; peopleLimit: number | null };
  prices: { price: Record<PaidPlan, Record<Term, number>>; intro: Record<PaidPlan, Partial<Record<Term, number>>>; founding: number };
  payments: { id: string; amount: number; refunded: number; what: string; invoice_no: string; created_at: string }[];
  refundable: string | null;
};
export type Quote = { upfront: number; startAt: number; upgrade: boolean; intro: boolean };
type Opened = { key: string; subscription?: string; order?: string; amount: number; name: string; email: string; what: string };

export const NAME = { plus: "Plus", team: "Team" } as const;
export const TERMS: [Term, string, string][] = [
  ["month", "Monthly", "a month"],
  ["half", "6 months", "every 6 months"],
  ["year", "Yearly", "a year"],
];
export const every = (t: Term) => TERMS.find((x) => x[0] === t)![2];
export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const day = (d: string | number) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// The plans dialog (Paywall.tsx): opened where a limit is hit, from a pricing link, or from Account.
export type PlansAsk = { reason?: string; want?: string | null };
export const openPlans = (ask: PlansAsk = {}) => dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: ask }));
// After a purchase, so Account's plan section shows it.
export const PAID_EVENT = "todone:paid";

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
      // No `image`: Checkout uses the logo set in the Razorpay dashboard (an image from our site showed blank).
      prefill: { name: o.name, email: o.email },
      theme: { color: "#d4f04a" },
      handler: (res: Record<string, string>) =>
        api<Status>("POST", "/billing/confirm", {
          payment: res.razorpay_payment_id,
          subscription: res.razorpay_subscription_id,
          order: res.razorpay_order_id,
          signature: res.razorpay_signature,
        }).then((st) => (dispatchEvent(new Event(PAID_EVENT)), done(st)), fail),
      modal: { ondismiss: () => done(null) },
    });
    r.on("payment.failed", (e) => fail(new Error(e.error?.description ?? "The payment didn't go through.")));
    r.open();
  });
}

export const buyPlan = async (plan: PaidPlan, term: Term, seats: number) =>
  pay(await api<Opened>("POST", "/billing/checkout", { plan, term, seats }));
export const buyFounding = async () => pay(await api<Opened>("POST", "/billing/founding"));
