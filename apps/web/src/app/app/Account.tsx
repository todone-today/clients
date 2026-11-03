"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toCSV } from "@todone/sdk/export";
import { forget } from "@/lib/store";
import { exportData } from "./actions";
import s from "./app.module.css";

const save = (name: string, type: string, text: string) => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

export function Account() {
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
        <p className={s.progress}>
          {user.name ? `${user.name} · ` : ""}
          {user.email}
        </p>
        <button
          className={s.ghost}
          onClick={async () => {
            await authClient.signOut();
            forget();
            router.replace("/login");
          }}
        >
          <LogOut size={16} strokeWidth={2.5} aria-hidden /> Sign out
        </button>
      </div>

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
              const r = await authClient.deleteUser(hasPassword ? { password } : {});
              setBusy("");
              if (r.error)
                return setErr(
                  r.error.code === "SESSION_EXPIRED"
                    ? "For safety, sign out and in again, then delete."
                    : (r.error.message ?? "Couldn't delete your account."),
                );
              forget();
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
