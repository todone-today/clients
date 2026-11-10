"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  Send,
  Copy,
  Lock,
  LockOpen,
  Paperclip,
  RefreshCw,
  Share2,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import {
  EFFORTS,
  type FileRef,
  type Task,
  fmtMinutes,
  parseMinutes,
  todayISO,
} from "@todone/sdk/tasks";
import { Media } from "@/components/Media";
import { Note } from "@/components/Note";
import { Select } from "@/components/Select";
import { type Comment, Thread } from "@/components/Thread";
import {
  ACCEPT,
  deletePrivate,
  openPrivate,
  sharedUrl,
  uploadPrivate,
  uploadShared,
} from "@/lib/files";
import {
  createShare,
  revokeShare,
  rotateShare,
  setShareFiles,
  shareView,
  workspaceKey,
} from "./actions";
import s from "./app.module.css";
import { markSeen } from "./unread";
import { Focus } from "./Focus";
import { useReminders } from "@/lib/remind";
import { useGoalItems } from "./goalStore";
import { type Goal } from "@todone/sdk/goals";
import { authClient } from "@/lib/auth-client";

const REPEATS = [
  "every day",
  "every weekday",
  "every weekend",
  "every week",
  "every month",
  "every year",
];

// Everything about one task, on a sticker in the middle of the screen: fields, description, attachments, and (when shared by link)
// the conversation and sharing controls. Private tasks stay end-to-end encrypted, attachments included. Sharing
// switches that off for this one task, only after the owner reads what that means and says "I Understand".
export function TaskPanel({
  task,
  top,
  fill,
  edit,
  onTick,
  onDelete,
  onClose,
}: {
  task: Task;
  top: boolean;
  fill?: string;
  edit: (f: (t: Task) => Task | null) => void;
  onTick: () => void; // done/undone the same way a card's box does (repeats, XP)
  onDelete: () => void;
  onClose: () => void;
}) {
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [asking, setAsking] = useState(false);
  const [focusing, setFocusing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const shared = !!task.share;
  const stopping = useStopSharing(task, edit);
  const goals = useGoalItems().items.filter((i): i is Goal => i.t === "goal");
  const goal = goals.find((g) => g.id === task.goal);
  const reminders = useReminders();

  useEffect(() => {
    const esc = (e: KeyboardEvent) =>
      e.key === "Escape" && !asking && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [asking, onClose]);

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    setErr("");
    try {
      await work();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "That didn't work.");
    }
    setBusy("");
  };

  // Private attachments: encrypted here, then uploaded.
  const attach = (list: FileList | null) =>
    run("Uploading…", async () => {
      const key = await workspaceKey();
      for (const f of Array.from(list ?? [])) {
        const ref = await uploadPrivate(f, key);
        edit((t) => ({ ...t, files: [...(t.files ?? []), ref] }));
      }
    });
  const removeFile = (f: FileRef) => {
    edit((t) => ({
      ...t,
      files: (t.files ?? []).filter((x) => x.id !== f.id),
    }));
    deletePrivate(f.id);
  };

  // Share: a readable copy goes to the server; private attachments go with it, readable (guests can't decrypt).
  const share = () =>
    run("Sharing…", async () => {
      const { id } = await createShare(task);
      try {
        const files = task.files ?? [];
        if (files.length) {
          const key = await workspaceKey();
          const ids: string[] = [];
          for (const f of files) {
            const blob = await openPrivate(f, key);
            ids.push(
              (
                await uploadShared(
                  `/task-shares/${id}`,
                  new File([blob], f.name, { type: f.type }),
                )
              ).id,
            );
          }
          await setShareFiles(id, task, ids);
          for (const f of files) deletePrivate(f.id);
        }
      } catch (x) {
        await revokeShare(id).catch(() => {});
        throw x;
      }
      edit((t) => ({ ...t, share: id, files: undefined }));
    });

  return (
    <div
      className={s.panelBack}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${task.title}`}
        style={{ "--fill": fill ?? "var(--butter)" } as React.CSSProperties}
      >
        <header className={s.panelHead}>
          <button
            className={`${s.check} ${s.panelDone}`}
            role="checkbox"
            aria-checked={task.done}
            aria-label="Done"
            title={task.done ? "Done: click to reopen" : "Mark done"}
            onClick={onTick}
          >
            {task.done && <Check size={18} strokeWidth={3.5} />}
          </button>
          <input
            key={task.id + task.title}
            className={s.panelTitle}
            aria-label="Task name"
            defaultValue={task.title}
            maxLength={500}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== task.title) edit((t) => ({ ...t, title: v }));
            }}
          />
          <button className={s.panelClose} onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2.75} />
          </button>
        </header>

        <p className={s.privacyLine} data-shared={shared || undefined}>
          {shared ? (
            <>
              <LockOpen size={14} strokeWidth={2.5} aria-hidden /> Shared by
              link · not end-to-end encrypted
            </>
          ) : (
            <>
              <Lock size={14} strokeWidth={2.5} aria-hidden /> End-to-end
              encrypted
            </>
          )}
        </p>

        <div className={s.panelFields}>
          <label>
            <span>Day</span>
            <input
              type="date"
              value={task.due ?? ""}
              onChange={(e) =>
                edit((t) => ({
                  ...t,
                  due: e.target.value || undefined,
                  ...(e.target.value ? {} : { at: undefined }),
                }))
              }
            />
          </label>
          <label>
            <span>Time</span>
            <input
              type="time"
              step={900}
              disabled={!task.due}
              value={task.at ?? ""}
              onChange={(e) =>
                edit((t) => ({ ...t, at: e.target.value || undefined }))
              }
            />
          </label>
          <label>
            <span>How long</span>
            <input
              key={`est${task.est}`}
              defaultValue={task.est ? fmtMinutes(task.est) : ""}
              placeholder="45m"
              onBlur={(e) => {
                const m = e.target.value.trim()
                  ? parseMinutes(e.target.value)
                  : 0;
                if (m !== null && m !== (task.est ?? 0))
                  edit((t) => ({ ...t, est: m || undefined }));
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
          <div className={s.panelField}>
            <span>Effort</span>
            <Select
              className={s.panelSelect}
              label="Effort"
              value={task.effort ?? ""}
              options={[
                { value: "", label: "None" },
                ...EFFORTS.map((e) => ({
                  value: e,
                  label: e.toUpperCase(),
                })),
              ]}
              onChange={(v) =>
                edit((t) => ({
                  ...t,
                  effort: (v || undefined) as Task["effort"],
                }))
              }
            />
          </div>
          <div className={s.panelField}>
            <span>Priority</span>
            <Select
              className={s.panelSelect}
              label="Priority"
              value={String(task.pri ?? "")}
              options={[
                { value: "", label: "None" },
                { value: "1", label: "High" },
                { value: "2", label: "Medium" },
                { value: "3", label: "Low" },
              ]}
              onChange={(v) =>
                edit((t) => ({ ...t, pri: v ? (+v as 1 | 2 | 3) : undefined }))
              }
            />
          </div>
          <div className={s.panelField}>
            <span>Repeat</span>
            <Select
              className={s.panelSelect}
              label="Repeat"
              value={task.rep ?? ""}
              options={[
                { value: "", label: "Never" },
                ...(task.rep && !REPEATS.includes(task.rep)
                  ? [task.rep, ...REPEATS]
                  : REPEATS
                ).map((r) => ({
                  value: r,
                  label: r.replace("every ", "Every "),
                })),
              ]}
              onChange={(v) => edit((t) => ({ ...t, rep: v || undefined }))}
            />
          </div>
          <div className={s.panelField}>
            <span>Goal</span>
            <Select
              className={s.panelSelect}
              label="Goal"
              value={
                task.goal && goals.some((g) => g.id === task.goal)
                  ? task.goal
                  : ""
              }
              options={[
                { value: "", label: "None" },
                ...goals
                  .filter((g) => !g.done || g.id === task.goal)
                  .map((g) => ({ value: g.id, label: g.title })),
              ]}
              onChange={(v) => edit((t) => ({ ...t, goal: v || undefined }))}
            />
          </div>
        </div>
        {goal?.plan && !task.done && task.due && task.due < todayISO() && (
          <p className={s.goalPlan}>
            Your plan for {goal.title}:{" "}
            {goal.obstacle
              ? `if ${goal.obstacle.replace(/^if\s+/i, "")} → `
              : ""}
            {goal.plan}
          </p>
        )}
        {/* The moment a reminder is obviously useful: the task has a time and this device isn't reminding yet. */}
        {task.at &&
          task.due &&
          task.due >= todayISO() &&
          !task.done &&
          reminders.state === "off" && (
            <p className={s.remindAsk}>
              <Bell size={15} strokeWidth={2.5} aria-hidden />
              <span>Want a nudge before {task.at} on this device?</span>
              <button
                className={`btn ${s.claim}`}
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                onClick={reminders.turnOn}
              >
                Remind me
              </button>
            </p>
          )}

        <section className={s.panelSection}>
          <h3>Description</h3>
          {writing ? (
            <textarea
              className={s.panelNote}
              autoFocus
              defaultValue={task.note ?? ""}
              maxLength={20_000}
              placeholder="Details, links, a checklist (- item)… **bold**, _italic_ work."
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (task.note ?? ""))
                  edit((t) => ({ ...t, note: v || undefined }));
                setWriting(false);
              }}
            />
          ) : task.note ? (
            <button
              className={s.panelNoteView}
              onClick={() => setWriting(true)}
              title="Click to edit"
            >
              <Note text={task.note} />
            </button>
          ) : (
            <button
              className={s.panelNoteView}
              data-empty
              onClick={() => setWriting(true)}
            >
              Add details, links or a checklist…
            </button>
          )}
        </section>

        {shared ? (
          <SharedPart task={task} />
        ) : (
          <section className={s.panelSection}>
            <h3>
              Attachments
              <button
                className={s.ghost}
                onClick={() => fileInput.current?.click()}
                disabled={!!busy}
              >
                <Paperclip size={14} strokeWidth={2.5} aria-hidden /> Add
              </button>
            </h3>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => attach(e.target.files)}
            />
            {task.files?.length ? (
              <div className={s.panelFiles}>
                {task.files.map((f) => (
                  <div key={f.id} className={s.panelFile}>
                    <Media
                      file={f}
                      load={async () => openPrivate(f, await workspaceKey())}
                    />
                    <button
                      className={s.panelX}
                      onClick={() => removeFile(f)}
                      aria-label={`Remove ${f.name}`}
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={s.panelHint}>
                Images, videos (up to 50 MB), PDFs. Encrypted before they leave
                this device.
              </p>
            )}
          </section>
        )}

        <Notes task={task} edit={edit} shared={shared} />

        {(busy || err || stopping.busy || stopping.err) && (
          <p
            className={err || stopping.err ? s.err : s.panelHint}
            role={err || stopping.err ? "alert" : "status"}
          >
            {err || stopping.err || busy || stopping.busy}
          </p>
        )}

        <footer className={s.panelFoot}>
          <button
            className={s.edDelete}
            onClick={onDelete}
            title={task.sub.length ? "Deletes its steps too" : undefined}
          >
            <Trash2 size={16} strokeWidth={2.5} aria-hidden /> Delete
          </button>
          {!top && <span className={s.panelHint}>A step of a task.</span>}
          {!task.done && (
            <button
              className={`btn ${s.panelShare} ${s.panelFocus}`}
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              onClick={() => setFocusing(true)}
              title="Full screen, with a timer. The time goes on the task."
            >
              <Timer size={16} strokeWidth={2.5} aria-hidden /> Focus
            </button>
          )}
          {shared ? (
            <button
              className={`btn ${s.panelShare}`}
              style={{ "--fill": "var(--butter)" } as React.CSSProperties}
              onClick={stopping.stop}
              disabled={!!stopping.busy}
              title="The link stops working; the conversation stays here, encrypted"
            >
              <Lock size={16} strokeWidth={2.5} aria-hidden /> Stop sharing
            </button>
          ) : (
            <button
              className={`btn ${s.panelShare}`}
              onClick={() => setAsking(true)}
              disabled={!!busy}
              title="Anyone with the link can see it, comment and add photos. No account needed."
            >
              <Share2 size={16} strokeWidth={2.5} aria-hidden /> Share
            </button>
          )}
        </footer>

        {focusing && (
          <Focus task={task} fill={fill} edit={edit} onTick={onTick} onExit={() => setFocusing(false)} />
        )}
        {asking && (
          <Disclosure
            onCancel={() => setAsking(false)}
            onOk={() => {
              setAsking(false);
              share();
            }}
          />
        )}
      </aside>
    </div>
  );
}

// What sharing means, said plainly, before anything changes. Only "I Understand" goes ahead.
function Disclosure({
  onOk,
  onCancel,
}: {
  onOk: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.disclosure}
      onClose={onCancel}
      aria-labelledby="share-h"
    >
      <h2 id="share-h" className="display">
        This task won&apos;t be end-to-end encrypted
      </h2>
      <ul>
        <li>
          A readable copy of this task (its name, details, steps and
          attachments) and everything added to it goes to todone&apos;s server,
          so the people you share it with can see it.
        </li>
        <li>
          todone and anyone with the link can read it. They can view it, comment
          and upload photos, videos and files, anonymously.
        </li>
        <li>Don&apos;t share anything sensitive or confidential this way.</li>
        <li>
          Your other tasks stay end-to-end encrypted. You can stop sharing at
          any time: the link dies at once.
        </li>
      </ul>
      <div className={s.tools}>
        <button className={s.ghost} onClick={() => ref.current?.close()}>
          Cancel
        </button>
        <button
          className="btn"
          style={{ "--fill": "var(--butter)" } as React.CSSProperties}
          onClick={onOk}
          autoFocus
        >
          I Understand
        </button>
      </div>
    </dialog>
  );
}

// Stop sharing: keep the conversation and media, encrypted, in the task; then the link dies.
function useStopSharing(
  task: Task,
  edit: (f: (t: Task) => Task | null) => void,
) {
  const id = task.share ?? "";
  const base = `/task-shares/${id}`;
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [armed, setArmed] = useState(false);
  const stop = async () => {
    setBusy("Keeping the conversation, encrypted…");
    setErr("");
    try {
      const v = await shareView(id);
      const key = await workspaceKey();
      const kept = new Map<string, FileRef>();
      let lost = 0;
      const keep = async (f: FileRef) => {
        if (kept.has(f.id)) return kept.get(f.id)!;
        try {
          const blob = await (await fetch(await sharedUrl(base, f.id))).blob();
          const ref = await uploadPrivate(
            new File([blob], f.name, { type: f.type }),
            key,
          );
          kept.set(f.id, ref);
          return ref;
        } catch {
          lost++;
          return null;
        }
      };
      const files = (await Promise.all((v.task.files ?? []).map(keep))).filter(
        (f): f is FileRef => !!f,
      );
      const history: NonNullable<Task["history"]> = [];
      for (const c of v.comments) {
        const hf = (await Promise.all(c.files.map(keep))).filter(
          (f): f is FileRef => !!f,
        );
        history.push({
          who: c.who,
          at: c.at,
          text: `${c.parent ? "↳ " : ""}${c.body}`,
          ...(hf.length ? { files: hf } : {}),
        });
      }
      if (lost && !armed) {
        setArmed(true);
        setBusy("");
        setErr(
          `${lost} file${lost === 1 ? "" : "s"} couldn't be kept. Click Stop sharing again to stop anyway.`,
        );
        return;
      }
      await revokeShare(id);
      edit((t) => ({
        ...t,
        share: undefined,
        files: [...(t.files ?? []), ...files],
        history: [...(t.history ?? []), ...history],
      }));
    } catch (x) {
      setErr(
        x instanceof Error ? x.message : "Couldn't stop sharing. Try again.",
      );
    }
    setBusy("");
  };

  return { stop, busy, err };
}

// A shared task: the link, its controls, the shared attachments and the conversation.
function SharedPart({ task }: { task: Task }) {
  const id = task.share!;
  const base = `/task-shares/${id}`;
  const [view, setView] = useState<{
    token: string;
    files: FileRef[];
    comments: Comment[];
  } | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    const v = await shareView(id);
    setView({
      token: v.token,
      files: v.task.files ?? [],
      comments: v.comments,
    });
    markSeen(id, v.comments.filter((c) => c.guest).length);
    return v.comments;
  }, [id]);
  useEffect(() => {
    Promise.resolve()
      .then(load)
      .catch((x) =>
        setErr(
          x instanceof Error ? x.message : "Couldn't load the shared task.",
        ),
      );
  }, [load]);
  const link = view ? `${location.origin}/t/${view.token}` : "";

  return (
    <>
      <section className={s.panelSection}>
        <h3>Shared by link</h3>
        <p className={s.panelHint}>
          Anyone with the link can see this task, comment and add photos. No
          account needed.
        </p>
        <div className={s.tools}>
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            disabled={!view}
            onClick={async () => {
              await navigator.clipboard.writeText(link).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy size={14} strokeWidth={2.5} aria-hidden />{" "}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            className={s.ghost}
            disabled={!view}
            onClick={async () => {
              const r = await rotateShare(id).catch(() => null);
              if (r) setView((v) => (v ? { ...v, token: r.token } : v));
            }}
            title="The current link stops working"
          >
            <RefreshCw size={14} strokeWidth={2.5} aria-hidden /> New link
          </button>
        </div>
        {err && (
          <p className={s.err} role="alert">
            {err}
          </p>
        )}
      </section>
      {view && view.files.length > 0 && (
        <section className={s.panelSection}>
          <h3>Attachments</h3>
          <div className={s.panelFiles}>
            {view.files.map((f) => (
              <Media key={f.id} file={f} load={() => sharedUrl(base, f.id)} />
            ))}
          </div>
        </section>
      )}
      {view && (
        <section className={s.panelSection}>
          <h3>Conversation</h3>
          <Thread base={base} initial={view.comments} load={load} />
        </section>
      )}
    </>
  );
}

// Notes on a task: always there, end-to-end encrypted with the rest of the list (files too). A shared task's public
// conversation is separate; when sharing stops, it's kept here.
function Notes({
  task,
  edit,
  shared,
}: {
  task: Task;
  edit: (f: (t: Task) => Task | null) => void;
  shared: boolean;
}) {
  const me = authClient.useSession().data?.user.name || "You";
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const notes = task.history ?? [];
  const attach = async (list: FileList | null) => {
    setErr("");
    const key = await workspaceKey();
    for (const f of Array.from(list ?? [])) {
      setBusy((n) => n + 1);
      try {
        const ref = await uploadPrivate(f, key);
        setFiles((x) => [...x, ref]);
      } catch (x) {
        setErr(x instanceof Error ? x.message : "Couldn't upload that.");
      }
      setBusy((n) => n - 1);
    }
  };
  const add = () => {
    const body = text.trim();
    if (busy || (!body && !files.length)) return;
    const note = {
      who: me,
      at: Date.now(),
      text: body,
      ...(files.length ? { files } : {}),
    };
    edit((t) => ({ ...t, history: [...(t.history ?? []), note].slice(-500) }));
    setText("");
    setFiles([]);
  };
  return (
    <section className={s.panelSection}>
      <h3>{shared ? "Private notes" : "Notes"}</h3>
      {shared && (
        <p className={s.panelHint}>
          Only you and your team see these; they stay end-to-end encrypted.
        </p>
      )}
      {notes.length > 0 && (
        <ol className={s.kept}>
          {notes.map((h, i) => (
            <li
              key={i}
              data-mine={h.who === me || undefined}
              style={
                {
                  "--fill":
                    h.who === me
                      ? "var(--lime)"
                      : h.who === "Anonymous" || /^Guest \d/.test(h.who)
                        ? "var(--pink)"
                        : "var(--cyan)",
                } as React.CSSProperties
              }
            >
              <header className={s.keptHead}>
                <b>{h.who}</b>
                <time>
                  {new Date(h.at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </header>
              {h.text && <p>{h.text}</p>}
              {h.files?.map((f) => (
                <Media
                  key={f.id}
                  file={f}
                  load={async () => openPrivate(f, await workspaceKey())}
                />
              ))}
            </li>
          ))}
        </ol>
      )}
      <form
        className={s.noteForm}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        {files.length > 0 && (
          <ul className={s.noteFiles}>
            {files.map((f) => (
              <li key={f.id}>
                {f.name}
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => {
                    setFiles((x) => x.filter((y) => y.id !== f.id));
                    deletePrivate(f.id);
                  }}
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={s.noteRow}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note"
            aria-label="Note"
            maxLength={4000}
            rows={2}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                add();
              }
            }}
          />
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => attach(e.target.files)}
          />
          <button
            type="button"
            className={s.noteIcon}
            onClick={() => input.current?.click()}
            aria-label="Attach files"
          >
            <Paperclip size={16} strokeWidth={2.5} />
          </button>
          <button
            className={`${s.noteIcon} ${s.noteSend}`}
            disabled={!!busy}
            aria-label="Add note"
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
        {busy > 0 && <p className={s.panelHint}>Uploading…</p>}
        {err && (
          <p className={s.err} role="alert">
            {err}
          </p>
        )}
      </form>
    </section>
  );
}
