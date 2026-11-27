"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Lock, RefreshCw } from "lucide-react";
import { type App, APPS, CHATGPT_PATH, COMMANDS, type Code, config, myCode, newCode, VERSION } from "@/lib/connect";
import { openPrivacy } from "./Privacy";
import s from "./app.module.css";

const OWN = "https://app.todone.today";
const when = (t: number) => {
  const d = Math.round((Date.now() - t) / 86_400_000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

// Connect an AI app on your computer (lib/connect.ts): pick the app, copy, paste. One code works in all your apps;
// a new one replaces it everywhere. It can only use what you made readable (Privacy).
export function Connections() {
  const [code, setCode] = useState<Code | null>(null);
  const [failed, setFailed] = useState(false);
  const [app, setApp] = useState<App>("Claude Code");
  const [copied, setCopied] = useState("");
  const [renewing, setRenewing] = useState(false);
  useEffect(() => {
    myCode().then(setCode, () => setFailed(true));
  }, []);
  if (failed) return <p>Make an account to connect an AI app to your lists.</p>;

  const button = (what: string, label: string, text: string | undefined) => (
    <button
      type="button"
      className="btn"
      style={{ "--fill": "var(--lime)" } as React.CSSProperties}
      disabled={!text}
      onClick={() => text && navigator.clipboard.writeText(text).then(() => setCopied(what), () => {})}
    >
      {copied === what ? <Check size={16} strokeWidth={3} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}{" "}
      {copied === what ? "Copied" : label}
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
        {app === "ChatGPT" ? (
          <>
            <li>
              <p>
                In the ChatGPT app on your computer (not the website): Settings → add a custom MCP server. Name it{" "}
                <b>todone</b> and pick <b>STDIO</b>.
              </p>
            </li>
            <li>
              <p>
                Command to launch<code>npx</code>
              </p>
              {button("gpt:cmd", "Copy", "npx")}
            </li>
            <li>
              <p>
                Arguments: add these two<code>-y</code>
                <code>todone-mcp@{VERSION}</code>
              </p>
              {button("gpt:arg", "Copy the second", `todone-mcp@${VERSION}`)}
            </li>
            <li>
              <p>
                Environment variable: key <b>TODONE_CONNECT</b>, value your code.
              </p>
              {button("code", "Copy your code", code?.code)}
            </li>
            <li>
              <p>
                One more: key <b>PATH</b>, value<code>{CHATGPT_PATH}</code>
              </p>
              {button("gpt:path", "Copy", CHATGPT_PATH)}
            </li>
            {url && (
              <li>
                <p>
                  One more: key <b>TODONE_URL</b>, value<code>{url}</code>
                </p>
                {button("gpt:url", "Copy", url)}
              </li>
            )}
            <li>
              <p>Save, then start a new chat.</p>
            </li>
          </>
        ) : command ? (
          <>
            <li>
              <p>
                {app === "Claude Code" ? "In Claude Code, run:" : "In a terminal, run:"} <code>{command}</code>
              </p>
              {button(`${app}:cmd`, "Copy", command)}
            </li>
            <li>
              <p>When it asks for your todone code, paste it.</p>
              {button("code", "Copy your code", code?.code)}
            </li>
          </>
        ) : (
          <>
            <li>
              <p>Copy your setup. Your code is inside.</p>
              {button(`${app}:setup`, "Copy setup", code ? config(code.code, url) : undefined)}
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

      {/* One code for every app; a new one is for when it may have leaked. */}
      <div className={s.connectCode}>
        <small>{code?.used ? `An AI app last used todone ${when(code.used)}.` : "No AI app has used todone yet."}</small>
        {renewing ? (
          <span className={s.connectRenew}>
            <small>Your AI apps stop working until you paste the new code in.</small>
            <button
              className={s.ghost}
              data-danger
              onClick={async () => {
                setCode(await newCode());
                setCopied("");
                setRenewing(false);
              }}
            >
              Make a new code
            </button>
            <button className={s.ghost} onClick={() => setRenewing(false)}>
              Keep this one
            </button>
          </span>
        ) : (
          <button className={s.ghost} onClick={() => setRenewing(true)}>
            <RefreshCw size={15} strokeWidth={2.5} aria-hidden /> Make a new code
          </button>
        )}
      </div>
    </div>
  );
}
