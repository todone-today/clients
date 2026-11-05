"use client";

import { useEffect, useState } from "react";
import type { Config } from "@todone/sdk/api";
import { authClient } from "@/lib/auth-client";
import s from "./app.module.css";

// Until the email is confirmed: a note under the header with the deletion date and a way to resend the link.
// Shown only where the server sends confirmation emails (it deletes unconfirmed accounts after 7 days).
export function VerifyBanner({ email, verified, created }: { email: string; verified: boolean; created: Date }) {
  const [on, setOn] = useState(false);
  const [sent, setSent] = useState<"" | "sending" | "sent" | "failed">("");
  useEffect(() => {
    if (verified) return;
    fetch("/api/config")
      .then((r) => r.json() as Promise<Config>)
      .then((c) => setOn(!!c.verifiesEmail))
      .catch(() => {});
  }, [verified]);
  if (verified || !on) return null;
  const until = new Date(new Date(created).getTime() + 7 * 864e5).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
  return (
    <p className={s.verifyBar} role="status">
      <span>
        Confirm your email: we sent a link to <b>{email}</b>. Accounts that aren&apos;t confirmed are deleted on {until}.
      </span>
      <button
        type="button"
        className={s.link}
        disabled={sent === "sending" || sent === "sent"}
        onClick={async () => {
          setSent("sending");
          const r = await authClient.sendVerificationEmail({ email, callbackURL: "/app" });
          setSent(r.error ? "failed" : "sent");
        }}
      >
        {sent === "sent" ? "Sent. Check your inbox" : sent === "failed" ? "Couldn't send. Try again" : "Send it again"}
      </button>
    </p>
  );
}
