"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bell,
  CalendarDays,
  Check,
  Cloud,
  CloudOff,
  ChevronDown,
  Lock,
  Pause,
  Play,
  Popcorn,
  Target,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { siApple, siGooglecalendar, type SimpleIcon } from "simple-icons";
import { draggable, useDrop } from "@/lib/drag";
import {
  BILLING,
  GOALS,
  PLANS,
  SHOTS,
  type Billing,
} from "@/lib/landing";
import s from "./landing.module.css";

// The landing page's hands-on pieces: every section can be poked, and each behaves the way todone does.

// The hardware concepts in 3D (three.js), loaded only in the browser when the section shows.
const Device3D = dynamic(() => import("./Device3D"), {
  ssr: false,
  loading: () => <div className="device3d" />,
});


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
  const [folded, setFolded] = useState(false);
  return (
    <div className={s.stepNote}>
      <button
        type="button"
        className={s.row}
        aria-pressed={done}
        onClick={() => {
          // Steps follow their task both ways: tick it and they're done, untick it and they're open again.
          setSteps((st) => st.map(([t]) => [t, !done]));
          setDone(!done);
        }}
      >
        <Box on={done} />
        <b data-done={done || undefined}>Plan the trip</b>
      </button>
      <button
        type="button"
        className={s.fold}
        aria-expanded={!folded}
        aria-label={`${folded ? "Show" : "Hide"} the steps`}
        onClick={() => setFolded(!folded)}
      >
        <ChevronDown size={13} strokeWidth={3} aria-hidden />
        {steps.filter(([, on]) => on).length}/{steps.length}
      </button>
      <ul hidden={folded}>
        {steps.map(([t, on], i) => (
          <li key={t}>
            <button
              type="button"
              className={s.row}
              aria-pressed={on}
              onClick={() =>
                setSteps((st) =>
                  st.map((x, j) => (j === i ? [x[0], !x[1]] : x)),
                )
              }
            >
              <Box on={on} />
              <span data-done={on || undefined}>{t}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={s.try}>
        Tick or untick the task and its steps go with it. Fold them away when
        they&apos;re in the way.
      </p>
    </div>
  );
}

// The week strip: drag a block to another day, or pick one and click a day.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BLOCKS = [
  {
    id: "standup",
    title: "Standup",
    day: 0,
    top: 1,
    h: 1,
    fill: "var(--butter)",
  },
  {
    id: "post",
    title: "Write the launch post",
    day: 1,
    top: 0,
    h: 3,
    fill: "var(--cyan)",
  },
  {
    id: "dentist",
    title: "Dentist",
    day: 2,
    top: 2,
    h: 1,
    fill: "var(--pink)",
  },
  {
    id: "trip",
    title: "Plan the trip",
    day: 3,
    top: 1,
    h: 2,
    fill: "var(--lime)",
  },
  {
    id: "groceries",
    title: "Groceries",
    day: 4,
    top: 3,
    h: 1,
    fill: "var(--peri)",
  },
];

const ROWS = 4; // hour rows in each day (landing.module.css .week > div)
export function WeekDemo() {
  const [blocks, setBlocks] = useState(BLOCKS);
  const [held, setHeld] = useState<string | null>(null);
  // A block lands in the first free slot of the day (shrinking to an hour if it must); a full day says no. Two
  // blocks on the same rows would otherwise spill into a second grid column and over the next day.
  const move = (id: string, day: number) => {
    setBlocks((bs) => {
      const b = bs.find((x) => x.id === id)!;
      if (b.day === day) return bs;
      const taken = new Set(bs.filter((x) => x.day === day).flatMap((x) => Array.from({ length: x.h }, (_, i) => x.top + i)));
      const fits = (top: number, h: number) => top + h <= ROWS && Array.from({ length: h }, (_, i) => top + i).every((r) => !taken.has(r));
      for (const h of [b.h, 1]) {
        const order = [b.top, ...Array.from({ length: ROWS }, (_, i) => i)];
        const top = order.find((t) => fits(t, h));
        if (top !== undefined) return bs.map((x) => (x.id === id ? { ...x, day, top, h } : x));
      }
      return bs;
    });
    setHeld(null);
  };
  const drop = useDrop("week", {
    accept: (p) => p.kind === "demo" && blocks.some((b) => b.id === p.id),
    drop: (p, day) => p.kind === "demo" && move(p.id, Number(day)),
  });
  return (
    <div className={s.weekWrap}>
      <div className={s.week}>
        {DAYS.map((d, day) => (
          <div
            key={d}
            {...drop(String(day))}
            onClick={() => held && move(held, day)}
            data-holding={held ? "" : undefined}
          >
            <span>{d}</span>
            {blocks
              .filter((b) => b.day === day)
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={s.block}
                  style={
                    {
                      "--fill": b.fill,
                      gridRow: `${b.top + 2} / span ${b.h}`,
                      gridColumn: 1,
                    } as React.CSSProperties
                  }
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
      <p className={s.try}>
        Drag a block to another day, or tap it and then a day.
      </p>
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
              onClick={() =>
                setItems((it) =>
                  it.map((x, j) =>
                    j === i ? [x[0], !x[1], x[1] ? "" : "You"] : x,
                  ),
                )
              }
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
      <button
        type="button"
        className={s.switch}
        aria-pressed={!online}
        onClick={toggle}
      >
        {online ? (
          <Wifi size={18} strokeWidth={2.5} aria-hidden />
        ) : (
          <WifiOff size={18} strokeWidth={2.5} aria-hidden />
        )}
        {online ? "Online. Turn the Wi-Fi off" : "Offline. Turn it back on"}
      </button>
      <ul>
        {["Reply to the landlord", "Book the cab", "Send the deck"].map(
          (t, i) => (
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
          ),
        )}
      </ul>
      <p className={s.syncState} role="status">
        {saved ? (
          <>
            <Cloud size={16} strokeWidth={2.5} aria-hidden /> Back online.
            Everything saved.
          </>
        ) : online ? (
          <>
            <Cloud size={16} strokeWidth={2.5} aria-hidden /> Saved.
          </>
        ) : (
          <>
            <CloudOff size={16} strokeWidth={2.5} aria-hidden /> {waiting}{" "}
            change{waiting === 1 ? "" : "s"} waiting to save.
          </>
        )}
      </p>
    </div>
  );
}

// Integrations with their real marks; click one to see what connecting it does.
type Tool = {
  name: string;
  how: string;
  mark: SimpleIcon | "calendar" | "bell";
};
const TOOLS: Tool[] = [
  {
    name: "Google Calendar",
    how: "Add your private calendar link in one click: your dated tasks show up as events.",
    mark: siGooglecalendar,
  },
  {
    name: "Apple Calendar",
    how: "The same private link, added to Apple Calendar on your Mac, iPhone or iPad.",
    mark: siApple,
  },
  {
    name: "Outlook",
    how: "The same private link, added to Outlook.com or a work account. One way: todone → your calendar.",
    mark: "calendar",
  },
];

function Mark({ mark }: { mark: Tool["mark"] }) {
  if (mark === "calendar")
    return <CalendarDays size={22} strokeWidth={2.25} aria-hidden />;
  if (mark === "bell") return <Bell size={22} strokeWidth={2.25} aria-hidden />;
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
      fill={`#${mark.hex}`}
      className={s.brand}
    >
      <path d={mark.path} />
    </svg>
  );
}

// A "Gym" list's goals: log a weigh-in or some protein and watch it fill, then spend the XP on a reward you set.
const MOVIE = 15;
export function GoalsDemo() {
  const [kg, setKg] = useState(71.5);
  const [protein, setProtein] = useState(90);
  const [xp, setXp] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [claims, setClaims] = useState(0); // a fresh shower for every claim
  const earn = (n: number) => {
    setXp((x) => x + n);
    setClaimed(false);
  };
  return (
    <div className={s.goalsDemo}>
      <div
        className={s.goalNote}
        style={{ "--fill": "var(--cyan)" } as React.CSSProperties}
      >
        <header>
          <Target size={15} strokeWidth={2.75} aria-hidden /> <b>Weigh 68 kg</b>
        </header>
        <span className={s.goalBar} aria-hidden>
          <i style={{ transform: `scaleX(${Math.min(1, (74 - kg) / 6)})` }} />
        </span>
        <small>
          {kg} kg now · {Math.max(0, Math.round((kg - 68) * 10) / 10)} kg to go
        </small>
        <button
          type="button"
          disabled={kg <= 68}
          onClick={() => {
            setKg((k) => Math.round((k - 0.5) * 10) / 10);
            earn(3);
          }}
        >
          Log {Math.round((kg - 0.5) * 10) / 10} kg
        </button>
      </div>
      <div
        className={s.goalNote}
        style={{ "--fill": "var(--butter)" } as React.CSSProperties}
      >
        <header>
          <Target size={15} strokeWidth={2.75} aria-hidden />{" "}
          <b>Protein, 140 g a day</b>
        </header>
        <span className={s.goalBar} aria-hidden>
          <i style={{ transform: `scaleX(${Math.min(1, protein / 140)})` }} />
        </span>
        <small>
          {protein} of 140 g today{protein >= 140 ? " · hit!" : ""}
        </small>
        <button
          type="button"
          onClick={() => {
            setProtein((p) => p + 25);
            earn((protein === 90 ? 3 : 0) + (protein < 140 && protein + 25 >= 140 ? 10 : 0));
          }}
        >
          + 25 g
        </button>
      </div>
      {claimed && <Confetti key={claims} />}
      <div className={s.rewardNote} data-claimed={claimed || undefined}>
        <Popcorn size={22} strokeWidth={2.5} aria-hidden />
        <span>
          <b>Movie night</b>
          <small role="status">
            {claimed
              ? "Claimed. Enjoy the film!"
              : xp >= MOVIE
                ? `Ready: you have ${xp} XP`
                : `${xp} of ${MOVIE} XP · log above to earn`}
          </small>
        </span>
        <span className={s.goalBar} aria-hidden>
          <i style={{ transform: `scaleX(${Math.min(1, xp / MOVIE)})` }} />
        </span>
        <button
          type="button"
          disabled={!claimed && xp < MOVIE}
          onClick={() => {
            if (claimed) return setClaimed(false);
            setXp((x) => x - MOVIE);
            setClaimed(true);
            setClaims((n) => n + 1);
          }}
        >
          {claimed ? "Again" : `Claim · ${MOVIE} XP`}
        </button>
      </div>
    </div>
  );
}

// Getting todone on a phone, in the two taps each takes, and the full guide.
export function PhoneDemo() {
  return (
    <div className={s.phoneDemo}>
      <ol>
        <li>
          <b className="display">iPhone</b>
          <span>
            Safari → <i>Share</i> → <i>Add to Home Screen</i>
          </span>
        </li>
        <li>
          <b className="display">Android</b>
          <span>
            Chrome → <i>⋮</i> → <i>Install app</i>
          </span>
        </li>
      </ol>
      <a href="/install" className="btn" style={{ "--fill": "#fff8ef" } as React.CSSProperties}>
        All the steps
      </a>
    </div>
  );
}

// Focus mode, small: one task, a clock that runs (fast-forwarded so the demo moves), and Done puts the time on the
// task's card, the ⏳ chip the app shows.
const clockOf = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
export function FocusDemo() {
  const [secs, setSecs] = useState(0);
  const [on, setOn] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    // A minute every second, so a short visit still shows the clock doing its job.
    const id = setInterval(() => setSecs((x) => x + 60), 1000);
    return () => clearInterval(id);
  }, [on]);
  const goal = 25 * 60;
  const finish = () => {
    setOn(false);
    setDone(Math.max(1, Math.round(secs / 60)));
  };
  return (
    <div className={s.focusDemo}>
      {done === null ? (
        <div className={s.focusSheet} data-on={on || undefined}>
          <small>{on ? "Focusing on" : secs ? "Paused" : "Focus"}</small>
          <b className="display">Write the launch post</b>
          <p className={`display ${s.focusClockDemo}`} role="timer">
            {clockOf(secs)}
          </p>
          <span className={s.focusBarDemo} aria-hidden>
            <i style={{ transform: `scaleX(${Math.min(1, secs / goal)})` }} />
          </span>
          <small>{secs < goal ? `${clockOf(goal - secs)} left of 25m` : "Past the 25m you planned. That's fine."}</small>
          <div className={s.focusButtons}>
            <button type="button" className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties} onClick={() => setOn((x) => !x)}>
              {on ? <Pause size={16} strokeWidth={2.75} aria-hidden /> : <Play size={16} strokeWidth={2.75} aria-hidden />}
              {on ? "Pause" : secs ? "Resume" : "Start"}
            </button>
            <button type="button" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={!secs} onClick={finish}>
              <Check size={16} strokeWidth={3} aria-hidden /> Done
            </button>
          </div>
        </div>
      ) : (
        <div className={s.focusAfter}>
          <Confetti />
          <div className={s.focusCardDone}>
            <span className={s.focusTick} aria-hidden>
              <Check size={14} strokeWidth={3.5} />
            </span>
            <b>Write the launch post</b>
            <span className={s.focusChip}>⏳ {done}m</span>
          </div>
          <p>Ticked off, and the time is on the card. Next time you&apos;ll know how long it really takes.</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDone(null);
              setSecs(0);
            }}
          >
            Again
          </button>
        </div>
      )}
    </div>
  );
}

// A reminder's trip, played step by step: written on your device, sealed there, held by our server knowing only the
// time, then shown on your phone's lock screen. The server never sees the words.
const TASK = "Plan the week";
const HEX = "0123456789abcdef";
const noise = (n: number) => Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join("");
type Leg = "idle" | "sealing" | "held" | "shown";
export function RemindDemo() {
  const [leg, setLeg] = useState<Leg>("idle");
  const [blob, setBlob] = useState("");
  useEffect(() => {
    if (leg === "idle") return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let scramble: ReturnType<typeof setInterval> | undefined;
    if (leg === "sealing") {
      // The words turn into noise, a little more each frame, until nothing readable is left.
      let k = 0;
      scramble = setInterval(() => {
        k++;
        setBlob(TASK.slice(0, Math.max(0, TASK.length - k)) + noise(Math.min(k, 24)));
        if (k >= TASK.length + 6) clearInterval(scramble);
      }, calm ? 0 : 45);
      timers.push(setTimeout(() => setLeg("held"), calm ? 50 : 1300));
    }
    if (leg === "held") timers.push(setTimeout(() => setLeg("shown"), calm ? 50 : 1500));
    return () => {
      clearInterval(scramble);
      timers.forEach(clearTimeout);
    };
  }, [leg]);
  const at = (l: Leg) => ["idle", "sealing", "held", "shown"].indexOf(l) <= ["idle", "sealing", "held", "shown"].indexOf(leg);
  const sealed = leg !== "idle";
  return (
    <div className={s.remindDemo} data-leg={leg}>
      <ol className={s.trip}>
        <li className={s.tripDevice} data-on={at("idle") || undefined}>
          <span className={s.tripTag}>1 · Your device</span>
          <div className={s.tripTask}>
            <span className={s.tripBox} aria-hidden />
            <b>{sealed ? blob : TASK}</b>
            <small>⏰ 16:00</small>
          </div>
          <span className={s.tripStamp} data-in={sealed || undefined} aria-hidden>
            <Lock size={12} strokeWidth={3} /> Sealed here
          </span>
        </li>
        <li className={s.tripServer} data-on={at("held") || undefined}>
          <span className={s.tripTag}>2 · Our server</span>
          <p>
            <span>Send at</span> <b>{at("held") ? "15:45" : "—"}</b>
          </p>
          <p>
            <span>What</span> <code>{at("held") ? `${blob.slice(-12) || noise(12)}…` : "—"}</code>
          </p>
          <small>
            <Lock size={11} strokeWidth={3} aria-hidden /> Knows when, never what.
          </small>
        </li>
        <li className={s.tripPhone} data-on={at("shown") || undefined}>
          <span className={s.tripTag}>3 · Your phone, todone closed</span>
          <div className={s.lockScreen}>
            <span className={s.lockTime}>15:45</span>
            <div className={s.push} data-in={leg === "shown" || undefined} aria-live="polite">
              {leg === "shown" && (
                <>
                  <span className={s.pushIcon} aria-hidden>
                    <Bell size={14} strokeWidth={2.75} />
                  </span>
                  <span>
                    <small>todone · now</small>
                    <b>{TASK}</b>
                    <small>At 16:00 · in 15 minutes</small>
                  </span>
                </>
              )}
            </div>
          </div>
        </li>
      </ol>
      <button
        type="button"
        className="btn"
        style={{ "--fill": "var(--butter)" } as React.CSSProperties}
        disabled={leg === "sealing" || leg === "held"}
        onClick={() => {
          setBlob("");
          setLeg("sealing");
        }}
      >
        <Bell size={16} strokeWidth={2.75} aria-hidden />
        {leg === "idle" ? "Send the 15:45 reminder" : leg === "shown" ? "Send it again" : "On its way…"}
      </button>
    </div>
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
                setOn((o) =>
                  o.includes(t.name)
                    ? o.filter((x) => x !== t.name)
                    : [...o, t.name],
                );
              }}
            >
              <Mark mark={t.mark} />
              <b>{t.name}</b>
              {on.includes(t.name) && (
                <Check size={16} strokeWidth={3} aria-label="connected" />
              )}
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
  return (
    <div className={s.goals}>
      <ol className={`${s.ladder} ${s.lands}`} data-reveal="stack">
        {GOALS.map((g, i) => (
          <li key={g.key} style={{ "--fill": g.fill, "--grey": 0 } as React.CSSProperties}>
            <div className={s.goalHead}>
              <b className="display">{g.name}</b>
              <span>{i === 0 ? "Next" : `Then ${i + 1}`}</span>
            </div>
            <p>{g.what}</p>
            <small>{g.kind === "fee" ? "An app-store listing" : "Prototype parts, to try it for real"}</small>
          </li>
        ))}
      </ol>

      <div className={s.calc}>
        <p className="display">How Plus helps</p>
        <ul className={s.helps}>
          <li>
            <b>Keeps todone running</b> without ads and without selling anyone&apos;s data: the servers, backups and
            the AI.
          </li>
          <li>
            <b>Builds what&apos;s next,</b> in this order: the phone apps first, then the screens for your desk, fridge
            and bag.
          </li>
          <li>
            <b>Gives you a say.</b> Members&apos; feedback decides what gets built and fixed first.
          </li>
          <li>
            <b>And you get more:</b> as many lists as you need, sharing, teams and more Ask todone each month.
          </li>
        </ul>
        <Pay>Back todone with Plus</Pay>
      </div>
    </div>
  );
}

// A payment button that admits it isn't live yet rather than leading nowhere.
// Checkout happens in the app (Plan): signed out, it's sign in or make an account first, then straight there.
export function Pay({
  children,
  plan = "plus-year",
  fill = "var(--lime)",
}: {
  children: React.ReactNode;
  plan?: string;
  fill?: string;
}) {
  return (
    <a
      href={`/app?plan=${plan}`}
      className="btn"
      style={{ "--fill": fill } as React.CSSProperties}
    >
      {children}
    </a>
  );
}

// Plans with a billing switch.
const PER: Record<Billing, string> = {
  month: "a month",
  half: "for 6 months",
  year: "a year",
};
// "₹1,499" → 1499
const amount = (s: string) => Number(s.replace(/[^\d]/g, ""));
const MONTHS: Record<Billing, number> = { month: 1, half: 6, year: 12 };
const TERM: Record<Billing, string> = {
  month: "",
  half: "first 6 months",
  year: "first year",
};
const AGAIN: Record<Billing, string> = {
  month: "",
  half: "every 6 months",
  year: "a year",
};

// The launch price's discount on the normal price for the same term, rounded down.
const off = (intro: [string, string], normal: [string, string]) =>
  Math.floor((1 - amount(intro[0]) / amount(normal[0])) * 100);

// Saving on the first term against paying monthly for as long, rounded down so it never overstates.
function saving(b: Billing) {
  const plus = PLANS.find((p) => p.lead)!;
  const first = plus.intro?.[b] ?? plus.price![b];
  return Math.floor(
    (1 - amount(first[0]) / (amount(plus.price!.month[0]) * MONTHS[b])) * 100,
  );
}

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("year");
  return (
    <>
      <div className={s.billing} role="radiogroup" aria-label="Billing">
        {BILLING.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={billing === k}
            onClick={() => setBilling(k)}
          >
            {label}
            {k !== "month" && <small>save {saving(k)}%</small>}
          </button>
        ))}
      </div>
      <div className={`${s.plans} ${s.lands}`} data-reveal="stack">
        {PLANS.map((p) => {
          const intro = p.intro?.[billing];
          const [rs, usd] =
            intro ?? (p.price ? p.price[billing] : ["₹0", "$0"]);
          const per = p.price
            ? [p.per, intro ? TERM[billing] : PER[billing]]
                .filter(Boolean)
                .join(", ")
            : p.per;
          return (
            <div
              key={p.name}
              className={s.plan}
              data-lead={p.lead || undefined}
              style={{ "--fill": p.fill } as React.CSSProperties}
            >
              <h3 className="display">{p.name}</h3>
              {intro && (
                <p
                  className={s.deal}
                  aria-label={`Launch deal: ${off(intro, p.price![billing])}% off the ${TERM[billing]}`}
                >
                  <span>Launch deal</span>
                  <b className="display">−{off(intro, p.price![billing])}%</b>
                  <span>{TERM[billing]}!</span>
                </p>
              )}
              <p className={s.price}>
                {intro && <s className={s.was}>{p.price![billing][0]}</s>}{" "}
                <b className="display">{rs}</b> <span>/ {usd}</span>{" "}
                <small>{per}</small>
              </p>
              {intro && (
                <p className={s.renew}>
                  <b>Launch price.</b> Then {p.price![billing][0]} /{" "}
                  {p.price![billing][1]}
                  {p.per && ` ${p.per},`} {AGAIN[billing]}; cancel any time.
                </p>
              )}
              <ul>
                {p.points.map((t) => (
                  <li key={t}>
                    <Check size={16} strokeWidth={3} aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              {p.price ? (
                <Pay
                  plan={`${p.name.toLowerCase()}-${billing}`}
                  fill={p.lead ? "#fff8ef" : "var(--butter)"}
                >
                  Choose {p.name}
                </Pay>
              ) : (
                <a href="/app?new=1" className="btn">
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
    "Your day, next to your laptop.",
  ],
  [
    "fridge",
    "Fridge",
    SHOTS.fridge,
    "On the fridge",
    "The family's lists, where everyone sees them.",
  ],
  [
    "bag",
    "Bag",
    SHOTS.bag,
    "On your bag",
    "Your next three tasks, on your way out.",
  ],
] as const;

export function Hardware() {
  const [at, setAt] = useState(0);
  const [, name, shot, title, line] = PLACES[at];
  const goal = GOALS.find((g) => g.key === PLACES[at][0])!;
  return (
    <div className={s.hwStudio}>
      <figure className={s.hwStage} role="tabpanel" aria-label={name}>
        <Device3D key={PLACES[at][0]} place={PLACES[at][0] as "desk" | "fridge" | "bag"} label={shot.alt} />
        <figcaption className={s.conceptTag}>Concept, not a product · drag to turn</figcaption>
      </figure>
      <div className={s.hwSide}>
        <div className={s.places} role="tablist" aria-label="Where it lives">
          {PLACES.map(([k, label, , where], i) => (
            <button key={k} type="button" role="tab" aria-selected={at === i} onClick={() => setAt(i)}>
              <b className="display">{label}</b>
              <small>{where}</small>
            </button>
          ))}
        </div>
        <div className={s.placeCopy} key={PLACES[at][0]}>
          <h3 className="display">{title}</h3>
          <p>{line}</p>
          <p className={s.goalTag}>
            Prototype: step {GOALS.indexOf(goal) + 1} of the plan
          </p>
                  </div>
      </div>
    </div>
  );
}
