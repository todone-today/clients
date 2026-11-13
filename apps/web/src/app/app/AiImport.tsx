"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Copy, Mic, Sparkles, Square, Upload, X } from "lucide-react";
import { api, PLAN_EVENT } from "@/lib/api";
import { type Draft, applyChanges, commit, fromChanges, fromPlan, placed } from "@/lib/askBoard";
import { authClient } from "@/lib/auth-client";
import { toBin, update, useLists } from "@/lib/store";
import { type GoalItem } from "@todone/sdk/goals";
import { numbered, parsePlan, planPrompt, type OpenList, type PlanGoal } from "@todone/sdk/plan";
import { type List, type Task, todayISO, uid } from "@todone/sdk/tasks";
import { changeGoals, useGoalItems } from "./goalStore";
import { ASK_EVENT, type Ask } from "./AskBar";
import { AskBoard } from "./AskBoard";
import s from "./app.module.css";

const newId = () => uid() + uid();
const weekday = () => new Date().toLocaleDateString("en", { weekday: "long" });
const MAX_SECONDS = 300;

type Phase = "idle" | "recording" | "sending" | "queued" | "transcribing" | "thinking";
const SAYS: Record<Phase, string> = {
  idle: "",
  recording: "Listening…",
  sending: "Sending…",
  queued: "Waiting for the transcriber…",
  transcribing: "Turning your voice into words…",
  thinking: "Making your lists…",
};

// Ask todone: type or say what you need, and the AI suggests tasks in your lists, plus goals and rewards, to review
// before anything is added. Or use your own AI: copy a prompt, paste its answer. A .md file works too.
// `ai`: this server can answer itself (not in the demo, and only with a Gemini key set up).
export function AiImport({
  lists,
  current,
  ai,
  onAdd,
  onAppend,
}: {
  lists: List[];
  current: string | null;
  ai: boolean;
  onAdd: (name: string, tasks: Task[]) => void;
  onAppend: (listId: string, tasks: Task[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const { lists: everything } = useLists();
  const { items } = useGoalItems();
  const [tab, setTab] = useState<"ask" | "paste">("ask");
  const [words, setWords] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [secs, setSecs] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number | null } | null>(null);
  const [answer, setAnswer] = useState(""); // a pasted answer (Use your own AI)
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [made, setMade] = useState<string[]>([]); // new lists made by hand on the board
  const [said, setSaid] = useState(""); // everything asked so far, so answers to its questions have the context
  const [qs, setQs] = useState<string[]>([]); // what the AI asked back
  const [replies, setReplies] = useState<string[]>([]);
  const [needs, setNeeds] = useState<List[]>([]); // lists the AI asked to read, waiting for a yes
  const [shared, setShared] = useState<{ open: OpenList[]; refs: Record<number, string> } | null>(null); // agreed to
  const me = authClient.useSession().data?.user.id;
  const [copied, setCopied] = useState(false);
  const [today, setToday] = useState(""); // read when the dialog opens, not while the page renders
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const job = useRef<string | null>(null);
  const asking = ai && tab === "ask";

  const context = (open = shared?.open) => ({
    today: todayISO(),
    weekday: weekday(),
    lists: lists.map((l) => l.name),
    goals: items.flatMap((i) => (i.t === "goal" ? [i.title] : [])),
    rewards: items.flatMap((i) => (i.t === "reward" ? [i.title] : [])),
    ...(open ? { open } : {}),
  });
  const found = drafts.length > 0 || qs.length > 0;
  const ready = placed(drafts);
  const suggest = (md: string, add: boolean, refs = shared?.refs) => {
    // Goals get their real "created" when added; tasks the AI left without a list go with the open list.
    const plan = parsePlan(md, newId, 0);
    // It needs to read lists first: ask (see Consent), unless they're already shared.
    const want = lists.filter((l) => plan.needs.some((n) => n.toLowerCase() === l.name.toLowerCase()));
    if (want.length && !shared) setNeeds(want);
    else if (plan.needs.length && !want.length) setErr(`Couldn't find a list called “${plan.needs[0]}”.`);
    const more = [
      ...fromPlan(plan, lists).map((d) =>
        d.kind === "task" && d.ai === null && current ? { ...d, ai: current, place: current } : d,
      ),
      ...(refs ? fromChanges(plan.changes, refs, everything ?? []) : []),
    ];
    setDrafts((ds) => (add ? [...ds, ...more] : more));
    setQs(plan.questions);
    setReplies([]);
  };

  const reset = () => {
    const r = rec.current;
    rec.current = null; // its onstop sees it was cancelled
    r?.stream.getTracks().forEach((t) => t.stop());
    if (r?.state === "recording") r.stop();
    if (job.current) api("DELETE", `/ai/jobs/${job.current}`).catch(() => {});
    job.current = null;
    setAnswer("");
    setWords("");
    setTranscript("");
    setDrafts([]);
    setMade([]);
    setSaid("");
    setQs([]);
    setReplies([]);
    setNeeds([]);
    setShared(null);
    setPhase("idle");
    setErr("");
  };
  const close = () => {
    dialog.current?.close();
    reset();
  };

  // Lists you have get their tasks added; new ones are made. Goals go with a list you already have when the AI named
  // one. Ids are fresh. Whichever list is added last is the one that opens.
  const save = () => {
    const { groups, goals, rewards, changes } = commit(drafts);
    // Changes to tasks you have, list by list: done, edited, deleted (to the bin), moved (to a list by name).
    for (const listId of new Set(changes.map((d) => d.place))) {
      const list = (everything ?? []).find((l) => l.id === listId);
      if (!list) continue;
      const mine = changes.filter((d) => d.place === listId);
      const r = applyChanges(list.tasks, mine.map((d) => d.change), mine.map((d) => d.task.id), todayISO(), me);
      update(listId, (l) => ({ ...l, tasks: r.tasks }));
      toBin(r.binned, list);
      for (const m of r.moved) {
        const to = lists.find((l) => l.name.toLowerCase() === m.to.toLowerCase());
        if (to) onAppend(to.id, [m.task]);
        else onAdd(m.to, [m.task]);
      }
    }
    for (const g of groups) {
      if (g.listId) onAppend(g.listId, g.tasks);
      else if (g.name) onAdd(g.name, g.tasks);
    }
    const linked = (g: PlanGoal): GoalItem => {
      const { listName, ...goal } = g;
      const list = listName && lists.find((l) => l.name.toLowerCase() === listName.toLowerCase())?.id;
      return { ...goal, id: newId(), created: Date.now(), ...(list ? { list } : {}) };
    };
    const extra: GoalItem[] = [...goals.map(linked), ...rewards.map((r) => ({ ...r, id: newId() }))];
    if (extra.length) changeGoals(everything, (xs) => [...xs, ...extra]);
    close();
  };

  // ---- Ask todone ----
  const failed = (e: unknown) => {
    setPhase("idle");
    setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
  };
  // Each answer adds to the board, so a few asks build one plan; answering its questions makes the plan again.
  const answered = (r: { result: string; used?: number; limit?: number | null }, add = true) => {
    suggest(r.result, add);
    setWords("");
    setPhase("idle");
    if (r.used !== undefined) setUsage({ used: r.used, limit: r.limit ?? null });
  };
  const askText = async (text = words, add = true, open = shared) => {
    if (!text.trim()) return;
    setErr("");
    setPhase("thinking");
    if (add) setSaid((x) => (x ? `${x}\n${text}` : text));
    try {
      const r = await api<{ result: string; used: number; limit: number }>("POST", "/ai/text", { text, context: context(open?.open) });
      suggest(r.result, add, open?.refs);
      setWords("");
      setPhase("idle");
      setUsage({ used: r.used, limit: r.limit ?? null });
    } catch (e) {
      failed(e);
    }
  };
  type JobView = { status: Phase | "ready" | "failed"; transcript?: string; result?: string; error?: string; used?: number; limit?: number };
  const poll = async (id: string) => {
    for (;;) {
      if (job.current !== id) return; // closed, or started again
      const j = await api<JobView>("GET", `/ai/jobs/${id}`);
      if (j.transcript) setTranscript(j.transcript);
      if (j.status === "ready" && j.result) {
        const heard = j.transcript ?? "";
        setSaid((x) => (x ? `${x}\n${heard}` : heard));
        return answered({ result: j.result, used: j.used, limit: j.limit });
      }
      if (j.status === "failed") throw new Error(j.error ?? "That didn't work. Try again.");
      setPhase(j.status as Phase);
      await new Promise((r) => setTimeout(r, 1500));
    }
  };
  const send = async (blob: Blob) => {
    setPhase("sending");
    try {
      const r = await fetch("/api/ai/voice", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": blob.type || "audio/webm", "x-context": encodeURIComponent(JSON.stringify(context())) },
        body: blob,
      });
      const data = await r.json().catch(() => null);
      if (r.status === 402) dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: data?.error }));
      if (!r.ok) throw new Error(data?.error ?? "Couldn't send the recording.");
      job.current = data.id;
      await poll(data.id);
    } catch (e) {
      failed(e);
    }
  };
  const record = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24_000 });
      const parts: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (rec.current !== r) return; // cancelled
        rec.current = null;
        send(new Blob(parts, { type: (r.mimeType || "audio/webm").split(";")[0] }));
      };
      rec.current = r;
      r.start(1000);
      setSecs(0);
      setPhase("recording");
    } catch {
      setErr("No microphone. Allow it for this site, or type instead.");
    }
  };
  const stop = () => {
    if (rec.current?.state === "recording") rec.current.stop();
  };
  // The recording clock, and its 5-minute cap.
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (secs >= MAX_SECONDS) stop();
  }, [secs]);

  // The answers go back with everything said so far, and the new plan replaces the board.
  const answerQs = () =>
    askText(
      `${said}\n\nYou asked me:\n${qs.map((q, i) => `- ${q}\n  My answer: ${replies[i]?.trim() || "(no answer, use your judgement)"}`).join("\n")}`,
      false,
    );
  const busy = phase !== "idle";
  const changeCount = drafts.filter((d) => d.kind === "change").length;
  // They said yes: those lists go along (numbered, so the answer can point at tasks), and the ask runs again.
  const share = () => {
    let n = 1;
    const refs: Record<number, string> = {};
    const open = needs.map((l) => {
      const r = numbered(l.tasks, n);
      n = r.next;
      Object.assign(refs, r.refs);
      return { name: l.name, md: r.md || "(no tasks yet)" };
    });
    const sh = { open, refs };
    setShared(sh);
    setNeeds([]);
    askText(said, false, sh);
  };
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const questions = qs.length > 0 && (
    <form
      className={s.askQs}
      onSubmit={(e) => {
        e.preventDefault();
        answerQs();
      }}
    >
      <h3>{drafts.length ? "A few things would make this better" : "Tell me a bit more"}</h3>
      {qs.map((q, i) => (
        <label key={q}>
          <span>{q}</span>
          <input
            value={replies[i] ?? ""}
            disabled={busy}
            onChange={(e) => setReplies((r) => Object.assign([...r], { [i]: e.target.value }))}
            placeholder="Your answer"
          />
        </label>
      ))}
      <div className={s.aiInto}>
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={busy || !replies.some((r) => r?.trim())}>
          <Sparkles size={16} strokeWidth={2.5} /> Answer and update
        </button>
        {drafts.length > 0 && (
          <button type="button" className={s.ghost} onClick={() => setQs([])}>
            Skip
          </button>
        )}
      </div>
    </form>
  );
  const board = drafts.length > 0 && (
    <>
      <AskBoard
        drafts={drafts}
        onChange={setDrafts}
        lists={lists}
        made={made}
        onMake={(n) => setMade((m) => [...m, n])}
        today={today || todayISO()}
      />
      <div className={s.askFoot}>
        <span className={s.aiMeter}>
          {drafts.length - ready ? `${drafts.length - ready} need a list · ` : ""}Move with “Move to” or drag · double-click to rename
        </span>
        <button className={s.ghost} onClick={() => setDrafts([])}>
          Clear
        </button>
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!ready} onClick={save}>
          {changeCount ? `Apply ${ready}` : `Add ${ready || ""} ${ready === 1 ? "thing" : "things"}`}
        </button>
      </div>
    </>
  );

  const open = () => {
    setToday(todayISO());
    if (!ai) setTab("paste");
    if (!dialog.current?.open) dialog.current?.showModal();
    if (ai) api<{ used: number; limit: number | null }>("GET", "/ai/usage").then(setUsage, () => {});
  };
  // The bar at the bottom of the page (AskBar) asks here: words to answer straight away, or the mic.
  const fromBar = useRef<(a: Ask) => void>(() => {});
  fromBar.current = (a: Ask) => {
    if (!ai) return;
    reset();
    setTab("ask");
    open();
    if ("text" in a) {
      setWords(a.text);
      askText(a.text);
    } else record();
  };
  useEffect(() => {
    const on = (e: Event) => fromBar.current((e as CustomEvent<Ask>).detail);
    addEventListener(ASK_EVENT, on);
    return () => removeEventListener(ASK_EVENT, on);
  }, []);

  return (
    <div className={s.import}>
      <button className={s.ghost} data-tour="ai" onClick={open}>
        <Sparkles size={16} strokeWidth={2.5} /> {ai ? "Ask todone" : "Import with AI"}
      </button>

      <dialog ref={dialog} className={s.aiDialog} data-board={found || undefined} aria-labelledby="ai-title" onClose={close}>
        <div className={s.aiHead}>
          <h2 id="ai-title" className="display">
            {ai ? "Ask todone" : "Import with AI"}
          </h2>
          <button className={s.ghost} onClick={close} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {ai && (
          <div className={`${s.seg} ${s.aiTabs}`} role="group" aria-label="How">
            <button aria-pressed={tab === "ask"} onClick={() => setTab("ask")}>
              Tell todone
            </button>
            <button aria-pressed={tab === "paste"} onClick={() => setTab("paste")}>
              Use your own AI
            </button>
          </div>
        )}

        {asking ? (
          <div className={s.aiAsk}>
            {found ? (
              // Ask again: more words add more stickers to the board.
              <form
                className={s.askBar}
                data-inline
                onSubmit={(e) => {
                  e.preventDefault();
                  askText();
                }}
              >
                <Sparkles size={18} strokeWidth={2.5} aria-hidden className={s.askSpark} />
                <input
                  value={words}
                  disabled={busy}
                  onChange={(e) => setWords(e.target.value)}
                  placeholder={busy ? SAYS[phase] : "Ask again or add more…"}
                  aria-label="Ask again or add more"
                />
                {phase === "recording" ? (
                  <button type="button" className={s.askMic} data-on onClick={stop} aria-label={`Stop recording, ${clock}`}>
                    <Square size={14} strokeWidth={3} />
                  </button>
                ) : (
                  <button type="button" className={s.askMic} onClick={record} disabled={busy} aria-label="Speak">
                    <Mic size={18} strokeWidth={2.5} />
                  </button>
                )}
                <button className={s.askGo} disabled={busy || !words.trim()} aria-label="Add more">
                  <ArrowUp size={18} strokeWidth={3} />
                </button>
              </form>
            ) : (
              <>
                <label htmlFor="ai-words" className="sr-only">
                  What do you need to do?
                </label>
                <textarea
                  id="ai-words"
                  rows={6}
                  value={words}
                  disabled={busy}
                  onChange={(e) => setWords(e.target.value)}
                  placeholder="Type or talk, in any language: “Call Rahul tomorrow at 5, kal tak content approve karwana hai, gym 4 times a week, and a movie night as my reward.”"
                />
                <div className={s.aiInto}>
                  {phase === "recording" ? (
                    <button className="btn" style={{ "--fill": "var(--hot)" } as React.CSSProperties} onClick={stop}>
                      <Square size={14} strokeWidth={3} /> Stop · {clock}
                    </button>
                  ) : (
                    <button className="btn" onClick={record} disabled={busy}>
                      <Mic size={16} strokeWidth={2.5} /> Speak
                    </button>
                  )}
                  <button
                    className="btn"
                    style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                    onClick={() => askText()}
                    disabled={busy || !words.trim()}
                  >
                    <Sparkles size={16} strokeWidth={2.5} /> Make my lists
                  </button>
                </div>
              </>
            )}
            {usage?.limit != null && <Credits used={usage.used} limit={usage.limit} />}
            <p className={s.aiStatus} role="status">
              {phase === "recording" && <i className={s.recDot} aria-hidden />}
              {SAYS[phase]}
            </p>
            {transcript && (
              <details className={s.aiHeard}>
                <summary>What todone heard</summary>
                <p>{transcript}</p>
              </details>
            )}
            {shared && (
              <p className={s.aiHeard} role="status">
                Reading {shared.open.map((l) => `“${l.name}”`).join(", ")} for this conversation. Nothing changes until you
                apply it.
              </p>
            )}
            {questions}
            {board}
          </div>
        ) : (
          <ol className={s.aiSteps}>
            <li>
              <p>
                <b>Copy this prompt</b> into ChatGPT, Claude or any AI, then add your plans after it: a brain dump, a
                meeting&apos;s notes, “plan my week”.
              </p>
              <pre className={s.code}>{today && planPrompt({ ...context(), today })}</pre>
              <button
                className="btn"
                onClick={async () => {
                  await navigator.clipboard.writeText(planPrompt({ ...context(), today: today || todayISO() }));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy size={16} strokeWidth={2.5} /> {copied ? "Copied" : "Copy prompt"}
              </button>
            </li>
            <li>
              <label htmlFor="ai-answer">
                <b>Paste the AI&apos;s answer</b>
              </label>
              <textarea
                id="ai-answer"
                rows={8}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  suggest(e.target.value, false);
                }}
                placeholder={
                  "## Trip\n- [ ] Book flights ⏱ 30m 📅 2026-11-03\n- [ ] Pack\n  - [ ] Chargers\n## Goals\n- Read most days | habit | 5 a week\n## Rewards\n- Movie night | 300 XP"
                }
              />
              <p className={s.open} role="status">
                {answer.trim()
                  ? found
                    ? `Found ${drafts.length}, sorted below. Move any you like.`
                    : "Nothing found yet. Tasks start with “- [ ]”."
                  : "Nothing pasted yet."}
              </p>
            </li>
            <li>{drafts.length ? board : <p className={s.open}>What it found shows here as stickers, to place before adding.</p>}</li>
          </ol>
        )}

        {!asking && (
          <p className={s.aiFile}>
            Have a Markdown file instead?{" "}
            <button className={s.link} onClick={() => file.current?.click()}>
              <Upload size={14} strokeWidth={2.5} /> Choose a .md file
            </button>
          </p>
        )}
        <input
          ref={file}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const got = parsePlan(await f.text(), newId, 0).lists;
            if (!got.length) return setErr(`No tasks found in ${f.name}. Tasks look like “- [ ] buy milk”.`);
            // Headings become lists (added to one you have with that name); anything before the first heading becomes
            // a list named after the file.
            for (const g of got) {
              const name = g.name ?? f.name.replace(/\.(md|markdown|txt)$/i, "");
              const have = lists.find((l) => l.name.toLowerCase() === name.toLowerCase());
              if (have) onAppend(have.id, g.tasks);
              else onAdd(name, g.tasks);
            }
            close();
          }}
        />
        {err && <p className={s.err}>{err}</p>}
        {needs.length > 0 && (
          <Consent
            names={needs.map((l) => l.name)}
            count={needs.reduce((n, l) => n + l.tasks.reduce((m, t) => m + 1 + t.sub.length, 0), 0)}
            onCancel={() => setNeeds([])}
            onOk={share}
          />
        )}
      </dialog>
    </div>
  );
}

// Before todone reads a list for the AI, said plainly, like sharing a task: only "I Understand" goes ahead.
function Consent({ names, count, onOk, onCancel }: { names: string[]; count: number; onOk: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  const which = names.map((n) => `“${n}”`).join(" and ");
  return (
    <dialog ref={ref} className={s.disclosure} onClose={onCancel} aria-labelledby="consent-h">
      <h2 id="consent-h" className="display">
        Let todone read {which}?
      </h2>
      <ul>
        <li>
          To do this, todone needs to work with what&apos;s in {which}: a readable copy of its {count}{" "}
          {count === 1 ? "task" : "tasks"} (names, steps, dates and notes) goes through todone&apos;s server to Google&apos;s
          Gemini.
        </li>
        <li>
          It&apos;s used only to answer you. todone doesn&apos;t keep it, and Gemini&apos;s paid tier isn&apos;t used to
          improve Google&apos;s products. A long list uses more AI credits.
        </li>
        <li>Nothing changes until you&apos;ve seen each suggestion and pressed Apply. Deleted tasks go to the Bin.</li>
        <li>Your other lists stay end-to-end encrypted. This covers only this conversation.</li>
      </ul>
      <div className={s.tools}>
        <button className={s.ghost} onClick={() => ref.current?.close()}>
          Cancel
        </button>
        <button className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties} onClick={onOk} autoFocus>
          I Understand
        </button>
      </div>
    </dialog>
  );
}

// This month's AI credits: what's left, as the same bar a list's progress uses; it turns hot when nearly gone.
function Credits({ used, limit }: { used: number; limit: number }) {
  const left = Math.max(0, limit - used);
  return (
    <p className={`${s.progress} ${s.aiCredits}`} data-low={left / limit < 0.15 || undefined}>
      <span>
        {left.toLocaleString("en-IN")} of {limit.toLocaleString("en-IN")} AI credits left this month
      </span>
      <span className={s.bar} role="meter" aria-label="AI credits left" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={left}>
        <i style={{ transform: `scaleX(${left / limit})` }} />
      </span>
    </p>
  );
}
