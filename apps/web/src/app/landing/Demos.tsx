"use client";

import { useState } from "react";
import { Bell, CalendarDays, Check, Cloud, CloudOff, Wifi, WifiOff } from "lucide-react";
import { siApple, siDiscord, siGooglecalendar, siNotion, siObsidian, type SimpleIcon } from "simple-icons";
import { draggable, useDrop } from "@/lib/drag";
import { BILLING, FUNDING, GOALS, PAY_URL, PLANS, PLUS_YEAR_INR, SHOTS, type Billing } from "@/lib/landing";
import { Shot } from "./Shot";
import s from "./landing.module.css";

// The landing page's hands-on pieces: every section can be poked, and each behaves the way todone does.

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Box({ on }: { on: boolean }) {
  return <span className={s.tick} data-on={on || undefined} aria-hidden />;
}

// A checklist you can tick. Ticking the task ticks its steps; unticking leaves them, as in the app.
export function StepsDemo() {
  const [steps, setSteps] = useState([
    ["Book flights", true],
    ["Find a place to stay", false],
    ["Pack the chargers", false],
  ] as [string, boolean][]);
  const [done, setDone] = useState(false);
  return (
    <div className={s.stepNote}>
      <button
        type="button"
        className={s.row}
        aria-pressed={done}
        onClick={() => {
          setDone(!done);
          if (!done) setSteps((st) => st.map(([t]) => [t, true]));
        }}
      >
        <Box on={done} />
        <b data-done={done || undefined}>Plan the trip</b>
      </button>
      <ul>
        {steps.map(([t, on], i) => (
          <li key={t}>
            <button
              type="button"
              className={s.row}
              aria-pressed={on}
              onClick={() => setSteps((st) => st.map((x, j) => (j === i ? [x[0], !x[1]] : x)))}
            >
              <Box on={on} />
              <span data-done={on || undefined}>{t}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={s.try}>Tick the task and its steps go with it.</p>
    </div>
  );
}

// The week strip: drag a block to another day, or pick one and click a day.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BLOCKS = [
  { id: "standup", title: "Standup", day: 0, top: 1, h: 1, fill: "var(--butter)" },
  { id: "post", title: "Write the launch post", day: 1, top: 0, h: 3, fill: "var(--cyan)" },
  { id: "dentist", title: "Dentist", day: 2, top: 2, h: 1, fill: "var(--pink)" },
  { id: "trip", title: "Plan the trip", day: 3, top: 1, h: 2, fill: "var(--lime)" },
  { id: "groceries", title: "Groceries", day: 4, top: 3, h: 1, fill: "var(--peri)" },
];

export function WeekDemo() {
  const [blocks, setBlocks] = useState(BLOCKS);
  const [held, setHeld] = useState<string | null>(null);
  const move = (id: string, day: number) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, day } : b)));
    setHeld(null);
  };
  const drop = useDrop("week", {
    accept: (p) => p.kind === "demo",
    drop: (p, day) => p.kind === "demo" && move(p.id, Number(day)),
  });
  return (
    <div className={s.weekWrap}>
      <div className={s.week}>
        {DAYS.map((d, day) => (
          <div key={d} {...drop(String(day))} onClick={() => held && move(held, day)} data-holding={held ? "" : undefined}>
            <span>{d}</span>
            {blocks
              .filter((b) => b.day === day)
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={s.block}
                  style={{ "--fill": b.fill, gridRow: `${b.top + 2} / span ${b.h}` } as React.CSSProperties}
                  aria-pressed={held === b.id}
                  aria-label={`${b.title}, ${DAYS[b.day]}. Pick it up, then click another day.`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeld(held === b.id ? null : b.id);
                  }}
                  {...draggable({ kind: "demo", id: b.id }, b.title)}
                >
                  {b.title}
                </button>
              ))}
          </div>
        ))}
      </div>
      <p className={s.try}>Drag a block to another day, or tap it and then a day.</p>
    </div>
  );
}

// A shared list where a teammate's tick shows up too.
export function SharedDemo() {
  const [items, setItems] = useState([
    ["Milk", true, "A"],
    ["Rice, 5 kg", false, ""],
    ["Diyas for Saturday", false, ""],
    ["Pay the electricity bill", false, ""],
  ] as [string, boolean, string][]);
  return (
    <div className={s.shared}>
      <span className={s.faces} aria-label="Shared with A, K and you">
        <i>A</i>
        <i>K</i>
        <i data-you>You</i>
      </span>
      <b>Home</b>
      <ul>
        {items.map(([t, on, who], i) => (
          <li key={t}>
            <button
              type="button"
              className={s.row}
              aria-pressed={on}
              onClick={() => setItems((it) => it.map((x, j) => (j === i ? [x[0], !x[1], x[1] ? "" : "You"] : x)))}
            >
              <Box on={on} />
              <span data-done={on || undefined}>{t}</span>
              {on && who && <small>{who}</small>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Go offline, change things, come back: the changes wait, then save.
export function OfflineDemo() {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [saved, setSaved] = useState(false);
  const [ticks, setTicks] = useState([false, false, false]);
  const toggle = () => {
    if (online) setOnline(false);
    else {
      setOnline(true);
      if (waiting) {
        setSaved(true);
        setWaiting(0);
        setTimeout(() => setSaved(false), 1800);
      }
    }
  };
  return (
    <div className={s.offlineDemo}>
      <button type="button" className={s.switch} aria-pressed={!online} onClick={toggle}>
        {online ? <Wifi size={18} strokeWidth={2.5} aria-hidden /> : <WifiOff size={18} strokeWidth={2.5} aria-hidden />}
        {online ? "Online. Turn the Wi-Fi off" : "Offline. Turn it back on"}
      </button>
      <ul>
        {["Reply to the landlord", "Book the cab", "Send the deck"].map((t, i) => (
          <li key={t}>
            <button
              type="button"
              className={s.row}
              aria-pressed={ticks[i]}
              onClick={() => {
                setTicks((ts) => ts.map((x, j) => (j === i ? !x : x)));
                if (!online) setWaiting((w) => w + 1);
              }}
            >
              <Box on={ticks[i]} />
              <span data-done={ticks[i] || undefined}>{t}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={s.syncState} role="status">
        {saved ? (
          <>
            <Cloud size={16} strokeWidth={2.5} aria-hidden /> Back online. Everything saved.
          </>
        ) : online ? (
          <>
            <Cloud size={16} strokeWidth={2.5} aria-hidden /> Saved.
          </>
        ) : (
          <>
            <CloudOff size={16} strokeWidth={2.5} aria-hidden /> {waiting} change{waiting === 1 ? "" : "s"} waiting to save.
          </>
        )}
      </p>
    </div>
  );
}

// Integrations with their real marks; click one to see what connecting it does.
type Tool = { name: string; how: string; mark: SimpleIcon | "calendar" | "bell" };
const TOOLS: Tool[] = [
  { name: "Google Calendar", how: "Dated tasks become events, and moving an event moves the task.", mark: siGooglecalendar },
  { name: "Notion", how: "A list and a Notion database stay in step, both ways.", mark: siNotion },
  { name: "Obsidian", how: "Your lists as Obsidian Tasks Markdown: pull, edit, push back.", mark: siObsidian },
  { name: "Apple Calendar", how: "Subscribe to a private feed of everything that's due.", mark: siApple },
  { name: "Outlook & others", how: "The same private calendar feed works in any calendar app.", mark: "calendar" },
  { name: "Discord", how: "A channel hears when tasks are added or done.", mark: siDiscord },
  { name: "Push reminders", how: "A nudge before a task starts, even with todone closed.", mark: "bell" },
];

function Mark({ mark }: { mark: Tool["mark"] }) {
  if (mark === "calendar") return <CalendarDays size={22} strokeWidth={2.25} aria-hidden />;
  if (mark === "bell") return <Bell size={22} strokeWidth={2.25} aria-hidden />;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill={`#${mark.hex}`} className={s.brand}>
      <path d={mark.path} />
    </svg>
  );
}

export function ToolsDemo() {
  const [on, setOn] = useState<string[]>(["Google Calendar"]);
  const [open, setOpen] = useState("Google Calendar");
  const tool = TOOLS.find((t) => t.name === open)!;
  return (
    <div className={s.toolsDemo}>
      <ul className={s.tools}>
        {TOOLS.map((t) => (
          <li key={t.name}>
            <button
              type="button"
              aria-pressed={on.includes(t.name)}
              onClick={() => {
                setOpen(t.name);
                setOn((o) => (o.includes(t.name) ? o.filter((x) => x !== t.name) : [...o, t.name]));
              }}
            >
              <Mark mark={t.mark} />
              <b>{t.name}</b>
              {on.includes(t.name) && <Check size={16} strokeWidth={3} aria-label="connected" />}
            </button>
          </li>
        ))}
      </ul>
      <p className={s.toolNote} role="status">
        <b>{tool.name}:</b> {tool.how}
      </p>
    </div>
  );
}

// The goal ladder: each goal fills from members' purchases, in order. The calculator shows what N yearly Plus
// members would fund; it's a what-if, not a count.
export function Goals() {
  const [members, setMembers] = useState(25);
  const raised = FUNDING.raisedInr;
  const total = GOALS.reduce((a, g) => a + g.inr, 0);
  // Goals fill in order: each takes what's left after the ones before it.
  const before = (i: number) => GOALS.slice(0, i).reduce((a, g) => a + g.inr, 0);
  const got = GOALS.map((g, i) => Math.max(0, Math.min(raised - before(i), g.inr)));
  const ifReached = GOALS.filter((_, i) => members * PLUS_YEAR_INR >= before(i + 1)).length;
  return (
    <div className={s.goals}>
      <ol className={s.ladder}>
        {GOALS.map((g, i) => {
          return (
            <li key={g.key} style={{ "--fill": g.fill } as React.CSSProperties} data-hit={i < ifReached || undefined}>
              <div className={s.goalHead}>
                <b className="display">{g.name}</b>
                <span>{inr(g.inr)}</span>
              </div>
              <p>{g.what}</p>
              <div
                className={s.bar}
                role="progressbar"
                aria-label={`${g.name}: raised`}
                aria-valuemin={0}
                aria-valuemax={g.inr}
                aria-valuenow={got[i]}
              >
                <i style={{ width: `${(got[i] / g.inr) * 100}%` }} />
              </div>
              <small>
                {inr(got[i])} raised · {g.kind === "fee" ? "app-store fee" : "prototype R&D, estimated"}
              </small>
            </li>
          );
        })}
      </ol>

      <div className={s.calc}>
        <p className="display">
          {inr(raised)} <span>of {inr(total)} raised</span>
        </p>
        <label htmlFor="members">
          What if <b>{members}</b> people chose Plus for a year?
        </label>
        <input
          id="members"
          type="range"
          min={0}
          max={200}
          value={members}
          onChange={(e) => setMembers(Number(e.target.value))}
        />
        <p className={s.calcOut} role="status">
          {inr(members * PLUS_YEAR_INR)}: that&apos;s{" "}
          {ifReached ? (
            <b>
              {GOALS.slice(0, ifReached)
                .map((g) => g.name)
                .join(", ")}
            </b>
          ) : (
            "not yet the Android app"
          )}
          {ifReached === GOALS.length ? ". Everything." : "."}
        </p>
        <p className={s.meterNote}>
          Every Plus, Team or Founding purchase counts, goals fill in order, and this section goes once they&apos;re all met.
          Before fees and taxes.
        </p>
        <Pay>Back todone with UPI</Pay>
      </div>
    </div>
  );
}

// A payment button that admits it isn't live yet rather than leading nowhere.
export function Pay({ children, fill = "var(--lime)" }: { children: React.ReactNode; fill?: string }) {
  return PAY_URL ? (
    <a href={PAY_URL} className="btn" style={{ "--fill": fill } as React.CSSProperties}>
      {children}
    </a>
  ) : (
    <span className={`btn ${s.soon}`} aria-disabled="true">
      Opening soon
    </span>
  );
}

// Plans with a billing switch.
const PER: Record<Billing, string> = { month: "a month", half: "for 6 months", year: "a year" };
export function Pricing() {
  const [billing, setBilling] = useState<Billing>("year");
  return (
    <>
      <div className={s.billing} role="radiogroup" aria-label="Billing">
        {BILLING.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={billing === k} onClick={() => setBilling(k)}>
            {label}
            {k === "year" && <small>save 25%</small>}
          </button>
        ))}
      </div>
      <div className={s.plans}>
        {PLANS.map((p) => {
          const [rs, usd] = p.price ? p.price[billing] : ["₹0", "$0"];
          const per = p.price ? [p.per, PER[billing]].filter(Boolean).join(", ") : p.per;
          return (
            <div
              key={p.name}
              className={s.plan}
              data-lead={p.lead || undefined}
              style={{ "--fill": p.fill } as React.CSSProperties}
            >
              <h3 className="display">{p.name}</h3>
              <p className={s.price}>
                <b className="display">{rs}</b> <span>/ {usd}</span> <small>{per}</small>
              </p>
              <ul>
                {p.points.map((t) => (
                  <li key={t}>
                    <Check size={16} strokeWidth={3} aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              {p.price ? (
                <Pay fill={p.lead ? "#fff8ef" : "var(--butter)"}>Choose {p.name}</Pay>
              ) : (
                <a href="/app" className="btn">
                  Start free
                </a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Hardware: one device at a time, picked by where it lives.
const PLACES = [
  [
    "desk",
    "Desk",
    SHOTS.desk,
    "On your desk",
    "The day at a glance next to your laptop. Tick things off with a tap; no phone, no notifications.",
  ],
  [
    "fridge",
    "Fridge",
    SHOTS.fridge,
    "On the fridge",
    "The household's lists where everyone walks past: groceries, bills, who's doing what. Anyone can tick things off.",
  ],
  [
    "bag",
    "Bag",
    SHOTS.bag,
    "On your bag",
    "Clipped to a strap: your next three tasks on the way out the door, for days on one charge.",
  ],
] as const;

export function Hardware() {
  const [at, setAt] = useState(0);
  const [, name, shot, title, line] = PLACES[at];
  const goal = GOALS.find((g) => g.key === PLACES[at][0])!;
  return (
    <div className={s.hwDemo}>
      <div className={s.places} role="tablist" aria-label="Where it lives">
        {PLACES.map(([k, label], i) => (
          <button key={k} type="button" role="tab" aria-selected={at === i} onClick={() => setAt(i)}>
            {label}
          </button>
        ))}
      </div>
      <div className={s.place} role="tabpanel" aria-label={name}>
        <Shot shot={shot} sizes="(max-width: 900px) 100vw, 60vw" />
        <div>
          <h3 className="display">{title}</h3>
          <p>{line}</p>
          <p className={s.goalTag}>
            Goal {GOALS.indexOf(goal) + 1}: {inr(goal.inr)} for prototypes
          </p>
        </div>
      </div>
    </div>
  );
}
