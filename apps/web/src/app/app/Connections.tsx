"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Copy, Trash2 } from "lucide-react";
import { type Connection, connections, makeConnection, removeConnection, setups, usesPassword } from "@/lib/connect";
import s from "./app.module.css";

const OWN = "https://app.todone.today";
const when = (t: number) => {
  const d = Math.round((Date.now() - t) / 86_400_000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

// Connect an AI app on your computer (Claude, Cursor, …) to your lists, goals, calendar and rewards (lib/connect.ts).
// Make one: a name and your password, then one block to paste, shown once. Below: the ones you have, to remove.
export function Connections() {
  const [list, setList] = useState<Connection[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [password, setPassword] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState<{ name: string; code: string } | null>(null);
  const [app, setApp] = useState(0);
  const [removing, setRemoving] = useState("");
  useEffect(() => {
    connections().then(setList, () => setSignedOut(true));
    usesPassword().then(setPassword, () => {});
  }, []);

  if (signedOut) return <p>Make an account to connect an AI app to your lists.</p>;
  const ways = made ? setups(made.code, location.origin === OWN ? undefined : location.origin) : [];
  return (
    <div className={s.stack}>
      {made ? (
        <div className={s.connectMade}>
          <p>
            <b>“{made.name}” is ready.</b> Paste this into your AI app. It&apos;s shown only this once, so copy it now.
          </p>
          <div className={`${s.seg} ${s.connectApps}`} role="group" aria-label="Your AI app">
            {ways.map((w, i) => (
              <button key={w.app} type="button" aria-pressed={i === app} onClick={() => setApp(i)}>
                {w.app}
              </button>
            ))}
          </div>
          <p>{ways[app].where}</p>
          <pre className={s.code}>{ways[app].text}</pre>
          <div className={s.connectRow}>
            <CopyButton text={ways[app].text} label={ways[app].code ? "Copy command" : "Copy"} key={`a${app}`} />
            {/* The plugin and the extension ask for the code itself. */}
            {ways[app].code && <CopyButton text={made.code} label="Copy your code" key={`c${app}`} />}
            <button type="button" className={s.ghost} onClick={() => setMade(null)}>
              Done
            </button>
          </div>
          <small>Then ask it things like “add milk to my Groceries list” or “what’s on my plate this week?”</small>
        </div>
      ) : (
        <form
          className={s.stack}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const name = String(f.get("name")).trim();
            setBusy(true);
            setErr("");
            try {
              const c = await makeConnection(name, String(f.get("secret")));
              setList((l) => [...(l ?? []), c]);
              setMade({ name, code: c.code });
              setApp(0);
              form.reset();
            } catch (x) {
              setErr(x instanceof Error ? x.message : "Couldn't make the connection.");
            }
            setBusy(false);
          }}
        >
          <input name="name" aria-label="Name for this connection" defaultValue="Claude on my computer" maxLength={60} required />
          <input
            name="secret"
            type="password"
            aria-label={password ? "Your password" : "Your unlock passphrase"}
            placeholder={password ? "Your password, to unlock your lists for it" : "Your unlock passphrase"}
            autoComplete="current-password"
            required
          />
          <button className="btn" disabled={busy}>
            <Bot size={16} strokeWidth={2.5} aria-hidden /> {busy ? "Making it…" : "Make a connection"}
          </button>
          {err && <p className={s.err}>{err}</p>}
        </form>
      )}

      {!!list?.length && (
        <ul className={s.connectList} aria-label="Your connections">
          {list.map((c) => (
            <li key={c.id}>
              <span>
                <b>{c.name}</b>
                <small>{c.used ? `Last used ${when(c.used)}` : "Not used yet"}</small>
              </span>
              {removing === c.id ? (
                <button
                  className={s.ghost}
                  data-danger
                  onClick={async () => {
                    await removeConnection(c.id).catch(() => {});
                    setList((l) => (l ?? []).filter((x) => x.id !== c.id));
                    setRemoving("");
                  }}
                >
                  Remove for good
                </button>
              ) : (
                <button className={s.ghost} onClick={() => setRemoving(c.id)} aria-label={`Remove ${c.name}`}>
                  <Trash2 size={15} strokeWidth={2.5} aria-hidden /> Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      style={{ "--fill": "var(--lime)" } as React.CSSProperties}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {copied ? <Check size={16} strokeWidth={3} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />} {copied ? "Copied" : label}
    </button>
  );
}
