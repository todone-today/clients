"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import s from "./receipt.module.css";

// A printable receipt for one payment. Prices include taxes; the GST lines appear once the seller is registered
// (BILLING_GSTIN on the server), as 18% included in the price.
type R = {
  email: string;
  name: string;
  amount: number;
  refunded: number;
  what: string;
  invoice_no: string;
  created_at: string;
  seller: { name: string; address: string; gstin: string };
};
const rupees = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Receipt() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<R | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<R>("GET", `/billing/receipts/${encodeURIComponent(id)}`).then(setR, (e) => setErr(e.message));
  }, [id]);
  if (err) return <main className={s.page}>{err}</main>;
  if (!r) return null;
  const tax = r.seller.gstin ? Math.round(r.amount - r.amount / 1.18) : 0;
  return (
    <main className={s.page}>
      <header className={s.head}>
        <Logo size={28} />
        <button className="btn" onClick={() => print()}>
          <Printer size={16} strokeWidth={2.5} aria-hidden /> Print or save as PDF
        </button>
      </header>
      <h1 className="display">{r.seller.gstin ? "Tax invoice" : "Receipt"}</h1>
      <dl className={s.meta}>
        <dt>Number</dt>
        <dd>{r.invoice_no}</dd>
        <dt>Date</dt>
        <dd>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd>
        <dt>Payment</dt>
        <dd>{id}</dd>
      </dl>
      <div className={s.parties}>
        <div>
          <h2>From</h2>
          <p>{r.seller.name}</p>
          {r.seller.address && <p>{r.seller.address}</p>}
          {r.seller.gstin && <p>GSTIN {r.seller.gstin}</p>}
        </div>
        <div>
          <h2>To</h2>
          {r.name && <p>{r.name}</p>}
          <p>{r.email}</p>
        </div>
      </div>
      <table className={s.lines}>
        <tbody>
          <tr>
            <td>{r.what}</td>
            <td>{rupees(r.amount)}</td>
          </tr>
          {tax > 0 && (
            <tr className={s.sub}>
              <td>Includes GST at 18%</td>
              <td>{rupees(tax)}</td>
            </tr>
          )}
          {r.refunded > 0 && (
            <tr className={s.sub}>
              <td>Refunded</td>
              <td>−{rupees(r.refunded)}</td>
            </tr>
          )}
          <tr className={s.total}>
            <td>Paid</td>
            <td>{rupees(r.amount - r.refunded)}</td>
          </tr>
        </tbody>
      </table>
      <p className={s.note}>Paid through Razorpay. Questions about this payment: reply to your receipt email or write to us from the app.</p>
    </main>
  );
}
