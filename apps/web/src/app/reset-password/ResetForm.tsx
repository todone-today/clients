"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { RecoveryKey } from "@/components/RecoveryKey";
import { recover, resetAccount } from "@/lib/vault";
import s from "../login/login.module.css";
import { PasswordInput } from "@/components/PasswordInput";

// Where the reset email's link lands (?token=…, or ?error=INVALID_TOKEN when it's used or expired). Lists are
// end-to-end encrypted, so a new password keeps them only with the recovery key; without it, a fresh start.
export function ResetForm() {
  const q = useSearchParams();
  const router = useRouter();
  const token = q.get("token");
  const [err, setErr] = useState(q.get("error") ? "That link has expired or was already used. Ask for a new one." : "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [lost, setLost] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  if (fresh) return <RecoveryKey value={fresh} onDone={() => router.push("/login")} />;

  return (
    <main className={s.page}>
      <Link href="/" className={s.mark} aria-label="Home">
        <Logo size={34} />
      </Link>
      <form
        className={`sticker ${s.card}`}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const password = String(f.get("password"));
          if (password !== String(f.get("again"))) return setErr("The two passwords don't match.");
          setBusy(true);
          setErr("");
          try {
            if (lost) setFresh(await resetAccount(token ?? "", password));
            else {
              await recover(token ?? "", String(f.get("recovery")), password);
              setDone(true);
            }
          } catch (x) {
            setErr(x instanceof Error ? x.message : "That didn't work. Ask for a new link.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="display">{lost ? "Start fresh" : "New password"}</h1>
        {done ? (
          <>
            <p className={s.fine}>Done: your lists are as you left them. Sign in with your new password.</p>
            <Link href="/login" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              Sign in
            </Link>
          </>
        ) : token ? (
          <>
            {lost ? (
              <p className={s.err} role="note">
                Without your recovery key, nobody can open your encrypted lists, us included. Starting fresh keeps your
                account and email, <b>deletes your encrypted lists</b> (lists you switched off encryption for stay), and a
                teammate will need to confirm you again in each team.
              </p>
            ) : (
              <label>
                <span>Recovery key</span>
                <input
                  name="recovery"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="XXXX-XXXX-XXXX-…"
                  className={s.mono}
                />
              </label>
            )}
            <label>
              <span>New password</span>
              <PasswordInput name="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label>
              <span>Again</span>
              <PasswordInput name="again" required minLength={8} autoComplete="new-password" />
            </label>
            {err && (
              <p className={s.err} role="alert">
                {err}
              </p>
            )}
            <button
              className="btn"
              style={{ "--fill": lost ? "var(--hot)" : "var(--lime)" } as React.CSSProperties}
              disabled={busy}
            >
              {busy ? "Working…" : lost ? "Delete my encrypted lists and start fresh" : "Save the new password"}
            </button>
            <button
              type="button"
              className={s.switch}
              onClick={() => {
                setLost(!lost);
                setErr("");
              }}
            >
              {lost ? "I found my recovery key" : "I don't have my recovery key"}
            </button>
          </>
        ) : (
          <>
            <p className={s.err} role="alert">
              {err || "This page needs the link from the reset email."}
            </p>
            <Link href="/login" className="btn">
              Back to sign in
            </Link>
          </>
        )}
      </form>
    </main>
  );
}
