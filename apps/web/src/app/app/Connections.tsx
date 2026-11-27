"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Lock, Plus, RefreshCw } from "lucide-react";
import { type App, APPS, type Code, DESKTOP_FILE, GEMINI, codex, claudeCode, cursorLink, myCode, newCode, vscodeLink } from "@/lib/connect";
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
  const [app, setApp] = useState<App>("Claude Desktop");
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
        {app === "Codex" ? (
          <>
            <li>
              <p>On your Mac, open Terminal and paste this. Your code is inside.</p>
              {button("codex:cmd", "Copy", code ? codex(code.code, url) : undefined)}
            </li>
            <li>
              <p>Quit Codex (⌘Q), open it again and start a new chat.</p>
            </li>
          </>
        ) : app === "Claude Desktop" ? (
          <>
            <li>
              <p>Download todone for Claude, then open the file. Claude asks to install it.</p>
              <a className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} href={DESKTOP_FILE}>
                <Download size={16} strokeWidth={2.5} aria-hidden /> Download
              </a>
            </li>
            <li>
              <p>When Claude asks for your todone code, paste it.</p>
              {button("code", "Copy your code", code?.code)}
            </li>
          </>
        ) : app === "Claude Code" ? (
          <li>
            <p>
              In a terminal, run this. Your code is in it. <code>claude mcp add todone …</code>
            </p>
            {button("cc:cmd", "Copy command", code ? claudeCode(code.code, url) : undefined)}
          </li>
        ) : app === "Cursor" || app === "VS Code" ? (
          <li>
            <p>{app === "Cursor" ? "Opens Cursor with todone filled in. Press Install." : "Opens VS Code with todone filled in. Press Install, then use Copilot Chat in agent mode."}</p>
            <a
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              href={code ? (app === "Cursor" ? cursorLink : vscodeLink)(code.code, url) : undefined}
              aria-disabled={!code}
            >
              <Plus size={16} strokeWidth={2.75} aria-hidden /> Add to {app}
            </a>
          </li>
        ) : (
          <>
            <li>
              <p>
                In a terminal, run: <code>{GEMINI}</code>
              </p>
              {button("gem:cmd", "Copy", GEMINI)}
            </li>
            <li>
              <p>When it asks for your todone code, paste it.</p>
              {button("code", "Copy your code", code?.code)}
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
