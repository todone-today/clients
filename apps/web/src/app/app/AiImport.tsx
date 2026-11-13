"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Gift, Mic, Sparkles, Square, Target, Upload, X } from "lucide-react";
import { Select } from "@/components/Select";
import { api, PLAN_EVENT } from "@/lib/api";
import { useLists } from "@/lib/store";
import { type GoalItem } from "@todone/sdk/goals";
import { parsePlan, planPrompt, type PlanGoal } from "@todone/sdk/plan";
import { type List, type Task, todayISO, uid } from "@todone/sdk/tasks";
import { changeGoals, useGoalItems } from "./goalStore";
import { ASK_EVENT, type Ask } from "./AskBar";
import s from "./app.module.css";

const newId = () => uid() + uid();
const weekday = () => new Date().toLocaleDateString("en", { weekday: "long" });
const MAX_SECONDS = 300;

// The answer as lists (each heading matched to a list you have, by name ignoring case, or marked new; the same
// heading twice is one list), plus any goals and rewards.
type Group = { name: string | null; listId?: string; tasks: Task[] };
function plan(md: string, lists: List[]) {
  const p = parsePlan(md, newId, 0); // goals get their real "created" when added
  const out = new Map<string, Group>();
  for (const g of p.lists) {
    const key = g.name?.toLowerCase() ?? "";
    const have = out.get(key);
    if (have) have.tasks.push(...g.tasks);
    else out.set(key, { ...g, listId: g.name ? lists.find((l) => l.name.toLowerCase() === key)?.id : undefined });
  }
  return { groups: [...out.values()], goals: p.goals, rewards: p.rewards };
}

type Phase = "idle" | "recording" | "sending" | "queued" | "transcribing" | "thinking";
const SAYS: Record<Phase, string> = {
  idle: "",
  recording: "Listening…",
  sending: "Sending…",
  queued: "Waiting for the transcriber…",
  transcribing: "Turning your voice into words…",
  thinking: "Making your lists…",
};

const goalHow = (g: PlanGoal) =>
  g.kind === "habit"
    ? `${g.perWeek}× a week`
    : g.kind === "outcome"
      ? g.by
        ? `by ${g.by}`
        : "to finish"
      : g.kind === "target"
        ? `${g.start} → ${g.target} ${g.unit ?? ""}`
        : `${g.target} ${g.unit ?? ""} a day`;

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
  const [answer, setAnswer] = useState("");
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [into, setInto] = useState<string>("");
  const [name, setName] = useState("From AI");
  const [copied, setCopied] = useState(false);
  const [today, setToday] = useState(""); // read when the dialog opens, not while the page renders
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const job = useRef<string | null>(null);
  const asking = ai && tab === "ask";

  const context = () => ({
    today: todayISO(),
    weekday: weekday(),
    lists: lists.map((l) => l.name),
    goals: items.flatMap((i) => (i.t === "goal" ? [i.title] : [])),
    rewards: items.flatMap((i) => (i.t === "reward" ? [i.title] : [])),
  });
  const { groups, goals, rewards } = useMemo(() => plan(answer, lists), [answer, lists]);
  const keep = <T extends { id: string }>(xs: T[]) => xs.filter((x) => !skip.has(x.id));
  const chosen = groups.map((g) => ({ ...g, tasks: keep(g.tasks) })).filter((g) => g.tasks.length);
  const loose = chosen.find((g) => g.name === null)?.tasks ?? [];
  const all = chosen.flatMap((g) => g.tasks).flatMap((t) => [t, ...t.sub]);
  const pickedGoals = keep(goals);
  const pickedRewards = keep(rewards);
  const total = all.length + pickedGoals.length + pickedRewards.length;
  const found = groups.length + goals.length + rewards.length > 0;
  const target = into || current || "new";
  const toggle = (id: string) =>
    setSkip((x) => {
      const n = new Set(x);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
    setSkip(new Set());
    setPhase("idle");
    setErr("");
  };
  const close = () => {
    dialog.current?.close();
    reset();
  };

  // Named lists first, then the loose tasks; whichever is added last is the one that opens.
  const put = (gs: Group[], looseInto: string, looseName: string) => {
    for (const g of gs) {
      if (g.listId) onAppend(g.listId, g.tasks);
      else if (g.name !== null) onAdd(g.name, g.tasks);
    }
    const rest = gs.find((g) => g.name === null)?.tasks ?? [];
    if (!rest.length) return;
    if (looseInto === "new") onAdd(looseName, rest);
    else onAppend(looseInto, rest);
  };
  const save = () => {
    if (!total) return;
    put(chosen, target, name.trim() || "From AI");
    // A goal goes with a list you already have when the AI named one; ids are fresh.
    const linked = (g: PlanGoal): GoalItem => {
      const { listName, ...goal } = g;
      const list = listName && lists.find((l) => l.name.toLowerCase() === listName.toLowerCase())?.id;
      return { ...goal, id: newId(), created: Date.now(), ...(list ? { list } : {}) };
    };
    const extra: GoalItem[] = [...pickedGoals.map(linked), ...pickedRewards.map((r) => ({ ...r, id: newId() }))];
    if (extra.length) changeGoals(everything, (xs) => [...xs, ...extra]);
    close();
  };

  // ---- Ask todone ----
  const failed = (e: unknown) => {
    setPhase("idle");
    setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
  };
  const answered = (r: { result: string; used?: number; limit?: number | null }) => {
    setAnswer(r.result);
    setSkip(new Set());
    setPhase("idle");
    if (r.used !== undefined) setUsage({ used: r.used, limit: r.limit ?? null });
  };
  const askText = async (text = words) => {
    if (!text.trim()) return;
    setErr("");
    setPhase("thinking");
    try {
      answered(await api<{ result: string; used: number; limit: number }>("POST", "/ai/text", { text, context: context() }));
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
      if (j.status === "ready" && j.result) return answered({ result: j.result, used: j.used, limit: j.limit });
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

  const busy = phase !== "idle";
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const row = (id: string, title: string, more: React.ReactNode) => (
    <label key={id}>
      <input type="checkbox" checked={!skip.has(id)} onChange={() => toggle(id)} /> {title}
      {more && <small> · {more}</small>}
    </label>
  );

  const review = (
    <div className={s.aiReview}>
      {groups.map((g) => (
        <fieldset key={g.name ?? ""}>
          <legend>
            <b>{g.name ?? "No list named"}</b> {g.name === null ? "" : g.listId ? "· add to this list" : "· new list"}
          </legend>
          {g.tasks.map((t) =>
            row(
              t.id,
              t.title,
              [t.sub.length ? `${t.sub.length} steps` : "", t.due ?? "", t.at ?? ""].filter(Boolean).join(" · "),
            ),
          )}
        </fieldset>
      ))}
      {goals.length > 0 && (
        <fieldset>
          <legend>
            <Target size={14} strokeWidth={2.5} aria-hidden /> <b>Goals</b>
          </legend>
          {goals.map((g) => row(g.id, g.title, goalHow(g) + (g.listName ? ` · ${g.listName}` : "")))}
        </fieldset>
      )}
      {rewards.length > 0 && (
        <fieldset>
          <legend>
            <Gift size={14} strokeWidth={2.5} aria-hidden /> <b>Rewards</b>
          </legend>
          {rewards.map((r) => row(r.id, r.title, `${r.cost} XP`))}
        </fieldset>
      )}
      <div className={s.aiInto}>
        {loose.length > 0 && (
          <>
            <b aria-hidden>{chosen.length > 1 ? "Tasks without a list go in" : "Put them in"}</b>
            <Select
              label={chosen.length > 1 ? "Tasks without a list go in" : "Put them in"}
              value={target}
              options={[...lists.map((l) => ({ value: l.id, label: l.name })), { value: "new", label: "A new list…" }]}
              onChange={setInto}
            />
            {target === "new" && (
              <input aria-label="New list name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            )}
          </>
        )}
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!total} onClick={save}>
          Add {total || ""} {total === 1 ? "thing" : "things"}
        </button>
        {asking && (
          <button className={s.ghost} onClick={reset}>
            Start over
          </button>
        )}
      </div>
    </div>
  );

  const open = () => {
    setInto(current ?? "new");
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

      <dialog ref={dialog} className={s.aiDialog} aria-labelledby="ai-title" onClose={close}>
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
              <>
                {transcript && (
                  <details className={s.aiHeard}>
                    <summary>What todone heard</summary>
                    <p>{transcript}</p>
                  </details>
                )}
                {review}
              </>
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
                  {usage?.limit != null && (
                    <span className={s.aiMeter}>
                      {Math.max(0, usage.limit - usage.used)} of {usage.limit} left this month
                    </span>
                  )}
                </div>
                <p className={s.aiStatus} role="status">
                  {phase === "recording" && <i className={s.recDot} aria-hidden />}
                  {SAYS[phase]}
                </p>
                <p className={s.aiPrivacy}>
                  What you type or say goes to Google&apos;s Gemini to be understood (your voice to todone&apos;s own
                  transcriber first), then is deleted. Only list, goal and reward names go with it; your lists stay
                  encrypted.
                </p>
              </>
            )}
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
                  setSkip(new Set());
                }}
                placeholder={
                  "## Trip\n- [ ] Book flights ⏱ 30m 📅 2026-11-03\n- [ ] Pack\n  - [ ] Chargers\n## Goals\n- Read most days | habit | 5 a week\n## Rewards\n- Movie night | 300 XP"
                }
              />
              <p className={s.open} role="status">
                {answer.trim()
                  ? found
                    ? `${all.length} task${all.length === 1 ? "" : "s"}, ${goals.length} goal${goals.length === 1 ? "" : "s"}, ${rewards.length} reward${rewards.length === 1 ? "" : "s"}.`
                    : "Nothing found yet. Tasks start with “- [ ]”."
                  : "Nothing pasted yet."}
              </p>
            </li>
            <li>{found ? review : <p className={s.open}>What it found shows here, to check before adding.</p>}</li>
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
            const got = plan(await f.text(), lists).groups;
            if (!got.length) return setErr(`No tasks found in ${f.name}. Tasks look like “- [ ] buy milk”.`);
            // Headings become lists; anything before the first heading becomes a list named after the file.
            put(got, "new", f.name.replace(/\.(md|markdown|txt)$/i, ""));
            close();
          }}
        />
        {err && <p className={s.err}>{err}</p>}
      </dialog>
    </div>
  );
}
