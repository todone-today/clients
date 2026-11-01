import type { Metadata } from "next";
import { CONTACT, NAME } from "@/lib/brand";
import s from "../legal.module.css";

export const metadata: Metadata = { title: "Refund & Cancellation Policy" };

export default function Refunds() {
  return (
    <>
      <h1 className="display">Refund &amp; Cancellation Policy</h1>
      <p className={s.lead}>
        {NAME} is free. There are no plans, payments or subscriptions, so there&apos;s nothing to refund.
      </p>

      <h2>Cancelling</h2>
      <p>
        You can stop using {NAME} whenever you like. To close your account, go to Account → Delete account. It takes effect
        straight away and deletes your account, personal lists and settings; export first if you want to keep anything.
      </p>

      <h2>If we ever charge</h2>
      <p>
        Should we add paid features, this policy will set out the price, how to cancel and how refunds work before anyone can
        pay, and nothing will be charged without your clear agreement.
      </p>

      <h2>Questions</h2>
      <p>
        Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </>
  );
}
