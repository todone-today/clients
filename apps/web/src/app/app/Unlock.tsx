"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { authClient } from "@/lib/auth-client";
import { forget } from "@/lib/store";
import { unlockWithPassword } from "@/lib/vault";
import s from "@/app/login/login.module.css";

// Signed in, but this browser doesn't hold your keys (site data cleared, or a new browser that kept the session).
// The password opens them again; it never leaves this page.
export function Unlock({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main className={s.page}>
      <span className={s.mark}>
        <Logo size={34} />
      </span>
      <form
        className={`sticker ${s.card}`}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await unlockWithPassword(userId, email, String(new FormData(e.currentTarget).get("password")));
            onDone();
          } catch (x) {
            setErr(x instanceof Error ? x.message : "That didn't work.");
          }
          setBusy(false);
        }}
      >
        <h1 className="display">Unlock your lists</h1>
        <p className={s.fine}>
          Your lists are end-to-end encrypted. Enter your password to open them on this device ({email}).
        </p>
        <label>
          <span>Password</span>
          <input name="password" type="password" required autoComplete="current-password" autoFocus />
        </label>
        {err && (
          <p className={s.err} role="alert">
            {err}
          </p>
        )}
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={busy}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
        <button
          type="button"
          className={s.switch}
          onClick={async () => {
            await authClient.signOut();
            await forget();
            router.replace("/login");
          }}
        >
          Not you? Sign out
        </button>
      </form>
    </main>
  );
}
