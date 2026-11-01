import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, NAME, OPERATOR, REPO } from "@/lib/brand";
import s from "../legal.module.css";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function Terms() {
  return (
    <>
      <h1 className="display">Terms &amp; Conditions</h1>
      <p className={s.lead}>
        These terms are an agreement between you and {OPERATOR} (&ldquo;we&rdquo;) for using the hosted {NAME} app. By making
        an account or using it, you agree to them and to the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Who can use it</h2>
      <p>
        You must be 18 or older and able to make a binding contract. If you use {NAME} for an organisation, you confirm you
        may agree to these terms for it.
      </p>

      <h2>Your account</h2>
      <p>
        Give a real email address and keep your password to yourself. You&apos;re responsible for what happens under your
        account; tell us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a> if you think someone else has got in.
      </p>

      <h2>Your content</h2>
      <p>
        Your lists, tasks and everything else you put in stay yours. You give us permission to store, copy and show them only
        as needed to run the app for you and the people you share them with. You can export or delete them at any time.
      </p>

      <h2>Teams</h2>
      <p>
        A team&apos;s owners and admins decide who&apos;s in it. Anything you add to a team can be seen, changed and deleted
        by its members. If you&apos;re the only owner of a team others use, hand it over or delete it before you delete your
        account.
      </p>

      <h2>Using it fairly</h2>
      <p>
        Follow the <Link href="/acceptable-use">Acceptable Use Policy</Link>. We may suspend or close accounts that break it
        or these terms, and tell you why unless the law or safety stops us.
      </p>

      <h2>Connected services</h2>
      <p>
        If you connect Google Calendar, Notion, Discord or another service, their terms apply to them, and we aren&apos;t
        responsible for what they do with your data.
      </p>

      <h2>Price</h2>
      <p>
        {NAME} is free. If we ever charge for something, we&apos;ll say so clearly before you pay, and the{" "}
        <Link href="/refunds">Refund &amp; Cancellation Policy</Link> will apply.
      </p>

      <h2>Open source</h2>
      <p>
        {NAME}&apos;s code is free software under the GNU General Public License, version 3. These terms cover the hosted
        service; the licence covers the code, which you can get from <a href={REPO}>GitHub</a> and run yourself.
      </p>

      <h2>No guarantees</h2>
      <p>
        We work to keep {NAME} running and your data safe, but it&apos;s provided &ldquo;as is&rdquo;, without warranties of
        any kind, and may change, pause or stop. Keep your own export of anything important.
      </p>

      <h2>Limits on liability</h2>
      <p>
        To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, lost data or lost profits,
        and our total liability for any claim is limited to ₹1,000. Nothing here limits liability that can&apos;t be limited
        by law.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop at any time by deleting your account. We may close the service with at least 30 days&apos; notice so you
        can export your data, or sooner if we must under the law or to stop abuse.
      </p>

      <h2>Law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Write to us first and we&apos;ll try to sort it out; otherwise the
        courts of India have jurisdiction.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. We&apos;ll change the date below and tell you before significant changes take effect; if
        you keep using {NAME} after that, you accept them.
      </p>
    </>
  );
}
