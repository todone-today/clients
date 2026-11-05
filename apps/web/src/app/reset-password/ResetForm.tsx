"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { authClient } from "@/lib/auth-client";
import s from "../login/login.module.css";

// Where the reset email's link lands (?token=…, or ?error=INVALID_TOKEN when it's used or expired).
export function ResetForm() {
  const q = useSearchParams();
  const token = q.get("token");
  const [err, setErr] = useState(q.get("error") ? "That link has expired or was already used. Ask for a new one." : "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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
          const r = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
          setBusy(false);
          if (r.error) return setErr(r.error.message ?? "That didn't work. Ask for a new link.");
          setDone(true);
        }}
      >
        <h1 className="display">New password</h1>
        {done ? (
          <>
            <p className={s.fine}>Done. Sign in with your new password.</p>
            <Link href="/login" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              Sign in
            </Link>
          </>
        ) : token ? (
          <>
            <label>
              <span>New password</span>
              <input name="password" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label>
              <span>Again</span>
              <input name="again" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            {err && (
              <p className={s.err} role="alert">
                {err}
              </p>
            )}
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={busy}>
              Save the new password
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
