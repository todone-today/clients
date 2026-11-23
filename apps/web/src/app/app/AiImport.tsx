"use client";

import { useEffect, useRef, useState } from "react";
import { usage as counted } from "@/lib/usage";
import { ArrowRight, ArrowUp, Check, Copy, Mic, Sparkles, Square, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { useDictation } from "@/lib/dictate";
import { type Draft, applyChanges, commit, fromChanges, fromPlan } from "@/lib/askBoard";
import { authClient } from "@/lib/auth-client";
import { toBin, update, useLists } from "@/lib/store";
import { type GoalItem } from "@todone/sdk/goals";
import { numbered, parsePlan, planPrompt, type OpenList, type PlanGoal } from "@todone/sdk/plan";
import { type List, type Task, todayISO, uid } from "@todone/sdk/tasks";
import { changeGoals, useGoalItems } from "./goalStore";
import { ASK_EVENT, IDEAS_EVENT, type Ask } from "./AskBar";
import { AskSteps } from "./AskSteps";
import s from "./app.module.css";

const newId = () => uid() + uid();
const weekday = () => new Date().toLocaleDateString("en", { weekday: "long" });

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
  trigger = true,
  lists,
  current,
  ai,
  onAdd,
  onAppend,
}: {
  trigger?: boolean; // its own button in the sidebar (without Ask todone; with it, the bar opens this instead)
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
  const [promptText, setPromptText] = useState(""); // Use your own AI's prompt, made when it's unfolded
  const [kind, setKind] = useState<"ideas" | "goals" | "rewards" | null>(null); // the page it was asked from (the refs below go with requests)
  const [words, setWords] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [usage, setUsage] = useState<{ used: number; limit: number | null } | null>(null);
  const [answer, setAnswer] = useState(""); // a pasted answer (Use your own AI)
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [round, setRound] = useState(0); // a new answer starts the steps again from the first
  const [reviewing, setReviewing] = useState(false); // the results, step by step, in their own dialog
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
  const asking = ai && tab === "ask";

  // `fresh`: the same ask again with lists now shared, so the conversation so far isn't sent as "already planned".
  const context = (open = shared?.open, fresh = false) => ({
    today: todayISO(),
    weekday: weekday(),
    lists: lists.map((l) => l.name),
    here: lists.find((l) => l.id === current)?.name, // the open list: what "this list" means
    goals: items.flatMap((i) => (i.t === "goal" ? [i.title] : [])),
    rewards: items.flatMap((i) => (i.t === "reward" ? [i.title] : [])),
    ...(open ? { open } : {}),
    // Brainstorm wants idea cards only; with lists shared, it's changing them: either way no goals, rewards or questions.
    // Asked from Goals or Rewards: suggest those only.
    ...(ideasMode.current
      ? { mode: "ideas" as const }
      : focus.current
        ? { mode: focus.current }
        : open
          ? { mode: "change" as const }
          : {}),
    // The AI remembers nothing between asks: each one carries the conversation so far and any questions still
    // waiting, so a follow-up (typed or spoken) carries on instead of starting over and asking the same again.
    ...(said.trim() && !ideasMode.current && !fresh ? { earlier: said.slice(-2000) } : {}),
    ...(qs.length && !answeredOnce.current && !ideasMode.current && !fresh ? { asked: qs } : {}),
  });
  const found = drafts.length > 0 || qs.length > 0;
  const suggest = (md: string, add: boolean, refs = shared?.refs) => {
    // Goals get their real "created" when added; tasks the AI left without a list go with the open list.
    const plan = parsePlan(md, newId, 0);
    // It needs to read lists first: ask (see Consent), unless they're already shared. That answer is only that
    // request: anything else in it (goals, rewards, questions) is a guess made without the list, so it's dropped.
    const want = lists.filter((l) => plan.needs.some((n) => n.toLowerCase() === l.name.toLowerCase()));
    if (want.length && !shared) {
      setNeeds(want);
      setQs([]);
      return false;
    }
    if (plan.needs.length && !want.length) setErr(`Couldn't find a list called “${plan.needs[0]}”.`);
    // Changing shared lists ("clean this list"): only the changes and any new tasks; goals and rewards only when the
    // ask was about them, and no questions (it has the list, it decides).
    if (refs) {
      if (!/goal|reward|treat|habit/i.test(`${said}\n${lastAsk.current}`)) {
        plan.goals = [];
        plan.rewards = [];
      }
      plan.questions = [];
    }
    // Asked from Rewards or Goals: only that kind comes back, even when the AI planned more.
    if (focus.current === "rewards") {
      plan.lists = [];
      plan.goals = [];
      plan.changes = [];
      plan.questions = [];
    } else if (focus.current === "goals") {
      plan.lists = [];
      plan.rewards = [];
      plan.changes = [];
    }
    if (focus.current && !plan.goals.length && !plan.rewards.length && !plan.questions.length) {
      setErr(`No ${focus.current} in that. Try saying what you'd enjoy${focus.current === "goals" ? " working towards" : ""}.`);
      return false;
    }
    // One round of questions: once they're answered (or skipped), it goes on with what it has, never asks again.
    const asks = answeredOnce.current ? [] : plan.questions;
    const more = [
      ...fromPlan(plan, lists).map((d) =>
        d.kind === "task" && d.ai === null && current ? { ...d, ai: current, place: current } : d,
      ),
      // Lists only: the goals, ideas and bin lists hold no tasks to change.
      ...(refs ? fromChanges(plan.changes, refs, (everything ?? []).filter((l) => !l.kind)) : []),
    ];
    setDrafts((ds) => (add ? [...ds, ...more] : more));
    setRound((r) => r + 1);
    setQs(asks);
    setReplies([]);
    return (more.length > 0 || asks.length > 0) && !(want.length && !shared);
  };

  // Stops whatever is running (a recording, a job) and clears this turn's input. The conversation stays.
  const halt = () => {
    turn.current++; // an answer still on its way for what was stopped is ignored when it lands
    ideasMode.current = false;
    focus.current = null;
    setKind(null);
    talk.stop();
    setAnswer("");
    setWords("");
    setPhase("idle");
    setErr("");
  };
  // Forgets the conversation: once its suggestions are added, or cleared. Closing Ask todone keeps it, so a closed
  // dialog or an ask from the bar carries on where it was instead of starting over (and asking the same again).
  const forget = () => {
    answeredOnce.current = false;
    setDrafts([]);
    setMade([]);
    setSaid("");
    setQs([]);
    setReplies([]);
    setNeeds([]);
    setShared(null);
  };
  const close = () => {
    setReviewing(false);
    dialog.current?.close();
    halt();
  };

  // Lists you have get their tasks added; new ones are made. Goals go with a list you already have when the AI named
  // one. Ids are fresh. Whichever list is added last is the one that opens. `only`: just that kind (the rewards,
  // say), added now; the rest stays on the board to review.
  const save = (only?: Draft["kind"]) => {
    const { groups, goals, rewards, changes } = commit(only ? drafts.filter((d) => d.kind === only) : drafts);
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
    const n = groups.reduce((sum, g) => sum + g.tasks.length, 0);
    if (n) counted({ name: "task_created", via: "ask", n });
    const linked = (g: PlanGoal): GoalItem => {
      const { listName, ...goal } = g;
      const list = listName && lists.find((l) => l.name.toLowerCase() === listName.toLowerCase())?.id;
      return { ...goal, id: newId(), created: Date.now(), ...(list ? { list } : {}) };
    };
    const extra: GoalItem[] = [...goals.map(linked), ...rewards.map((r) => ({ ...r, id: newId() }))];
    if (extra.length) changeGoals(everything, (xs) => [...xs, ...extra]);
    const left = only ? drafts.filter((d) => d.kind !== only) : [];
    if (left.length) return setDrafts(left);
    forget();
    close();
  };

  // ---- Ask todone ----
  const failed = (e: unknown) => {
    setPhase("idle");
    setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
  };
  // Each answer adds to the board, so a few asks build one plan; answering its questions makes the plan again.
  // Asked from Brainstorm: everything it found goes there as idea cards, and the dialog closes. Otherwise the
  // results open as steps to review.
  const ideasMode = useRef(false);
  const focus = useRef<"goals" | "rewards" | null>(null); // the page it was asked from
  const answeredOnce = useRef(false);
  const turn = useRef(0);
  const lastAsk = useRef(""); // the words of the ask on its way (typed, or what the transcriber heard)
  const land = (md: string, add: boolean, refs?: Record<number, string>) => {
    if (!ideasMode.current) {
      if (suggest(md, add, refs)) setReviewing(true);
      return;
    }
    const plan = parsePlan(md, newId, 0);
    // Brainstorm takes ideas only: every task it found, wherever it put it. Goals and rewards don't belong there.
    const ideas = plan.lists.flatMap((l) => l.tasks).map((t) => ({ ...t, id: newId(), sub: t.sub.map((x) => ({ ...x, id: newId() })) }));
    if (!ideas.length) return setErr(plan.questions[0] ?? "Nothing to add from that. Try it as things to do.");
    dispatchEvent(new CustomEvent<Task[]>(IDEAS_EVENT, { detail: ideas }));
    close();
  };
  const askText = async (text = words, add = true, open = shared, fresh = false) => {
    if (!text.trim()) return;
    setErr("");
    setPhase("thinking");
    const mine = turn.current;
    lastAsk.current = text;
    // Words sent while its questions wait are the answer: the plan is made again with them, and it won't ask again.
    const ctx = context(open?.open, fresh);
    if (add && qs.length && !ideasMode.current) {
      answeredOnce.current = true;
      add = false;
      setQs([]);
      setSaid((x) => `${x}\nMy answers: ${text}`);
    } else if (add) setSaid((x) => (x ? `${x}\n${text}` : text));
    try {
      const r = await api<{ result: string; used: number; limit: number }>("POST", "/ai/text", { text, context: ctx });
      counted({ name: "ask_used", via: "typed" });
      if (mine !== turn.current) return; // stopped meanwhile
      land(r.result, add, open?.refs);
      setWords("");
      setPhase("idle");
      setUsage({ used: r.used, limit: r.limit ?? null });
    } catch (e) {
      if (mine === turn.current) failed(e);
    }
  };
  const askWith = async (text: string, add: boolean, ctx: ReturnType<typeof context>) => {
    setErr("");
    setPhase("thinking");
    const mine = turn.current;
    try {
      const r = await api<{ result: string; used: number; limit: number }>("POST", "/ai/text", { text, context: ctx });
      if (mine !== turn.current) return;
      land(r.result, add, shared?.refs);
      setWords("");
      setPhase("idle");
      setUsage({ used: r.used, limit: r.limit ?? null });
    } catch (e) {
      if (mine === turn.current) failed(e);
    }
  };
  // Speak: the words show in the box as you talk (lib/dictate.ts), after anything already typed there.
  const before = useRef("");
  const talk = useDictation((t) => setWords(before.current && t ? `${before.current} ${t}` : before.current || t));
  const listening = talk.on;
  const record = () => {
    before.current = words.trim();
    void talk.start();
  };
  const stop = talk.stop;
  const secs = talk.secs;
  // How long it has been working (sending, transcribing, thinking), shown beside what it's doing.
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (phase === "idle") return;
    const t = setInterval(() => setWaited((n) => n + 1), 1000);
    return () => (clearInterval(t), setWaited(0));
  }, [phase]);
  const doing =
    phase === "thinking"
      ? kind === "ideas"
        ? "Making idea cards…"
        : shared
          ? `Working on ${shared.open.map((l) => `“${l.name}”`).join(", ")}…`
          : "Making your lists…"
      : SAYS[phase];

  // The answers go back with everything said so far, and the new plan replaces the board.
  const answerQs = () => {
    const answers = `You asked me:\n${qs.map((q, i) => `- ${q}\n  My answer: ${replies[i]?.trim() || "(no answer, use your judgement)"}`).join("\n")}`;
    const ctx = context();
    answeredOnce.current = true;
    setSaid((x) => `${x}\n${answers}`);
    return askWith(answers, false, ctx);
  };
  const busy = phase !== "idle";
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
    setQs([]);
    askText(said, false, sh, true);
  };
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  // The results (and any questions it asked back) open in their own step dialog; from here, a button opens it again.
  const pending = drafts.length + (qs.length ? 1 : 0);
  const board = pending > 0 && (
    <>
      <button
        type="button"
        className={`btn ${s.reviewBtn}`}
        style={{ "--fill": "var(--lime)" } as React.CSSProperties}
        onClick={() => setReviewing(true)}
      >
        {drafts.length
          ? `Review ${drafts.length} ${drafts.length === 1 ? "suggestion" : "suggestions"}`
          : `Answer ${qs.length === 1 ? "its question" : `its ${qs.length} questions`}`}{" "}
        <ArrowRight size={16} strokeWidth={2.75} aria-hidden />
      </button>
      {reviewing && (
        <AskSteps
          key={round}
          drafts={drafts}
          onChange={setDrafts}
          lists={lists}
          made={made}
          onMake={(n: string) => setMade((m) => [...m, n])}
          today={today || todayISO()}
          onAdd={() => save()}
          onAddSome={save}
          onClear={() => {
            forget();
            setReviewing(false);
          }}
          onExit={() => setReviewing(false)}
          questions={qs}
          replies={replies}
          onReply={(i, v) => setReplies((r) => Object.assign([...r], { [i]: v }))}
          onAnswer={answerQs}
          onSkip={() => {
            answeredOnce.current = true;
            setQs([]);
          }}
          busy={busy}
        />
      )}
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
  useEffect(() => {
    fromBar.current = (a: Ask) => {
      if (!ai) return;
      halt();
      ideasMode.current = a.mode === "ideas";
      focus.current = a.mode === "goals" || a.mode === "rewards" ? a.mode : null;
      setKind(a.mode ?? null);
      setTab("ask");
      open();
      if ("text" in a) {
        setWords(a.text);
        askText(a.text);
      }
    };
  });
  useEffect(() => {
    const on = (e: Event) => fromBar.current((e as CustomEvent<Ask>).detail);
    addEventListener(ASK_EVENT, on);
    return () => removeEventListener(ASK_EVENT, on);
  }, []);

  return (
    <div className={s.import}>
      {trigger && (
        <button className={s.ghost} data-tour="ai" onClick={open} data-tip={ai ? "Ask todone" : "Import with AI"}>
          <Sparkles size={16} strokeWidth={2.5} aria-hidden /> <span className={s.label}>{ai ? "Ask todone" : "Import with AI"}</span>
        </button>
      )}

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
                {listening ? (
                  <button type="button" className={s.askMic} data-on onClick={stop} aria-label={`Stop recording, ${clock}`}>
                    <Square size={14} strokeWidth={3} />
                  </button>
                ) : (
                  <button type="button" className={s.askMic} onClick={record} disabled={busy} aria-label="Speak">
                    <Mic size={18} strokeWidth={2.5} />
                  </button>
                )}
                <button className={s.askGo} disabled={busy || listening || !words.trim()} aria-label="Add more">
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
                  disabled={busy || listening}
                  onChange={(e) => setWords(e.target.value)}
                  placeholder="Type or talk, in any language: “Call Rahul tomorrow at 5, kal tak content approve karwana hai, gym 4 times a week, and a movie night as my reward.”"
                />
                <div className={s.aiInto}>
                  {listening ? (
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
                    disabled={busy || listening || !words.trim()}
                  >
                    <Sparkles size={16} strokeWidth={2.5} />{" "}
                    {kind === "ideas"
                      ? "Add my ideas"
                      : kind === "goals"
                        ? "Make my goals"
                        : kind === "rewards"
                          ? "Make my rewards"
                          : "Make my lists"}
                  </button>
                </div>
              </>
            )}
            {usage?.limit != null && <Credits used={usage.used} limit={usage.limit} />}
            {busy && phase !== "recording" ? (
              <Working doing={doing} waited={waited} onStop={halt} hearing={phase !== "thinking"} />
            ) : (
              <p className={s.aiStatus} role="status">
                {listening && <i className={s.recDot} aria-hidden />}
                {listening ? SAYS.recording : SAYS[phase]}
              </p>
            )}
            {shared && (
              <p className={s.aiHeard} role="status">
                Reading {shared.open.map((l) => `“${l.name}”`).join(", ")} for this conversation. Nothing changes until you
                apply it.
              </p>
            )}
            {board}
          </div>
        ) : (
          <ol className={s.aiSteps}>
            <li>
              <p>
                <b>Copy the prompt</b>, paste it into ChatGPT, Claude or any AI, and add your plans after it.
              </p>
              <button
                className={`btn ${s.aiCopy}`}
                onClick={async () => {
                  await navigator.clipboard.writeText(planPrompt({ ...context(), today: today || todayISO() }));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.5} />} {copied ? "Copied" : "Copy prompt"}
              </button>
              {/* The prompt itself, for the curious: folded away. */}
              <details
                className={s.aiPrompt}
                onToggle={(e) => e.currentTarget.open && today && setPromptText(planPrompt({ ...context(), today }))}
              >
                <summary>See what it says</summary>
                <pre className={s.code}>{promptText}</pre>
              </details>
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
        {(err || talk.err) && <p className={s.err}>{err || talk.err}</p>}
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

// While Ask todone works: a small dialog over everything, so nothing can be changed under it; Esc or Stop halts it.
// What it's up to, said playfully, a new word every couple of seconds; the plain truth goes underneath.
const THINK = ["Mulling…", "Cooking…", "Pondering…", "Untangling…", "Connecting the dots…", "Weighing it up…", "Sketching your plan…", "Brewing…", "Sorting it out…", "Nearly there…"];
const HEAR = ["Listening back…", "Catching every word…", "Tuning in…", "Untangling accents…", "Writing it down…"];

export function Working({
  doing,
  waited,
  onStop,
  hearing = false,
}: {
  doing: string;
  waited: number;
  onStop: () => void;
  hearing?: boolean; // still turning speech into words
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const words = hearing ? HEAR : THINK;
  const word = words[Math.floor(waited / 2.5) % words.length];
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${s.disclosure} ${s.aiWorking}`}
      aria-label="Ask todone is working"
      onCancel={(e) => {
        e.preventDefault();
        onStop();
      }}
    >
      <Sparkles size={22} strokeWidth={2.5} aria-hidden className={s.askSpark} data-busy />
      <span role="status" aria-label={doing}>
        <b key={word} className={s.aiWord} aria-hidden>
          {word}
        </b>
        <small>
          {doing.replace(/…$/, "")} · {waited < 20 ? `${waited}s` : `${waited}s, long ones take up to a minute`}
        </small>
      </span>
      <button type="button" className={s.ghost} onClick={onStop} autoFocus>
        Stop
      </button>
    </dialog>
  );
}
