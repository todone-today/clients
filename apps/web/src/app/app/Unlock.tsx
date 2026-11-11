"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { RecoveryKey } from "@/components/RecoveryKey";
import { authClient } from "@/lib/auth-client";
import { forget } from "@/lib/store";
import { type KeyState, keyState, recoverPassphrase, setupWithPassphrase, unlockWithSecret } from "@/lib/vault";
import s from "@/app/login/login.module.css";
import { PasswordInput } from "@/components/PasswordInput";

// Signed in, but this browser doesn't hold your keys yet. What opens them depends on the account:
// - "setup": just signed up with Google, GitHub or Discord, so you choose an unlock passphrase (it encrypts your
//   lists on this device, like a password; we never see it), then save your recovery key;
// - "passphrase" / "password": unlock on this device with it; a forgotten passphrase is replaced with the recovery key;
// - "legacy": an account from before encryption, which finishes setting up when you sign in with its password.
export function Unlock({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [state, setState] = useState<KeyState | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    keyState().then(setState, () => setState("password"));
  }, []);

  const signOut = async () => {
    await authClient.signOut();
    await forget();
    router.replace("/login");
  };
  const run = (work: (f: FormData) => Promise<void>) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await work(new FormData(e.currentTarget));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "That didn't work.");
    }
    setBusy(false);
  };

  if (recovery) return <RecoveryKey value={recovery} onDone={onDone} />;
  if (!state) return null;

  const setup = state === "setup";
  const word = state === "password" ? "password" : "unlock passphrase";
  return (
    <main className={s.page}>
      <span className={s.mark}>
        <Logo size={34} />
      </span>
      {state === "legacy" ? (
        <div className={`sticker ${s.card}`}>
          <h1 className="display">One more step</h1>
          <p className={s.fine}>
            This account has a password from before encryption. Sign in once with your email and password to finish
            setting it up; after that, {email} can sign in either way.
          </p>
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={signOut}>
            Sign in with my password
          </button>
        </div>
      ) : (
        <form
          className={`sticker ${s.card}`}
          onSubmit={run(async (f) => {
            const secret = String(f.get("secret"));
            if (setup || recovering) {
              if (secret !== String(f.get("again"))) throw new Error("The two passphrases don't match.");
              if (secret.length < 8) throw new Error("Use at least 8 characters.");
            }
            if (setup) setRecovery(await setupWithPassphrase(userId, secret));
            else if (recovering) {
              await recoverPassphrase(userId, String(f.get("recovery")).trim(), secret);
              onDone();
            } else {
              await unlockWithSecret(userId, secret).catch(() => {
                throw new Error(`That ${word} isn't right.`);
              });
              onDone();
            }
          })}
        >
          <h1 className="display">{setup ? "Lock your lists" : recovering ? "New passphrase" : "Unlock your lists"}</h1>
          <p className={s.fine}>
            {setup
              ? "Choose an unlock passphrase. It encrypts your lists on your device, so only you can read them. We never see it and can't reset it; you'll get a recovery key next, just in case."
              : recovering
                ? "Your recovery key opens your lists; then choose a new passphrase."
                : `Your lists are end-to-end encrypted. Enter your ${word} to open them on this device (${email}).`}
          </p>
          {recovering && (
            <label>
              <span>Recovery key</span>
              <input name="recovery" required autoComplete="off" spellCheck={false} />
            </label>
          )}
          <label>
            <span>{state === "password" && !recovering ? "Password" : "Unlock passphrase"}</span>
            <PasswordInput
              name="secret"
              required
              minLength={setup || recovering ? 8 : undefined}
              autoComplete={setup || recovering ? "new-password" : "current-password"}
              autoFocus
            />
          </label>
          {(setup || recovering) && (
            <label>
              <span>Again</span>
              <PasswordInput name="again" required autoComplete="new-password" />
            </label>
          )}
          {setup && (
            <p className={s.fine}>
              By continuing you confirm you&apos;re 18 or older and agree to the <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          )}
          {err && (
            <p className={s.err} role="alert">
              {err}
            </p>
          )}
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={busy}>
            {busy ? "Working…" : setup ? "Lock my lists" : recovering ? "Save and unlock" : "Unlock"}
          </button>
          {state === "passphrase" && (
            <button type="button" className={s.forgot} onClick={() => (setRecovering(!recovering), setErr(""))}>
              {recovering ? "I remember it" : "Forgot it? Use your recovery key"}
            </button>
          )}
          <button type="button" className={s.switch} onClick={signOut}>
            Not you? Sign out
          </button>
        </form>
      )}
    </main>
  );
}
