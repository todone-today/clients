"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "./AuthDialog";
import { authClient } from "@/lib/auth-client";
import { greet } from "@/components/Welcome";
import { adopt, derive, newAccount, setupLegacy, unlockWith } from "@/lib/vault";
import { encryptPlainLists } from "@/app/app/actions";
import { RecoveryKey } from "@/components/RecoveryKey";
import s from "./login.module.css";
import { PasswordInput } from "@/components/PasswordInput";
import { GithubMark } from "@/components/GithubMark";
import { siDiscord, siGoogle } from "simple-icons";

const PROVIDER = { google: "Google", github: "GitHub", discord: "Discord" } as const;
function ProviderMark({ p }: { p: keyof typeof PROVIDER }) {
  if (p === "github") return <GithubMark />;
  const icon = p === "google" ? siGoogle : siDiscord;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill={`#${icon.hex}`}>
      <path d={icon.path} />
    </svg>
  );
}

// Only same-site paths, so the login page can't be used to bounce people elsewhere.
const safeNext = () => {
  const n = new URLSearchParams(location.search).get("next") ?? "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
};

// Your password never leaves this page: it unlocks your keys here, and the server only gets a hash derived from it
// (see lib/vault.ts). So nobody, us included, can read your lists or reset your password without your recovery key.
export function LoginForm({
  canReset,
  haiku,
  social = [],
}: {
  canReset: boolean; // the server sends email, so "Forgot password?" can work
  social?: ("google" | "github" | "discord")[]; // the sign-ins this server offers
  haiku: [string, string, string];
}) {
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  // Arriving to start (a landing page's "Start a list", "Start free" or a plan): open on making an account.
  useEffect(() => {
    const next = new URLSearchParams(location.search).get("next") ?? "";
    if (/[?&](new=1|plan=)/.test(next)) Promise.resolve().then(() => setMode("up"));
  }, []);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Shown once, after sign-up (or the first sign-in of an account from before encryption).
  const [recovery, setRecovery] = useState<string | null>(null);

  const enter = () => {
    // Came to buy a plan: straight to the plans, without the welcome haiku in front of them.
    if (!/[?&]plan=/.test(safeNext())) greet(haiku);
    location.assign(safeNext());
  };
  if (recovery)
    return (
      <AuthShell locked>
        <RecoveryKey value={recovery} onDone={enter} bare />
      </AuthShell>
    );

  return (
    <AuthShell>
      <form
        className={`sticker ${s.card}`}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email")).trim();
          const password = String(f.get("password"));
          setBusy(true);
          setErr("");
          try {
            if (mode === "reset") {
              // Same answer whether or not the email has an account, so the form can't be used to find accounts.
              const r = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
              if (r.error) throw new Error(r.error.message ?? "That didn't work. Try again.");
              return setSent(true);
            }
            if (mode === "up") {
              const a = await newAccount(password);
              const r = await authClient.signUp.email({
                email,
                password: a.authHash,
                name: String(f.get("name")).trim() || email.split("@")[0],
                // The confirmation email's link lands in the app (on the server's own address, BETTER_AUTH_URL).
                callbackURL: "/app",
                ...a.keys,
              } as Parameters<typeof authClient.signUp.email>[0]);
              if (r.error) throw new Error(r.error.message ?? "That didn't work. Try again.");
              await adopt(r.data!.user.id, a.accountKey, a.keys);
              return setRecovery(a.recoveryKey);
            }
            const d = await derive(email, password);
            if (d.legacy) {
              // An account from before encryption: its plain password signs in this one last time.
              const r = await authClient.signIn.email({ email, password });
              if (r.error) throw new Error(r.error.message ?? "That didn't work. Try again.");
              const key = await setupLegacy(r.data!.user.id, password);
              // Personal lists take the personal key; teams' lists get their team key when the team is opened.
              await authClient.organization.setActive({ organizationId: null });
              await encryptPlainLists();
              return setRecovery(key);
            }
            const r = await authClient.signIn.email({ email, password: d.authHash });
            if (r.error) throw new Error(r.error.message ?? "That didn't work. Try again.");
            await unlockWith(r.data!.user.id, d.wrapKey);
            enter();
          } catch (x) {
            setErr(x instanceof Error ? x.message : "That didn't work. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="display">{mode === "in" ? "Welcome back" : mode === "up" ? "Make an account" : "Reset password"}</h1>
        {mode !== "reset" && social.length > 0 && (
          <>
            {/* Signing in this way only proves who you are; the app then asks for (or, the first time, sets up) an
                unlock passphrase that opens your encrypted lists (app/Unlock.tsx). */}
            <div className={s.social}>
              {social.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setErr("");
                    const r = await authClient.signIn.social({ provider: p, callbackURL: safeNext() });
                    if (r?.error) {
                      setErr(r.error.message ?? "That didn't work. Try again.");
                      setBusy(false);
                    }
                  }}
                >
                  <ProviderMark p={p} /> Continue with {PROVIDER[p]}
                </button>
              ))}
            </div>
            <p className={s.or}>
              <span>or with email</span>
            </p>
          </>
        )}
        {mode === "reset" && (
          <p className={s.fine}>
            {sent
              ? "If that email has an account, a link is on its way. It works for an hour. You'll need your recovery key to keep your lists."
              : "We'll email you a link. Your lists are end-to-end encrypted, so keeping them needs the recovery key you saved when you signed up."}
          </p>
        )}
        {mode === "up" && (
          <label>
            <span>Name</span>
            <input name="name" autoComplete="name" maxLength={80} />
          </label>
        )}
        <label>
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        {mode !== "reset" && (
          <label>
            <span>Password</span>
            <PasswordInput
              name="password"
              required
              minLength={8}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />
          </label>
        )}
        {mode === "up" && (
          <p className={s.fine}>
            Your lists are encrypted with this password before they leave your device. We never see it and can&apos;t
            reset it, so pick one you&apos;ll remember. You&apos;ll get a recovery key next.
          </p>
        )}
        {mode === "in" && canReset && (
          <button
            type="button"
            className={s.forgot}
            onClick={() => {
              setMode("reset");
              setErr("");
              setSent(false);
            }}
          >
            Forgot password?
          </button>
        )}
        {mode === "up" && (
          <label className={s.agree}>
            <input type="checkbox" name="agree" required />
            <span>
              I&apos;m 18 or older and agree to the <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>
        )}
        {err && (
          <p className={s.err} role="alert">
            {err}
          </p>
        )}
        {!(mode === "reset" && sent) && (
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={busy}>
            {busy
              ? mode === "reset"
                ? "Sending…"
                : "Unlocking…"
              : mode === "in"
                ? "Sign in"
                : mode === "up"
                  ? "Sign up"
                  : "Send the link"}
          </button>
        )}
        <button
          type="button"
          className={s.switch}
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setErr("");
          }}
        >
          {mode === "in" ? "New here? Make an account" : mode === "up" ? "Have an account? Sign in" : "Back to sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
