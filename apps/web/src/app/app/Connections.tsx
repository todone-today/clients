"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Lock, Trash2 } from "lucide-react";
import { type App, APPS, COMMANDS, type Connection, config, connections, makeConnection, removeConnection } from "@/lib/connect";
import { openPrivacy } from "./Privacy";
import s from "./app.module.css";

const OWN = "https://app.todone.today";
const when = (t: number) => {
  const d = Math.round((Date.now() - t) / 86_400_000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
// Clipboard writes after a server call: Safari wants the promise handed over inside the tap itself.
async function copyLater(text: Promise<string>) {
  if (typeof ClipboardItem !== "undefined")
    return navigator.clipboard.write([new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
  return navigator.clipboard.writeText(await text);
}

// Connect an AI app on your computer (lib/connect.ts): pick the app, copy, paste. The connection is made the first
// time you copy its code, named after the app. It can only use what you made readable (Account → Privacy).
export function Connections() {
  const [list, setList] = useState<Connection[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [app, setApp] = useState<App>("Claude Code");
  const [codes, setCodes] = useState<Partial<Record<App, string>>>({}); // made this visit, so a second copy is the same
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  const [removing, setRemoving] = useState("");
  useEffect(() => {
    connections().then(setList, () => setSignedOut(true));
  }, []);
  if (signedOut) return <p>Make an account to connect an AI app to your lists.</p>;

  const code = async () => {
    if (codes[app]) return codes[app]!;
    const c = await makeConnection(app);
    setCodes((x) => ({ ...x, [app]: c.code }));
    setList((l) => [...(l ?? []), c]);
    return c.code;
  };
  const copy = (what: string, text: () => Promise<string>) => {
    setErr("");
    copyLater(text())
      .then(() => setCopied(`${app}:${what}`))
      .catch((x) => setErr(x instanceof Error && x.message ? x.message : "Couldn't copy. Try again."));
  };
  const done = (what: string) => copied === `${app}:${what}`;
  const button = (what: string, label: string, text: () => Promise<string>) => (
    <button type="button" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={() => copy(what, text)}>
      {done(what) ? <Check size={16} strokeWidth={3} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}{" "}
      {done(what) ? "Copied" : label}
    </button>
  );
  const command = COMMANDS[app];
  const url = location.origin === OWN ? undefined : location.origin;

  return (
    <div className={s.stack}>
      <div className={`${s.seg} ${s.connectApps}`} role="group" aria-label="Your AI app">
        {APPS.map((a) => (
          <button key={a} type="button" aria-pressed={a === app} onClick={() => setApp(a)}>
            {a}
          </button>
        ))}
      </div>

      <ol className={s.connectSteps}>
        {command ? (
          <>
            <li>
              <p>
                {app === "Claude Code" ? "In Claude Code, run:" : "In a terminal, run:"} <code>{command}</code>
              </p>
              {button("cmd", "Copy", async () => command)}
            </li>
            <li>
              <p>When it asks for your todone code, paste it.</p>
              {button("code", "Copy your code", code)}
            </li>
          </>
        ) : (
          <>
            <li>
              <p>Copy your setup. Your code is inside.</p>
              {button("setup", "Copy setup", async () => config(await code(), url))}
            </li>
            <li>
              <p>
                {app === "Claude Desktop"
                  ? "In Claude: Settings → Developer → Edit Config. Paste it, save, then quit and reopen Claude."
                  : "In Cursor: Settings → MCP → Add new server, or paste it into ~/.cursor/mcp.json."}
              </p>
            </li>
          </>
        )}
        <li>
          <p>Ask it: “What’s on my list today?”</p>
        </li>
      </ol>
      {err && <p className={s.err}>{err}</p>}

      <p className={s.connectNote}>
        <Lock size={15} strokeWidth={2.5} aria-hidden /> AI apps see only what you make readable. Everything else stays
        encrypted.{" "}
        <button
          type="button"
          className={s.link}
          onClick={(e) => {
            e.currentTarget.closest("dialog")?.close();
            openPrivacy();
          }}
        >
          Choose what they see
        </button>
      </p>

      {!!list?.length && (
        <ul className={s.connectList} aria-label="Connected apps">
          {list.map((c) => (
            <li key={c.id}>
              <span>
                <b>{c.name}</b>
                <small>{c.used ? `Last used ${when(c.used)}` : `Added ${when(c.created)}, not used yet`}</small>
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
