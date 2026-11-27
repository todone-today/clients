"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Dumbbell,
  Flag,
  Repeat,
  Send,
  Target,
  Download,
  Lock,
  LockOpen,
  Paperclip,
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
import {
  type Extra,
  fileName,
  save,
  taskHtml,
  taskMarkdown,
  taskText,
} from "@/lib/export";
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
  setShareFiles,
  shareView,
  workspaceKey,
} from "./actions";
import { needsPlan, usePlan } from "./PlanPrompt";
import s from "./app.module.css";
import { markSeen } from "./unread";
import { Focus } from "./Focus";
import { SITE } from "@/lib/urls";
import { useGoalItems } from "./goalStore";
import { useLists } from "@/lib/store";
import { type Goal } from "@todone/sdk/goals";
import { authClient } from "@/lib/auth-client";
import { draft, keepDraft } from "@/lib/drafts";

const REPEATS = [
  "every day",
  "every weekday",
  "every weekend",
  "every week",
  "every month",
  "every year",
];

// Files dropped on the task panel, handed to its notes.
const NOTE_FILES = "todone:note-files";

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
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [asking, setAsking] = useState(false);
  const { gated } = usePlan();
  const [focusing, setFocusing] = useState(false);
  const shared = !!task.share;
  const stopping = useStopSharing(task, edit);
  // The share link's token: from sharing just now, or read back by the shared part below. "Copied" shows a moment.
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);
  const goals = useGoalItems().items.filter((i): i is Goal => i.t === "goal");
  const goal = goals.find((g) => g.id === task.goal);

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
      const { id, token } = await createShare(task);
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
      // Copy straight away. Some browsers refuse after a wait; then the Copy link button is right there.
      const copied = await navigator.clipboard
        .writeText(`${SITE}/t/${token}`)
        .then(
          () => true,
          () => false,
        );
      setShareToken(token);
      setCopied(copied);
    });

  return (
    <div
      className={s.panelBack}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={s.panelFrame}>
        {/* Encrypted or not, as a lock (or an open lock) on a little sticker on the task's corner. */}
        <span
          className={s.privacyTag}
          data-shared={shared || undefined}
          role="img"
          aria-label={shared ? "Shared, not encrypted" : "End-to-end encrypted"}
          title={shared ? "Shared, not encrypted" : "End-to-end encrypted"}
        >
          {shared ? <LockOpen size={16} strokeWidth={2.75} aria-hidden /> : <Lock size={16} strokeWidth={2.75} aria-hidden />}
        </span>
      <aside
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${task.title}`}
        style={{ "--fill": fill ?? "var(--butter)" } as React.CSSProperties}
        // Files dropped anywhere on the task attach to it (dropped on Notes, they go with the note instead).
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          dispatchEvent(
            new CustomEvent<File[]>(NOTE_FILES, {
              detail: Array.from(e.dataTransfer.files),
            }),
          );
        }}
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
          <div className={s.panelActions}>
            {!task.done && (
              <button
                className={s.panelClose}
                onClick={() => setFocusing(true)}
                aria-label="Focus"
                data-tip="Focus"
              >
                <Timer size={19} strokeWidth={2.5} />
              </button>
            )}
            {shared ? (
              <>
                {/* Shared: the link, copied with a tap (sharing again after stopping makes a new one). */}
                <button
                  className={s.panelClose}
                  onClick={async () => {
                    if (!shareToken) return;
                    await navigator.clipboard
                      .writeText(`${SITE}/t/${shareToken}`)
                      .catch(() => {});
                    setCopied(true);
                  }}
                  disabled={!shareToken}
                  aria-label={copied ? "Link copied" : "Copy link"}
                  data-tip={copied ? "Link copied" : "Copy link"}
                >
                  {copied ? (
                    <Check size={19} strokeWidth={3} />
                  ) : (
                    <Share2 size={19} strokeWidth={2.5} />
                  )}
                </button>
                <button
                  className={s.panelClose}
                  onClick={stopping.stop}
                  disabled={!!stopping.busy}
                  aria-label="Stop sharing"
                  data-tip="Stop sharing"
                >
                  <Lock size={19} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              <button
                className={s.panelClose}
                onClick={() =>
                  gated
                    ? needsPlan("Sharing comes with Plus.")
                    : setAsking(true)
                }
                disabled={!!busy}
                aria-label={gated ? "Share (needs Plus)" : "Share"}
                data-tip={gated ? "Share (needs Plus)" : "Share"}
                data-label="Share"
              >
                <Share2 size={19} strokeWidth={2.5} />
              </button>
            )}
            <SaveAs task={task} goal={goal?.title} />
            <button
              className={`${s.panelClose} ${s.panelDelete}`}
              onClick={onDelete}
              aria-label="Delete"
              data-tip="Delete"
            >
              <Trash2 size={19} strokeWidth={2.5} />
            </button>
            <button
              className={s.panelClose}
              onClick={onClose}
              aria-label="Close"
              data-tip="Close"
              data-tip-end
            >
              <X size={20} strokeWidth={2.75} />
            </button>
          </div>
        </header>

        {!top && <p className={s.panelHint}>A step of a task.</p>}

        {/* Day, time, how long, effort, priority, repeat, goal: compact stickers, each marked by its icon. */}
        <div className={s.panelFields}>
          <label
            data-empty={!task.due || undefined}
            style={{ "--tone": "var(--butter)" } as React.CSSProperties}
          >
            <span data-tip="Day">
              <CalendarDays size={15} strokeWidth={2.5} aria-hidden />
              <i className="sr-only">Day</i>
            </span>
            {!task.due && <b aria-hidden>Add a day</b>}
            <input
              type="date"
              value={task.due ?? ""}
              onChange={(e) => edit((t) => ({ ...t, due: e.target.value || undefined }))}
            />
          </label>
          <label
            data-empty={!task.est || undefined}
            style={{ "--tone": "var(--cyan)" } as React.CSSProperties}
          >
            <span data-tip="How long">
              <Timer size={15} strokeWidth={2.5} aria-hidden />
              <i className="sr-only">How long</i>
            </span>
            <input
              key={`est${task.est}`}
              defaultValue={task.est ? fmtMinutes(task.est) : ""}
              placeholder="How long?"
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
          <div
            className={s.panelField}
            style={{ "--tone": "var(--orange)" } as React.CSSProperties}
          >
            <span data-tip="Effort">
              <Dumbbell size={15} strokeWidth={2.5} aria-hidden />
              <i className="sr-only">Effort</i>
            </span>
            <Select
              className={s.panelSelect}
              label="Effort"
              placeholder="Effort"
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
          <div
            className={s.panelField}
            style={{ "--tone": "var(--pink)" } as React.CSSProperties}
          >
            <span data-tip="Priority">
              <Flag size={15} strokeWidth={2.5} aria-hidden />
              <i className="sr-only">Priority</i>
            </span>
            <Select
              className={s.panelSelect}
              label="Priority"
              placeholder="Priority"
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
          <div
            className={s.panelField}
            style={{ "--tone": "var(--lime)" } as React.CSSProperties}
          >
            <span data-tip="Repeat">
              <Repeat size={15} strokeWidth={2.5} aria-hidden />
              <i className="sr-only">Repeat</i>
            </span>
            <Select
              className={s.panelSelect}
              label="Repeat"
              placeholder="Repeat"
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
          <div
            className={s.panelField}
            style={{ "--tone": "var(--peri)" } as React.CSSProperties}
          >
            <span data-tip="Goal">
              <Target size={15} strokeWidth={2.5} aria-hidden />
              <i className="sr-only">Goal</i>
            </span>
            <Select
              className={s.panelSelect}
              label="Goal"
              placeholder="Goal"
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
        {shared ? (
          <SharedPart task={task} onToken={setShareToken} />
        ) : (
          // Files go with notes now; a task attached to before that still shows its files, to open or remove.
          !!task.files?.length && (
            <section className={s.panelSection}>
              <h3>Attachments</h3>
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
            </section>
          )
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

        {focusing && (
          <Focus
            task={task}
            fill={fill}
            edit={edit}
            onTick={onTick}
            onExit={() => setFocusing(false)}
            notes={<Notes task={task} edit={edit} shared={shared} />}
          />
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
function SharedPart({
  task,
  onToken,
}: {
  task: Task;
  onToken: (token: string) => void;
}) {
  const id = task.share!;
  const base = `/task-shares/${id}`;
  const [view, setView] = useState<{
    token: string;
    files: FileRef[];
    comments: Comment[];
  } | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const v = await shareView(id);
    setView({
      token: v.token,
      files: v.task.files ?? [],
      comments: v.comments,
    });
    onToken(v.token);
    markSeen(id, v.comments.filter((c) => c.guest).length);
    return v.comments;
  }, [id, onToken]);
  const retry = useCallback(() => {
    setErr("");
    load().catch((x) =>
      setErr(x instanceof Error ? x.message : "Couldn't load the shared task."),
    );
  }, [load]);
  useEffect(() => {
    Promise.resolve().then(retry);
  }, [retry]);

  return (
    <>
      {err && (
        <p className={s.err} role="alert">
          {err}{" "}
          <button className={s.ghost} onClick={retry}>
            Try again
          </button>
        </p>
      )}
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
  // What's typed survives closing the task by accident (lib/drafts.ts).
  const [text, setTextNow] = useState(
    () => draft<string>(`note:${task.id}`) ?? "",
  );
  const setText = (v: string) => (
    setTextNow(v),
    keepDraft(`note:${task.id}`, v)
  );
  const [files, setFiles] = useState<FileRef[]>([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const notes = task.history ?? [];
  const attach = async (list: FileList | File[] | null) => {
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
  // Files dropped anywhere on the task come here, to go with the next note.
  useEffect(() => {
    const on = (e: Event) => attach((e as CustomEvent<File[]>).detail);
    addEventListener(NOTE_FILES, on);
    return () => removeEventListener(NOTE_FILES, on);
  });
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
      {/* The box to add one sits on top; the notes follow, newest first. */}
      <form
        className={s.noteForm}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          e.stopPropagation();
          attach(e.dataTransfer.files);
        }}
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
            onPaste={(e) => {
              // Pasted screenshots or copied files attach; plain text pastes as usual.
              if (!e.clipboardData.files.length) return;
              e.preventDefault();
              attach(e.clipboardData.files);
            }}
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
      {notes.length > 0 && (
        <ol className={s.kept}>
          {[...notes].reverse().map((h, i) => (
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
    </section>
  );
}

// Download: a menu of formats, each made on this device from the decrypted task (nothing goes to the server).
const FORMATS = [
  [
    "md",
    "Markdown",
    "For Obsidian, notes apps and importing back",
    "text/markdown",
    taskMarkdown,
  ],
  [
    "html",
    "Web page",
    "Opens in any browser, ready to print",
    "text/html",
    taskHtml,
  ],
  ["txt", "Plain text", "Just the words", "text/plain", taskText],
  [
    "json",
    "JSON",
    "Everything, for scripts and backups",
    "application/json",
    (t: Task, _goal: string | undefined, x: Extra) =>
      JSON.stringify(
        x.talk ? { ...t, files: x.files ?? t.files, conversation: x.talk } : t,
        null,
        2,
      ),
  ],
] as const;

function SaveAs({ task, goal }: { task: Task; goal?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const { lists } = useLists();
  // Everything the panel shows goes in: the list, a link back to the task, and for a shared task its conversation,
  // attachments and public page (fetched now; they live on the server). The web page also carries the files.
  const download = async ([ext, , , type, make]: (typeof FORMATS)[number]) => {
    setErr("");
    setBusy(ext);
    try {
      const x: Extra = {
        list: lists?.find(
          (l) =>
            !l.kind &&
            l.tasks.some(
              (t) => t.id === task.id || t.sub.some((u) => u.id === task.id),
            ),
        )?.name,
        open: `${location.origin}/app?task=${task.id}`,
        site: SITE,
      };
      if (task.share) {
        const v = await shareView(task.share);
        x.page = `${SITE}/t/${v.token}`;
        x.files = v.task.files ?? task.files;
        x.talk = v.comments.map((c) => ({
          who: c.who,
          at: c.at,
          text: c.body,
          ...(c.files.length ? { files: c.files } : {}),
        }));
      }
      if (ext === "html")
        x.data = await carry(
          [
            ...(x.files ?? task.files ?? []),
            ...[...(task.history ?? []), ...(x.talk ?? [])].flatMap(
              (n) => n.files ?? [],
            ),
          ],
          task.share ? `/task-shares/${task.share}` : null,
        );
      save(fileName(task.title, ext), type, make(task, goal, x));
      setOpen(false);
    } catch {
      setErr(
        task.share
          ? "Couldn't get the conversation. Check the connection and try again."
          : "That didn't work. Try again.",
      );
    }
    setBusy("");
  };
  const items = () => [
    ...(wrap.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ??
      []),
  ];
  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const away = (e: PointerEvent) =>
      !wrap.current?.contains(e.target as Node) && setOpen(false);
    addEventListener("pointerdown", away);
    return () => removeEventListener("pointerdown", away);
  }, [open]);
  return (
    <div
      ref={wrap}
      className={s.saveAs}
      onKeyDown={(e) => {
        if (!open) return;
        const list = items();
        const i = list.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === "Escape") {
          e.stopPropagation(); // closes the menu, not the panel
          setOpen(false);
          wrap.current?.querySelector<HTMLButtonElement>("button")?.focus();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          list[
            (i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length
          ]?.focus();
        } else if (e.key === "Tab") setOpen(false);
      }}
    >
      <button
        className={s.panelClose}
        aria-label="Download"
        data-tip={open ? undefined : "Download"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Download size={19} strokeWidth={2.75} />
      </button>
      {open && (
        <div className={s.saveMenu} role="menu" aria-label="Download as">
          {FORMATS.map((f) => {
            const [ext, name, hint] = f;
            return (
              <button
                key={ext}
                role="menuitem"
                disabled={!!busy}
                onClick={() => download(f)}
              >
                <b>{name}</b>
                <i>.{ext}</i>
                <small>
                  {busy === ext ? "Getting the conversation…" : hint}
                </small>
              </button>
            );
          })}
          {err && (
            <p className={s.saveErr} role="alert">
              {err}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// The files a web page download carries inside it, as data: URLs: private ones decrypted here, shared ones fetched.
// Up to 20 MB each and 60 MB in all; the rest are listed with where they open. One that fails is listed the same way.
const EACH = 20e6;
const ALL = 60e6;
async function carry(files: FileRef[], base: string | null) {
  const out = new Map<string, string>();
  let total = 0;
  const key = files.some((f) => f.enc) ? await workspaceKey() : null;
  for (const f of files) {
    if (out.has(f.id) || f.size > EACH || total + f.size > ALL) continue;
    try {
      const blob = f.enc
        ? await openPrivate(f, key!)
        : base
          ? await (await fetch(await sharedUrl(base, f.id))).blob()
          : null;
      if (!blob) continue;
      out.set(
        f.id,
        await new Promise<string>((ok, no) => {
          const r = new FileReader();
          r.onload = () => ok(r.result as string);
          r.onerror = () => no(r.error);
          r.readAsDataURL(new Blob([blob], { type: f.type }));
        }),
      );
      total += f.size;
    } catch {
      // listed without its contents
    }
  }
  return out;
}
