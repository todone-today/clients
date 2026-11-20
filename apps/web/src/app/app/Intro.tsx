"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Lightbulb, ListChecks } from "lucide-react";
import { parsePlan } from "@todone/sdk/plan";
import { type Task, todayISO, uid } from "@todone/sdk/tasks";
import { api } from "@/lib/api";
import { suggest } from "@/lib/onboard";
import { usage } from "@/lib/usage";
import { Working } from "./AiImport";
import s from "./app.module.css";

const newId = () => uid() + uid();
const weekday = () => new Date().toLocaleDateString("en", { weekday: "long" });
type Made = { name: string; tasks: Task[]; ideas: Task[] };

// A first visit: two questions about the person, and Ask todone sets up their first list and Brainstorm from the
// answers (goals and rewards it drafts wait for when they first open Goals or Rewards). Skipping, or the AI being off
// or failing, leaves one empty list: nothing is made up.
export function Intro({
  who,
  ai,
  add,
  onDone,
}: {
  who: string;
  ai: boolean;
  add: (name: string, tasks: Task[], kind?: "ideas") => string;
  onDone: (listId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"want" | "now" | "working" | "review" | "failed">("want");
  const [want, setWant] = useState("");
  const [now, setNow] = useState("");
  const [made, setMade] = useState<Made | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set()); // unticked in the review
  const [waited, setWaited] = useState(0);
  const [why, setWhy] = useState("");
  const turn = useRef(0);

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (step !== "working") return;
    const t = setInterval(() => setWaited((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  const finish = (id: string) => {
    ref.current?.close();
    onDone(id);
  };
  const empty = () => finish(add("My tasks", []));

  const fail = (msg: string) => {
    setWhy(msg);
    setStep("failed");
  };
  const make = async () => {
    if (!ai) return fail("Ask todone isn't on yet.");
    const mine = ++turn.current;
    setWaited(0);
    setStep("working");
    const text = [want.trim() && `What I want in life: ${want.trim()}`, now.trim() && `What I'm doing now: ${now.trim()}`]
      .filter(Boolean)
      .join("\n");
    try {
      const r = await api<{ result: string }>("POST", "/ai/text", {
        text,
        context: { today: todayISO(), weekday: weekday(), lists: [], goals: [], rewards: [], mode: "start" },
      });
      if (mine !== turn.current) return; // stopped
      usage({ name: "ask_used", via: "typed" });
      const plan = parsePlan(r.result, newId, 0);
      const isIdeas = (n: string | null) => !!n && /^ideas?$/i.test(n.trim());
      const first = plan.lists.find((l) => !isIdeas(l.name) && l.tasks.length);
      const ideas = plan.lists.filter((l) => isIdeas(l.name)).flatMap((l) => l.tasks);
      suggest(who, { goals: plan.goals, rewards: plan.rewards });
      if (!first && !ideas.length) return fail("It didn't find anything to add from that.");
      setMade({ name: first?.name?.trim() || "My tasks", tasks: first?.tasks ?? [], ideas });
      setStep("review");
    } catch (e) {
      if (mine === turn.current) fail(e instanceof Error ? e.message : "Ask todone didn't answer.");
    }
  };

  const save = () => {
    if (!made) return empty();
    const keep = (ts: Task[]) => ts.filter((t) => !off.has(t.id));
    const tasks = keep(made.tasks);
    const ideas = keep(made.ideas);
    const id = add(made.name, tasks);
    if (ideas.length) add("Brainstorm", ideas, "ideas");
    if (tasks.length + ideas.length) usage({ name: "task_created", via: "ask", n: tasks.length + ideas.length });
    finish(id);
  };
  const flip = (id: string) =>
    setOff((o) => {
      const n = new Set(o);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const count = made ? made.tasks.length + made.ideas.length - off.size : 0;

  const pick = (t: Task) => (
    <li key={t.id}>
      <label>
        <input type="checkbox" checked={!off.has(t.id)} onChange={() => flip(t.id)} />
        <span>{t.title}</span>
      </label>
    </li>
  );

  return (
    <dialog
      ref={ref}
      className={s.intro}
      aria-label="Set up todone"
      onCancel={(e) => {
        e.preventDefault(); // Esc skips the questions, it doesn't leave a half-made start
        if (step === "want" || step === "now") empty();
      }}
    >
      {(step === "want" || step === "now") && (
        <form
          className={s.introCard}
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "want") setStep("now");
            else if (want.trim() || now.trim()) make();
            else empty();
          }}
        >
          <p className={s.introCount}>{step === "want" ? "1" : "2"} of 2</p>
          <h2 className="display">{step === "want" ? "What do you want more of in life?" : "What's on your plate right now?"}</h2>
          <p className={s.introHint}>
            {step === "want"
              ? "Big or small, in any language. todone turns it into ideas to try."
              : "Work, home, plans, anything. todone turns it into your first list."}
          </p>
          <textarea
            key={step}
            autoFocus
            rows={4}
            maxLength={1500}
            value={step === "want" ? want : now}
            onChange={(e) => (step === "want" ? setWant : setNow)(e.target.value)}
            placeholder={
              step === "want"
                ? "Get fit, grow my design business, more time with family, learn guitar…"
                : "Client deadline Friday, gym 3× a week, learning Spanish, groceries…"
            }
            aria-label={step === "want" ? "What you want more of in life" : "What's on your plate right now"}
          />
          <p className={s.introFine}>Sent to Ask todone once to set you up. Your lists stay end-to-end encrypted.</p>
          <footer>
            <button type="button" className={s.link} onClick={empty}>
              Skip
            </button>
            {step === "now" && (
              <button type="button" className={s.ghost} onClick={() => setStep("want")}>
                Back
              </button>
            )}
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              {step === "want" ? "Next" : "Make my todone"} <ArrowRight size={16} strokeWidth={2.75} aria-hidden />
            </button>
          </footer>
        </form>
      )}

      {step === "working" && (
        <Working
          doing="Making your todone…"
          waited={waited}
          onStop={() => {
            turn.current++;
            setStep("now");
          }}
        />
      )}

      {step === "review" && made && (
        <div className={s.introCard}>
          <h2 className="display">Here&apos;s your start</h2>
          <p className={s.introHint}>Untick anything that doesn&apos;t fit. You can change it all later.</p>
          {made.tasks.length > 0 && (
            <section>
              <h3>
                <ListChecks size={16} strokeWidth={2.5} aria-hidden /> {made.name}
              </h3>
              <ul className={s.introPicks}>{made.tasks.map(pick)}</ul>
            </section>
          )}
          {made.ideas.length > 0 && (
            <section>
              <h3>
                <Lightbulb size={16} strokeWidth={2.5} aria-hidden /> Brainstorm: ideas to try
              </h3>
              <ul className={s.introPicks}>{made.ideas.map(pick)}</ul>
            </section>
          )}
          <footer>
            <button type="button" className={s.link} onClick={empty}>
              Start empty instead
            </button>
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={save} autoFocus>
              <Check size={16} strokeWidth={3} aria-hidden /> Add {count} {count === 1 ? "thing" : "things"}
            </button>
          </footer>
        </div>
      )}

      {step === "failed" && (
        <div className={s.introCard}>
          <h2 className="display">Let&apos;s start simple</h2>
          <p className={s.introHint}>
            {why} You&apos;ll start with an empty list. Tell Ask todone your day any time and it fills it in.
          </p>
          <footer>
            {ai && (
              <button type="button" className={s.ghost} onClick={() => setStep("now")}>
                Try again
              </button>
            )}
            <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} onClick={empty} autoFocus>
              Start
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
