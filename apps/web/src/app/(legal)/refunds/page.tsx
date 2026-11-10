import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, NAME } from "@/lib/brand";
import s from "../legal.module.css";

export const metadata: Metadata = { title: "Refund & Cancellation Policy" };

export default function Refunds() {
  return (
    <>
      <h1 className="display">Refund &amp; Cancellation Policy</h1>
      <p className={s.lead}>
        {NAME} is free to use. Plus and Team are paid plans that renew by themselves until you stop them; Founding member is
        paid once. Payments go through Razorpay in Indian rupees, and prices include taxes.
      </p>

      <h2>Refunds within 7 days</h2>
      <p>
        Changed your mind? Within 7 days of any payment, go to Account → Plan &amp; billing → Refund my last payment. You get
        the whole amount back to where you paid from, usually within 5 to 7 working days, and that plan ends straight away.
        Nothing you made is touched: lists, teams and files stay, and only the paid extras stop (new lists past the free 10,
        new teams, invites and share links). This covers the first payment, every renewal, upgrades and Founding member.
      </p>
      <p>
        After 7 days, payments aren&apos;t refunded, except where the law requires it or a charge was our mistake (charged
        twice, charged after you stopped renewing, or the service didn&apos;t work for a long stretch). Write to us and
        we&apos;ll sort it out.
      </p>

      <h2>Stopping a plan</h2>
      <p>
        Go to Account → Plan &amp; billing → Stop renewing, any time. You keep the plan until the end of what you&apos;ve paid
        for, and nothing more is charged. You can also cancel the mandate from your bank or UPI app; we treat that the same
        way.
      </p>

      <h2>Changing plans</h2>
      <ul>
        <li>
          Moving up (Plus to Team, or more Team seats) applies straight away. You pay the difference for the days you&apos;ve
          already paid for, shown before you pay, and the new price from your next renewal.
        </li>
        <li>
          Moving down (fewer seats, Team to Plus, or another billing period) starts when your current period ends. Nothing is
          charged until then.
        </li>
        <li>The launch price is for your first paid period only; renewals are at the regular price shown with it.</li>
      </ul>

      <h2>If a renewal fails</h2>
      <p>
        Razorpay tries again over a few days and you keep your plan meanwhile. If it still can&apos;t charge, the plan ends;
        everything you made stays, and you can pick a plan again any time.
      </p>

      <h2>Closing your account</h2>
      <p>
        Deleting your account (Account → Delete account) stops any renewal. It doesn&apos;t refund the current period on its
        own; ask within 7 days of the payment if you&apos;d like it back. We keep a record of each payment (amount, date, what
        it was for and your email) for as long as tax law requires, even after the account is gone.
      </p>

      <h2>Questions</h2>
      <p>
        Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also the <Link href="/terms">Terms</Link>.
      </p>
    </>
  );
}
