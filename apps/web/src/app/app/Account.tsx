"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, LogOut, Sparkles } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { authClient } from "@/lib/auth-client";
import { toCSV } from "@todone/sdk/export";
import { forget } from "@/lib/store";
import { exportData } from "./actions";
import { changePassword, derive, myFingerprint, newRecovery, showRecovery } from "@/lib/vault";
import s from "./app.module.css";

const save = (name: string, type: string, text: string) => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

export function Account({ onPlan }: { onPlan: () => void }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [hasPassword, setHasPassword] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  // People who signed in only with GitHub or Google have no password; a recent sign-in is proof enough.
  useEffect(() => {
    authClient.listAccounts().then((r) => setHasPassword(!!r.data?.some((a) => a.providerId === "credential")));
  }, []);
  if (!session) return null;
  const { user } = session;

  const download = async (kind: "json" | "csv") => {
    setBusy(kind);
    try {
      const data = await exportData();
      const day = data.exportedAt.slice(0, 10);
      if (kind === "json") save(`todone-${day}.json`, "application/json", JSON.stringify(data, null, 2));
      else save(`todone-${day}.csv`, "text/csv", toCSV(data));
    } catch {
      setErr("Couldn't export. Try again.");
    }
    setBusy("");
  };

  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Account</h1>
        <div className={s.me}>
          <Avatar className={s.avatar} image={user.image} name={user.name || user.email} />
          <p className={s.progress}>
            {user.name ? `${user.name} · ` : ""}
            {user.email}
            {user.emailVerified ? " · confirmed" : ""}
          </p>
        </div>
        <button
          className={s.ghost}
          onClick={async () => {
            await authClient.signOut();
            await forget();
            router.replace("/login");
          }}
        >
          <LogOut size={16} strokeWidth={2.5} aria-hidden /> Sign out
        </button>
      </div>

      <section className={s.integration}>
        <h2>Plan</h2>
        <p>Your plan, payments and receipts.</p>
        <button className={s.ghost} onClick={onPlan}>
          <Sparkles size={16} strokeWidth={2.5} aria-hidden /> Plan &amp; billing
        </button>
      </section>

      <section className={s.integration}>
        <h2>Your name</h2>
        <form
          className={s.add}
          onSubmit={async (e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name")).trim();
            if (!name || name === user.name) return;
            setBusy("name");
            const r = await authClient.updateUser({ name });
            setBusy("");
            setErr(r.error ? (r.error.message ?? "Couldn't save your name.") : "");
          }}
        >
          <input name="name" aria-label="Your name" defaultValue={user.name} maxLength={80} required />
          <button className="btn" disabled={!!busy}>
            {busy === "name" ? "Saving…" : "Save"}
          </button>
        </form>
        <p>
          To change your email, write to us. <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms</Link>
        </p>
      </section>

      {hasPassword && <ChangePassword email={user.email} />}
      {hasPassword && <Encryption email={user.email} />}

      <section className={s.integration}>
        <h2>Export everything</h2>
        <p>Every list you can see, personal and in your teams. JSON keeps it all; CSV opens in any spreadsheet.</p>
        <div className={s.tools}>
          <button className="btn" disabled={!!busy} onClick={() => download("json")}>
            <Download size={16} strokeWidth={2.5} aria-hidden /> {busy === "json" ? "Exporting…" : "JSON"}
          </button>
          <button className="btn" disabled={!!busy} onClick={() => download("csv")}>
            <Download size={16} strokeWidth={2.5} aria-hidden /> {busy === "csv" ? "Exporting…" : "CSV"}
          </button>
        </div>
      </section>

      <section className={s.integration}>
        <h2>Delete account</h2>
        <p>
          Deletes your account, your lists and your settings, for good. Teams only you are in go too. Export first if you
          want to keep anything.
        </p>
        {!confirm ? (
          <button className={s.ghost} onClick={() => setConfirm(true)}>
            Delete my account…
          </button>
        ) : (
          <form
            className={s.stack}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy("delete");
              // The server checks the hash derived from the password, as at sign-in; the password stays here.
              const d = hasPassword ? await derive(user.email, password).catch(() => null) : null;
              const r = await authClient.deleteUser(d && !d.legacy ? { password: d.authHash } : hasPassword ? { password } : {});
              setBusy("");
              if (r.error)
                return setErr(
                  r.error.code === "SESSION_EXPIRED"
                    ? "For safety, sign out and in again, then delete."
                    : (r.error.message ?? "Couldn't delete your account."),
                );
              await forget();
              router.replace("/");
            }}
          >
            {hasPassword && (
              <input
                type="password"
                aria-label="Your password"
                placeholder="Your password"
                autoComplete="current-password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <div className={s.tools}>
              <button className="btn" style={{ "--fill": "var(--hot)" } as React.CSSProperties} disabled={!!busy}>
                {busy === "delete" ? "Deleting…" : "Delete everything"}
              </button>
              <button type="button" className={s.ghost} onClick={() => setConfirm(false)}>
                Keep my account
              </button>
            </div>
          </form>
        )}
      </section>
      {err && <p className={s.err}>{err}</p>}
    </>
  );
}

// Change the password while signed in: your key is re-wrapped with the new one (nothing is re-encrypted); other
// devices are signed out so the old password stops working there.
function ChangePassword({ email }: { email: string }) {
  const [state, setState] = useState<"" | "saving" | "done">("");
  const [err, setErr] = useState("");
  return (
    <section className={s.integration}>
      <h2>Password</h2>
      <form
        className={s.stack}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          const next = String(f.get("next"));
          if (next !== String(f.get("again"))) return setErr("The two new passwords don't match.");
          setState("saving");
          try {
            await changePassword(email, String(f.get("current")), next);
          } catch (x) {
            setState("");
            return setErr(x instanceof Error ? x.message : "Couldn't change your password.");
          }
          form.reset();
          setErr("");
          setState("done");
        }}
      >
        <input
          name="current"
          type="password"
          aria-label="Current password"
          placeholder="Current password"
          autoComplete="current-password"
          required
        />
        <input
          name="next"
          type="password"
          aria-label="New password"
          placeholder="New password (8 or more characters)"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <input
          name="again"
          type="password"
          aria-label="New password again"
          placeholder="New password again"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button className="btn" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Change password"}
        </button>
        {state === "done" && <p role="status">Changed. Other devices have been signed out.</p>}
        {err && <p className={s.err}>{err}</p>}
      </form>
      <p>Forgotten it? Sign out and use &ldquo;Forgot password?&rdquo; on the sign-in page, with your recovery key.</p>
    </section>
  );
}

// Your lists are encrypted in this browser before they're saved. The recovery key is the way back in without the
// password: see it again, or replace it, after confirming the password. The fingerprint identifies your key when a
// teammate confirms you.
function Encryption({ email }: { email: string }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [print, setPrint] = useState<string | null>(null);
  useEffect(() => {
    myFingerprint().then(setPrint, () => {});
  }, []);
  const run = (kind: "show" | "new") => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    setBusy(kind);
    setErr("");
    try {
      setKey(kind === "show" ? (await showRecovery(email, password)).recoveryKey : await newRecovery(email, password));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "That didn't work.");
    }
    setBusy("");
  };
  return (
    <section className={s.integration}>
      <h2>
        <KeyRound size={18} strokeWidth={2.5} aria-hidden /> End-to-end encryption
      </h2>
      <p>
        Your lists are encrypted on this device before they&apos;re saved; todone&apos;s servers only ever hold scrambled
        data. Only your password or your recovery key can open them. We can&apos;t, and can&apos;t reset them for you.
      </p>
      {key ? (
        <>
          <output className={s.recoveryKey} aria-label="Recovery key">
            {key}
          </output>
          <div className={s.tools}>
            <button className="btn" onClick={() => navigator.clipboard.writeText(key).catch(() => {})}>
              Copy
            </button>
            <button className={s.ghost} onClick={() => setKey("")}>
              Hide
            </button>
          </div>
        </>
      ) : (
        <form className={s.stack} onSubmit={run("show")}>
          <input
            name="password"
            type="password"
            aria-label="Your password"
            placeholder="Your password, to see your recovery key"
            autoComplete="current-password"
            required
          />
          <button className="btn" disabled={!!busy}>
            {busy === "show" ? "Unlocking…" : "Show recovery key"}
          </button>
        </form>
      )}
      <details>
        <summary>Lost it? Make a new recovery key</summary>
        <form className={s.stack} onSubmit={run("new")}>
          <p>The old key stops working straight away. Save the new one somewhere safe.</p>
          <input name="password" type="password" aria-label="Your password" placeholder="Your password" required />
          <button className="btn" disabled={!!busy}>
            {busy === "new" ? "Making…" : "Make a new recovery key"}
          </button>
        </form>
      </details>
      {print && (
        <p>
          Your key&apos;s fingerprint: <code>{print}</code>. When a teammate confirms you, they see this too; if it
          matches, the key is really yours.
        </p>
      )}
      {err && <p className={s.err}>{err}</p>}
    </section>
  );
}
