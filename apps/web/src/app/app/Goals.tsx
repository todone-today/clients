"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Gift,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  balance,
  goalProgress,
  type Goal,
  type GoalItem,
  type Reward,
  type Win,
} from "@todone/sdk/goals";
import { type List, todayISO, uid } from "@todone/sdk/tasks";
import { Select } from "@/components/Select";
import { authClient } from "@/lib/auth-client";
import { useLists } from "@/lib/store";
import { changeGoals, useGoalItems } from "./goalStore";
import s from "./app.module.css";

const FILLS = [
  "var(--butter)",
  "var(--pink)",
  "var(--cyan)",
  "var(--lime)",
  "var(--peri)",
  "#c9b3ff",
  "#8fe3b0",
];
const fillFor = (id: string) =>
  FILLS[
    ([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0) %
      FILLS.length
  ];
const daysLeft = (by: string) =>
  Math.round((+new Date(by) - +new Date(todayISO())) / 86_400_000);
export const useMe = () => authClient.useSession().data?.user.id;

// Goals: why each one matters, how it's going, the next step, and the if-then plan. Outcome goals have milestones
// (their linked tasks); habits count the weeks you showed up. Nothing here ever "fails".
export function Goals({ onOpen }: { onOpen: (listId: string) => void }) {
  const { lists, update } = useLists();
  const { items } = useGoalItems();
  const [making, setMaking] = useState(false);
  const goals = items.filter((i): i is Goal => i.t === "goal");
  const open = goals.filter((g) => !g.done);
  const achieved = goals.filter((g) => g.done);
  const all = (lists ?? []).filter((l) => !l.kind);
  const tasks = all.flatMap((l) => l.tasks);
  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Goals</h1>
        <p className={s.progress}>
          {open.length
            ? `${open.length} going, ${achieved.length} achieved`
            : "Something worth working toward."}
        </p>
        <div className={s.tools}>
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() => setMaking(true)}
          >
            <Plus size={16} strokeWidth={2.75} aria-hidden /> New goal
          </button>
        </div>
      </div>
      {!goals.length && (
        <p className={s.goalEmpty}>
          A goal links your tasks to something you care about: why it matters,
          what could get in the way, and what you&apos;ll do then. Finishing its
          tasks earns XP you can spend on rewards you choose.
        </p>
      )}
      <ul className={s.goalGrid}>
        {open.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            items={items}
            tasks={tasks}
            lists={all}
            onOpen={onOpen}
          />
        ))}
      </ul>
      {achieved.length > 0 && (
        <>
          <h2 className={s.sideHead}>Achieved</h2>
          <ul className={s.goalGrid}>
            {achieved.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                items={items}
                tasks={tasks}
                lists={all}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </>
      )}
      {making && (
        <GoalDialog
          lists={all}
          onClose={() => setMaking(false)}
          onSave={(g, steps, listId) => {
            changeGoals(lists, (xs) => [...xs, g]);
            if (steps.length && listId)
              update(listId, (l) => ({
                ...l,
                tasks: [
                  ...l.tasks,
                  ...steps.map((title) => ({
                    id: uid(),
                    title,
                    done: false,
                    sub: [],
                    goal: g.id,
                  })),
                ],
              }));
            setMaking(false);
          }}
        />
      )}
    </>
  );
}

function GoalCard({
  goal,
  items,
  tasks,
  lists,
  onOpen,
}: {
  goal: Goal;
  items: GoalItem[];
  tasks: List["tasks"];
  lists: List[];
  onOpen: (listId: string) => void;
}) {
  const { lists: all } = useLists();
  const [reflecting, setReflecting] = useState(false);
  const p = goalProgress(goal, tasks, items);
  const set = (f: (g: Goal) => Goal | null) =>
    changeGoals(all, (xs) =>
      xs.flatMap((x) =>
        x.t === "goal" && x.id === goal.id ? (f(x) ?? []) : [x],
      ),
    );
  const nextList =
    p.next &&
    lists.find((l) =>
      l.tasks.some(
        (t) => t.id === p.next!.id || t.sub.some((x) => x.id === p.next!.id),
      ),
    );
  const left = goal.by ? daysLeft(goal.by) : null;
  return (
    <li
      className={s.goal}
      style={{ "--fill": fillFor(goal.id) } as React.CSSProperties}
      data-done={goal.done ? "" : undefined}
    >
      <header>
        <Target size={18} strokeWidth={2.5} aria-hidden />
        <h3>{goal.title}</h3>
        <span className={s.goalKind}>
          {goal.kind === "habit" ? `${goal.perWeek ?? 1}× a week` : "Outcome"}
        </span>
      </header>
      {goal.why && <p className={s.goalWhy}>{goal.why}</p>}
      {goal.become && <p className={s.goalBecome}>Becoming: {goal.become}</p>}

      {goal.kind === "outcome" ? (
        <div className={s.goalMeter}>
          <span className={s.bar} aria-hidden>
            <i
              style={{ transform: `scaleX(${p.total ? p.done / p.total : 0})` }}
            />
          </span>
          <b>
            {p.done} of {p.total} milestones
          </b>
          {!goal.done && left !== null && (
            <small>
              {left > 1
                ? `${left} days left`
                : left === 1
                  ? "Due tomorrow"
                  : left === 0
                    ? "Due today"
                    : "Past the date: still worth it"}
            </small>
          )}
        </div>
      ) : (
        <div
          className={s.goalWeeks}
          aria-label={`${p.thisWeek} of ${goal.perWeek ?? 1} this week`}
        >
          {p.weeks.map((w, i) => (
            <span
              key={w.week}
              title={`Week of ${w.week}: ${w.n}`}
              data-now={i === p.weeks.length - 1 || undefined}
            >
              <i
                style={{
                  height: `${Math.min(1, w.n / (goal.perWeek ?? 1)) * 100}%`,
                }}
              />
            </span>
          ))}
          <b>
            {p.thisWeek} of {goal.perWeek ?? 1} this week
          </b>
          {p.thisWeek === 0 && <small>Fresh week. One small one counts.</small>}
        </div>
      )}

      {p.next && !goal.done && (
        <button
          className={s.goalNext}
          onClick={() => nextList && onOpen(nextList.id)}
          title="Open its list"
        >
          Next: <b>{p.next.title}</b>
        </button>
      )}
      {!p.total && !goal.done && (
        <p className={s.goalHint}>
          Link tasks to this goal from a task&apos;s panel (Goal field).
        </p>
      )}
      {goal.plan && (
        <p className={s.goalPlan}>
          {goal.obstacle ? `If ${goal.obstacle.replace(/^if\s+/i, "")} → ` : ""}
          {goal.plan}
        </p>
      )}
      {goal.done && goal.reflection && (
        <p className={s.goalWhy}>What helped: {goal.reflection}</p>
      )}

      <footer>
        {goal.kind === "outcome" && !goal.done && (
          <button
            className={`btn ${s.claim}`}
            style={{ "--fill": "#fff" } as React.CSSProperties}
            onClick={() => setReflecting(true)}
          >
            <Check size={15} strokeWidth={2.75} aria-hidden /> Achieved
          </button>
        )}
        {goal.done && (
          <button
            className={`btn ${s.claim}`}
            style={{ "--fill": "#fff" } as React.CSSProperties}
            onClick={() => set((g) => ({ ...g, done: undefined }))}
          >
            Not yet
          </button>
        )}
        <button
          className={s.rewardX}
          onClick={() => set(() => null)}
          aria-label={`Delete goal ${goal.title}`}
        >
          <Trash2 size={15} strokeWidth={2.5} aria-hidden />
        </button>
      </footer>
      {reflecting && (
        <Reflect
          title={goal.title}
          onCancel={() => setReflecting(false)}
          onDone={(reflection) => {
            set((g) => ({
              ...g,
              done: Date.now(),
              ...(reflection ? { reflection } : {}),
            }));
            setReflecting(false);
          }}
        />
      )}
    </li>
  );
}

function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.goalDialog}
      aria-label={label}
      onClose={onClose}
    >
      <button
        className={s.panelClose}
        onClick={() => ref.current?.close()}
        aria-label="Close"
      >
        <X size={18} strokeWidth={2.75} />
      </button>
      {children}
    </dialog>
  );
}

// Finishing an outcome goal: celebrate, then one question, because remembering what worked builds the next one.
function Reflect({
  title,
  onDone,
  onCancel,
}: {
  title: string;
  onDone: (r: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <Modal label="Goal achieved" onClose={onCancel}>
      <p className={s.goalCheer}>
        <Sparkles size={22} strokeWidth={2.5} aria-hidden /> You did it
      </p>
      <h2 className="display">{title}</h2>
      <label className={s.goalField}>
        <span>What helped? What would you change next time?</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={3}
          autoFocus
        />
      </label>
      <div className={s.tools}>
        <button
          className="btn"
          style={{ "--fill": "var(--lime)" } as React.CSSProperties}
          onClick={() => onDone(text.trim())}
        >
          Mark achieved
        </button>
      </div>
    </Modal>
  );
}

// A new goal in four short steps (only the first is needed): the wish, why, the obstacle and plan, first steps.
function GoalDialog({
  lists,
  onClose,
  onSave,
}: {
  lists: List[];
  onClose: () => void;
  onSave: (g: Goal, steps: string[], listId: string | null) => void;
}) {
  const [step, setStep] = useState(0);
  const [g, setG] = useState<Goal>(() => ({
    t: "goal",
    id: uid(),
    title: "",
    kind: "outcome",
    created: Date.now(),
  }));
  const [steps, setSteps] = useState(["", "", ""]);
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const put =
    (k: keyof Goal) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setG((x) => ({ ...x, [k]: e.target.value || undefined }));
  const titles = [
    "What do you want?",
    "Why does it matter?",
    "What could get in the way?",
    "First steps",
  ];
  const save = () =>
    onSave(
      {
        ...g,
        title: g.title.trim(),
        ...(g.kind === "habit"
          ? { by: undefined, perWeek: g.perWeek ?? 3 }
          : { perWeek: undefined }),
      },
      steps.map((x) => x.trim()).filter(Boolean),
      listId || null,
    );
  return (
    <Modal label="New goal" onClose={onClose}>
      <p className={s.goalStep}>
        Step {step + 1} of 4{step > 0 && " · optional"}
      </p>
      <h2 className="display">{titles[step]}</h2>
      <form
        className={s.goalForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (!g.title.trim()) return;
          if (step < 3) setStep(step + 1);
          else save();
        }}
      >
        {step === 0 && (
          <>
            <label className={s.goalField}>
              <span>The goal</span>
              <input
                value={g.title}
                onChange={(e) => setG((x) => ({ ...x, title: e.target.value }))}
                maxLength={120}
                placeholder="Run a 5K, ship the app, read 12 books…"
                autoFocus
                required
              />
            </label>
            <div
              className={s.goalKinds}
              role="radiogroup"
              aria-label="Kind of goal"
            >
              {(
                [
                  [
                    "outcome",
                    "Get somewhere",
                    "A result by a date, made of milestones",
                  ],
                  ["habit", "Show up", "Something you do a few times a week"],
                ] as const
              ).map(([k, name, hint]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={g.kind === k}
                  onClick={() => setG((x) => ({ ...x, kind: k }))}
                >
                  <b>{name}</b>
                  <small>{hint}</small>
                </button>
              ))}
            </div>
            {g.kind === "outcome" ? (
              <label className={s.goalField}>
                <span>By when (optional)</span>
                <input
                  type="date"
                  value={g.by ?? ""}
                  min={todayISO()}
                  onChange={put("by")}
                />
              </label>
            ) : (
              <div className={s.goalField}>
                <span>How often</span>
                <Select
                  label="Times a week"
                  value={String(g.perWeek ?? 3)}
                  options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                    value: String(n),
                    label: n === 7 ? "Every day" : `${n}× a week`,
                  }))}
                  onChange={(v) => setG((x) => ({ ...x, perWeek: +v }))}
                />
              </div>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <label className={s.goalField}>
              <span>Why it matters to you</span>
              <textarea
                value={g.why ?? ""}
                onChange={put("why")}
                maxLength={1000}
                rows={3}
                autoFocus
                placeholder="So I have energy for my kids…"
              />
            </label>
            <label className={s.goalField}>
              <span>Who you want to become</span>
              <input
                value={g.become ?? ""}
                onChange={put("become")}
                maxLength={300}
                placeholder="Someone who finishes what they start"
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className={s.goalField}>
              <span>What could get in the way</span>
              <input
                value={g.obstacle ?? ""}
                onChange={put("obstacle")}
                maxLength={500}
                autoFocus
                placeholder="I'm too tired after work"
              />
            </label>
            <label className={s.goalField}>
              <span>Then I&apos;ll…</span>
              <input
                value={g.plan ?? ""}
                onChange={put("plan")}
                maxLength={500}
                placeholder="do the 10-minute version"
              />
            </label>
            <p className={s.goalHint}>
              Deciding now what you&apos;ll do then makes it far more likely you
              will.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <p className={s.goalHint}>
              Make the first one tiny: something you could do in 5 minutes.
            </p>
            {steps.map((v, i) => (
              <input
                key={i}
                className={s.goalStepInput}
                value={v}
                maxLength={500}
                autoFocus={i === 0}
                placeholder={
                  ["Put on running shoes", "Walk 10 minutes", "Run 1 km"][i]
                }
                aria-label={`Step ${i + 1}`}
                onChange={(e) =>
                  setSteps((xs) =>
                    xs.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
            ))}
            {lists.length > 0 && (
              <div className={s.goalField}>
                <span>Add them to</span>
                <Select
                  label="List"
                  value={listId}
                  options={lists.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={setListId}
                />
              </div>
            )}
          </>
        )}
        <div className={s.tools}>
          {step > 0 && (
            <button
              type="button"
              className={s.ghost}
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          {step > 0 && step < 3 && (
            <button type="button" className={s.ghost} onClick={save}>
              Save now
            </button>
          )}
          <button
            className="btn"
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            disabled={!g.title.trim()}
          >
            {step < 3 ? "Next" : "Save goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Rewards you set for yourself, bought with the XP your finished tasks earn. In a team, each person has their own XP.
export function Rewards() {
  const { lists } = useLists();
  const { items } = useGoalItems();
  const me = useMe();
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("100");
  const [claimed, setClaimed] = useState("");
  const xp = balance(items, me);
  const mine = items
    .filter((i): i is Win => i.t === "win" && (i.by ?? undefined) === me)
    .sort((a, b) => b.at - a.at);
  const [week] = useState(() => Date.now() - 7 * 86_400_000);
  const thisWeek = mine
    .filter((w) => !w.spend && w.at > week)
    .reduce((n, w) => n + w.xp, 0);
  const rewards = items.filter((i): i is Reward => i.t === "reward");
  const claim = (r: Reward) => {
    changeGoals(lists, (xs) =>
      balance(xs, me) < r.cost
        ? xs
        : [
            ...xs,
            {
              t: "win",
              id: uid() + uid(),
              title: r.title,
              at: Date.now(),
              xp: -r.cost,
              spend: true,
              ...(me ? { by: me } : {}),
            },
          ],
    );
    setClaimed(r.title);
    setTimeout(() => setClaimed(""), 2500);
  };
  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Rewards</h1>
        <p className={s.progress}>
          <Zap size={18} strokeWidth={2.75} aria-hidden /> {xp} XP to spend ·{" "}
          {thisWeek} earned this week
        </p>
        <p className={s.open}>
          Finishing a task earns XP: more for longer, higher-priority and
          on-time tasks, tasks with steps, and tasks toward a goal. Spend it on
          treats you choose.
        </p>
      </div>
      {claimed && (
        <p className={s.goalCheer} role="status">
          <Gift size={20} strokeWidth={2.5} aria-hidden /> Enjoy: {claimed}. You
          earned it.
        </p>
      )}
      <ul className={s.rewardGrid}>
        {rewards.map((r) => (
          <li
            key={r.id}
            className={s.reward}
            style={{ "--fill": fillFor(r.id) } as React.CSSProperties}
          >
            <header>
              <Gift size={18} strokeWidth={2.5} aria-hidden />
              <h3>{r.title}</h3>
              <span className={s.goalKind}>
                <Zap size={11} strokeWidth={2.75} aria-hidden /> {r.cost}
              </span>
            </header>
            <div className={s.goalMeter}>
              <span className={s.bar} aria-hidden>
                <i
                  style={{
                    transform: `scaleX(${Math.min(1, Math.max(0, xp) / r.cost)})`,
                  }}
                />
              </span>
              <small>
                {xp >= r.cost ? "Ready to claim" : `${r.cost - xp} XP to go`}
              </small>
            </div>
            <footer>
              <button
                className={`btn ${s.claim}`}
                style={
                  {
                    "--fill": xp >= r.cost ? "var(--lime)" : "#fff",
                  } as React.CSSProperties
                }
                disabled={xp < r.cost}
                onClick={() => claim(r)}
              >
                <Gift size={15} strokeWidth={2.5} aria-hidden /> Claim
              </button>
              <button
                className={s.rewardX}
                aria-label={`Delete reward ${r.title}`}
                onClick={() =>
                  changeGoals(lists, (xs) => xs.filter((x) => x.id !== r.id))
                }
              >
                <Trash2 size={15} strokeWidth={2.5} aria-hidden />
              </button>
            </footer>
          </li>
        ))}
        <li className={s.rewardNew}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const c = Math.round(+cost);
              if (!title.trim() || !(c >= 1 && c <= 100_000)) return;
              changeGoals(lists, (xs) => [
                ...xs,
                {
                  t: "reward",
                  id: uid() + uid(),
                  title: title.trim(),
                  cost: c,
                },
              ]);
              setTitle("");
            }}
          >
            <label className={s.goalField}>
              <span>A reward</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Cheat meal, 20 min Instagram…"
              />
            </label>
            <label className={s.goalField}>
              <span>Costs (XP)</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </label>
            <button
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              disabled={!title.trim()}
            >
              <Plus size={16} strokeWidth={2.75} aria-hidden /> Add reward
            </button>
          </form>
        </li>
      </ul>
      {mine.length > 0 && (
        <>
          <h2 className={s.sideHead}>Recent</h2>
          <ol className={s.wins}>
            {mine.slice(0, 20).map((w) => (
              <li key={w.id} data-spend={w.spend || undefined}>
                <span>{w.spend ? `Claimed ${w.title}` : w.title}</span>
                <b>
                  {w.xp > 0 ? "+" : ""}
                  {w.xp}
                </b>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

// The XP tile in the top bar: your balance, with a "+18" that floats up when you earn some.
export function XpTile({ onClick }: { onClick: () => void }) {
  const { items } = useGoalItems();
  const me = useMe();
  const xp = balance(items, me);
  const prev = useRef<number | null>(null);
  const [pop, setPop] = useState<{ n: number; k: number } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = xp;
    if (before !== null && xp > before) {
      Promise.resolve().then(() => setPop({ n: xp - before, k: Date.now() }));
      const t = setTimeout(() => setPop(null), 1400);
      return () => clearTimeout(t);
    }
  }, [xp]);
  return (
    <button
      className={`${s.tile} ${s.xpTile}`}
      style={{ "--fill": "var(--lime)" } as React.CSSProperties}
      onClick={onClick}
      aria-label={`${xp} XP: rewards`}
      title="Your XP: spend it on rewards"
    >
      <Zap size={15} strokeWidth={2.75} aria-hidden />
      <span>{xp}</span>
      {pop && (
        <b key={pop.k} className={s.xpPop} aria-hidden>
          +{pop.n}
        </b>
      )}
    </button>
  );
}
