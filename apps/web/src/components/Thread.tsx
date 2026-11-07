"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CornerDownRight, Paperclip, Send, X } from "lucide-react";
import type { FileRef } from "@todone/sdk/tasks";
import { ACCEPT, shareCall, sharedUrl, uploadShared } from "@/lib/files";
import { Media } from "./Media";
import s from "./Thread.module.css";

export type Comment = {
  id: string;
  parent: string | null;
  who: string;
  guest: boolean;
  mine: boolean;
  at: number;
  body: string;
  files: FileRef[];
};

// A shared task's conversation, for its owner (in the task panel) and for guests (on the link's page): comments,
// one level of replies, files with inline previews. Checks for new comments every 10 seconds while open.
// `base`: "/task-shares/<id>" (owner) or "/s/<token>" (guest, with its x-guest header).
export function Thread({
  base,
  headers,
  initial,
  load,
}: {
  base: string;
  headers?: Record<string, string>;
  initial: Comment[];
  load: () => Promise<Comment[]>;
}) {
  const [comments, setComments] = useState(initial);
  const [err, setErr] = useState("");
  const refresh = useCallback(() => load().then(setComments, () => {}), [load]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh]);
  const send = async (body: string, files: string[], parent?: string) => {
    setErr("");
    try {
      await shareCall("POST", `${base}/comments`, { body, files, parent }, headers);
      await refresh();
      return true;
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't send.");
      return false;
    }
  };
  const top = comments.filter((c) => !c.parent);
  return (
    <section className={s.thread} aria-label="Conversation">
      {top.length ? (
        <ol className={s.list}>
          {top.map((c) => (
            <li key={c.id}>
              <Bubble c={c} base={base} headers={headers} />
              {comments
                .filter((r) => r.parent === c.id)
                .map((r) => (
                  <div key={r.id} className={s.reply}>
                    <CornerDownRight size={14} strokeWidth={2.5} aria-hidden />
                    <Bubble c={r} base={base} headers={headers} />
                  </div>
                ))}
              <Composer base={base} headers={headers} onSend={(b, f) => send(b, f, c.id)} reply />
            </li>
          ))}
        </ol>
      ) : (
        <p className={s.empty}>No comments yet. Start the conversation.</p>
      )}
      {err && (
        <p className={s.err} role="alert">
          {err}
        </p>
      )}
      <Composer base={base} headers={headers} onSend={(b, f) => send(b, f)} />
    </section>
  );
}

function Bubble({ c, base, headers }: { c: Comment; base: string; headers?: Record<string, string> }) {
  return (
    <article className={s.bubble} data-mine={c.mine || undefined}>
      <header>
        <b>{c.mine ? `${c.who} (you)` : c.who}</b>
        {c.guest && <span className={s.badge}>Guest</span>}
        <time dateTime={new Date(c.at).toISOString()}>
          {new Date(c.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </time>
      </header>
      {c.body && <p>{c.body}</p>}
      {c.files.length > 0 && (
        <div className={s.files}>
          {c.files.map((f) => (
            <Media key={f.id} file={f} load={() => sharedUrl(base, f.id, headers)} />
          ))}
        </div>
      )}
    </article>
  );
}

// Write a comment or a reply, with files (uploaded as soon as they're picked).
function Composer({
  base,
  headers,
  onSend,
  reply,
}: {
  base: string;
  headers?: Record<string, string>;
  onSend: (body: string, files: string[]) => Promise<boolean>;
  reply?: boolean;
}) {
  const [open, setOpen] = useState(!reply);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  if (!open)
    return (
      <button className={s.replyBtn} onClick={() => setOpen(true)}>
        Reply
      </button>
    );
  const attach = async (list: FileList | null) => {
    setErr("");
    for (const f of Array.from(list ?? [])) {
      setBusy((n) => n + 1);
      try {
        const ref = await uploadShared(base, f, headers);
        setFiles((x) => [...x, ref]);
      } catch (x) {
        setErr(x instanceof Error ? x.message : "Couldn't upload that.");
      }
      setBusy((n) => n - 1);
    }
  };
  return (
    <form
      className={s.composer}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || (!text.trim() && !files.length)) return;
        if (await onSend(text.trim(), files.map((f) => f.id))) {
          setText("");
          setFiles([]);
          if (reply) setOpen(false);
        }
      }}
    >
      {files.length > 0 && (
        <ul className={s.pending}>
          {files.map((f) => (
            <li key={f.id}>
              {f.name}
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>
                <X size={12} strokeWidth={3} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={s.row}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={reply ? "Write a reply" : "Write a comment"}
          aria-label={reply ? "Reply" : "Comment"}
          maxLength={4000}
          rows={reply ? 1 : 2}
          autoFocus={reply}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => attach(e.target.files)} />
        <button type="button" className={s.icon} onClick={() => input.current?.click()} aria-label="Attach files">
          <Paperclip size={16} strokeWidth={2.5} />
        </button>
        <button className={s.icon} disabled={!!busy} aria-label="Send">
          <Send size={16} strokeWidth={2.5} />
        </button>
      </div>
      {busy > 0 && <p className={s.note}>Uploading…</p>}
      {err && (
        <p className={s.err} role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
