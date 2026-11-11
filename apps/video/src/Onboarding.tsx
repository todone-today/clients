// todone's onboarding video: the whole signed-in app (src/live.tsx) on a sample account (src/seed.ts), one feature
// per scene, timed by frame. Each scene starts from what the ones before it did. Sound and music are in <Sounds />.
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "@/components/Logo";
import app from "@/app/app/app.module.css";
import { setTeam } from "./mocks/auth-client";
import { setReplies } from "./mocks/actions";
import { setTheme } from "./setup";
import { type EditName, FLIGHT, IDEA, TYPED, day } from "./seed";
import { Fade, Sfx, inStage, usePop } from "./kit";
import { type Finder, LiveScene, type Step, button, claim, end, field, note, sideList, sticker, tab } from "./live";

// ---- Where things are that need more than a selector ------------------------------------------------------------
const theToggle: Finder = () => inStage("button[aria-label^='Switch to']")[0];
const trayItem: Finder = () => inStage("button, li, div").reverse().find((el) => el.textContent?.trim().startsWith(TYPED) && el.getBoundingClientRect().width < 400);
// Tomorrow at 10:00 in the week grid: that day's column, at the 10:00 row.
const tomorrowAt10: Finder = () => {
  const n = +day(1).slice(8);
  const col = inStage("button").find((b) => b.textContent?.replace(/\s+/g, " ").trim().endsWith(` ${n}`));
  const hour = inStage("span[data-hour='10']")[0];
  if (!col || !hour) return null;
  const c = col.getBoundingClientRect();
  const h = hour.getBoundingClientRect();
  return { getBoundingClientRect: () => new DOMRect(c.x, h.y, c.width, 24), outerHTML: "" } as unknown as Element;
};
const inCard = (label: string, card: string): Finder => () =>
  inStage("button").find((b) => b.textContent?.trim() === label && b.closest("li")?.textContent?.includes(card));
const goalKind = (name: string): Finder => () => inStage("button[role='radio']").find((b) => b.textContent?.startsWith(name));
// The task panel scrolled down to its conversation (where the replies come in).
const toConversation = () => {
  for (const el of inStage(`.${app.panel}, .${app.panel} *`))
    if (el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight;
};
const taskTitle = (id: string): Finder => () => inStage(`[data-id='${id}'] .${app.taskTitle}`)[0];

// ---- The scenes: what each one does (frames at 30fps, from the scene's start) ------------------------------------
type Scene = { dur: number; caption: string; makes: EditName[]; steps: Step[]; after?: () => void };
const RAW = {
  create: {
    dur: 75,
    caption: "Add a task: type it, press Enter",
    makes: ["added"],
    steps: [{ at: 12, into: field("#new-task"), type: TYPED, dur: 32, then: "added", sfx: "pop" }],
  },
  stickers: {
    dur: 105,
    caption: "Drop stickers on it: when, priority, repeat",
    makes: ["today", "high", "weekly"],
    steps: [
      { at: 30, drag: sticker("Today"), to: note(FLIGHT), edit: "today", sfx: "pop" },
      { at: 62, drag: sticker("High"), to: note(FLIGHT), edit: "high", sfx: "pop" },
      { at: 94, drag: sticker("Weekly"), to: note("t-water-the-plants"), edit: "weekly", sfx: "pop" },
    ],
  },
  steps: {
    dur: 65,
    caption: "Drop one note on another: it becomes a step",
    makes: ["step"],
    steps: [{ at: 44, drag: note("t-pack-the-chargers"), to: note(FLIGHT), edit: "step", lift: 30, sfx: "thud" }],
  },
  lists: {
    dur: 95,
    caption: "Make as many lists as you like",
    makes: ["newList"],
    steps: [
      { at: 10, into: field("input[placeholder='New list']"), type: "Reading", dur: 20, enter: true, sfx: "pop" },
      { at: 62, click: sideList("Trip to Goa"), sfx: "click" },
      { at: 84, click: sideList("Groceries"), sfx: "click" },
    ],
  },
  brainstorm: {
    dur: 90,
    caption: "Brainstorm freely, then drop an idea into a list",
    makes: ["idea"],
    steps: [
      { at: 14, click: sideList("Brainstorm"), sfx: "click" },
      { at: 74, drag: note(IDEA), to: sideList("This week"), edit: "idea", lift: 32, sfx: "thud" },
    ],
  },
  calendar: {
    dur: 100,
    caption: "Plan the week: drag tasks onto a time",
    makes: ["planned"],
    steps: [
      { at: 14, click: tab("Calendar"), sfx: "click" },
      { at: 80, drag: trayItem, to: tomorrowAt10, edit: "planned", lift: 34, sfx: "thud" },
    ],
  },
  goal: {
    dur: 140,
    caption: "Set a goal: what, why, and the first steps",
    makes: ["goal"],
    steps: [
      { at: 8, click: tab("Goals"), sfx: "click" },
      { at: 22, click: button("New goal"), sfx: "click" },
      { at: 30, into: field("input[placeholder^='Run a 5K']"), type: "Read 12 books", dur: 20 },
      { at: 58, click: goalKind("Get somewhere"), sfx: "click" },
      { at: 66, click: button("Next"), sfx: "click" },
      { at: 72, into: field("[placeholder^='So I have energy']"), type: "So I read more than I scroll", dur: 22 },
      { at: 102, click: button("Next"), sfx: "click" },
      { at: 110, click: button("Next"), sfx: "click" },
      { at: 122, click: button("Save goal"), sfx: "pop" },
    ],
  },
  reach: {
    dur: 90,
    caption: "Reach a goal: mark it achieved",
    makes: ["achieved"],
    steps: [
      { at: 8, click: tab("Goals"), sfx: "click" },
      { at: 24, click: inCard("Achieved", "Plan the Goa trip"), sfx: "chime" },
      { at: 34, into: field("dialog[open] textarea"), type: "Booking early helped.", dur: 22 },
      { at: 68, click: button("Mark achieved"), sfx: "ding" },
    ],
  },
  rewards: {
    dur: 125,
    caption: "Done tasks earn XP: set a reward, then claim it",
    makes: ["reward", "claimed"],
    steps: [
      { at: 8, click: tab("Rewards"), sfx: "click" },
      { at: 22, into: field("input[placeholder^='Cheat meal']"), type: "Pizza night", dur: 22 },
      { at: 54, click: button("Add reward"), sfx: "pop" },
      { at: 92, click: claim("Pizza night"), sfx: "chime" },
    ],
  },
  share: {
    dur: 190,
    after: toConversation,
    caption: "Share a task by link: they reply, no account needed",
    makes: ["shared", "finished"],
    steps: [
      { at: 8, click: sideList("This week"), sfx: "click" },
      { at: 22, click: taskTitle(FLIGHT), sfx: "click" },
      { at: 38, click: button("Share"), sfx: "click" },
      { at: 52, click: button("I Understand"), sfx: "pop" },
      { at: 78, wait: true, sfx: "ding" },
      { at: 110, wait: true, sfx: "ding" },
      { at: 142, wait: true, sfx: "ding" },
      { at: 166, click: field("button[aria-label='Done']"), sfx: "chime" },
    ],
  },
  team: {
    dur: 100,
    caption: "Plan together: invite people to a team",
    makes: [],
    steps: [
      { at: 14, click: button("Team settings"), sfx: "click" },
      { at: 30, into: field("#invite-email"), type: "meera@todone.today", dur: 34 },
      { at: 76, click: button("Invite"), sfx: "ding", fake: true },
    ],
  },
  theme: {
    dur: 60,
    caption: "Day or night: one tap",
    makes: [],
    steps: [
      { at: 8, click: sideList("This week"), sfx: "click" },
      { at: 30, click: theToggle, sfx: "click", fake: true },
    ],
  },
} satisfies Record<string, Scene>;

// The pace: every scene a third slower than the frames above, and the busier ones (a goal's steps, reaching one,
// sharing while replies come in) slower still, so each step can be followed.
const PACE: Partial<Record<keyof typeof RAW, number>> = { goal: 1.6, reach: 1.5, share: 1.6 };
const slower = (sc: Scene, k: number): Scene => ({
  ...sc,
  dur: Math.round(sc.dur * k),
  steps: sc.steps.map((st) => ({
    ...st,
    at: Math.round(st.at * k),
    ...("dur" in st ? { dur: Math.round(st.dur * k) } : {}),
    ...("drag" in st ? { lift: Math.round((st.lift ?? 26) * k) } : {}),
  })),
});
const SCENES = Object.fromEntries(Object.entries(RAW).map(([n, sc]) => [n, slower(sc, PACE[n as keyof typeof RAW] ?? 1.3)])) as unknown as {
  [K in keyof typeof RAW]: Omit<(typeof RAW)[K], "dur" | "steps"> & { dur: number; steps: Step[] };
};

// ---- Timeline ---------------------------------------------------------------------------------------------------
const INTRO = 60;
const OUTRO = 70;
const ORDER = ["create", "stickers", "steps", "lists", "brainstorm", "calendar", "goal", "reach", "rewards", "share", "team", "theme"] as const;
type Name = (typeof ORDER)[number];
const FROM = {} as Record<Name, number>;
const PRE = {} as Record<Name, EditName[]>; // each scene starts from what the ones before it made
ORDER.reduce(
  (acc, k) => ((FROM[k] = acc.t), (PRE[k] = acc.made), { t: acc.t + SCENES[k].dur, made: [...acc.made, ...(SCENES[k] as Scene).makes] }),
  { t: INTRO, made: [] as EditName[] },
);
const END = FROM.theme + SCENES.theme.dur;
export const DURATION = END + OUTRO;
// Night until the toggle is tapped; the team scene is in a team workspace (Home), with Meera invited once Invite is;
// the shared task's replies arrive at the share scene's waits.
const NIGHT_UNTIL = FROM.theme + SCENES.theme.steps[1].at;
const INVITED_AT = FROM.team + SCENES.team.steps[2].at;
const REPLY_AT = (SCENES.share.steps as Step[]).filter((s) => "wait" in s).map((s) => FROM.share + s.at);

// ---- Intro and end card -----------------------------------------------------------------------------------------
const TAGLINE = "todo, done right.";
const Intro = () => {
  const f = useCurrentFrame();
  const logo = usePop(0, 10);
  const line = usePop(12, 14);
  return (
    <AbsoluteFill style={{ background: "var(--ground)", color: "var(--ink)", alignItems: "center", justifyContent: "center", gap: 28 }}>
      <div style={{ transform: `scale(${logo * 2.2}) rotate(${(1 - logo) * -12}deg)` }}>
        <Logo size={44} />
      </div>
      <p className="display" style={{ fontSize: 84, lineHeight: 0.9, marginTop: 40, opacity: line, transform: `translateY(${(1 - line) * 30}px)` }}>
        {TAGLINE}
      </p>
      <Fade f={f} dur={INTRO} />
    </AbsoluteFill>
  );
};
const End = () => {
  const logo = usePop(0, 10);
  const line = usePop(10, 14);
  const more = usePop(20, 14);
  return (
    <AbsoluteFill style={{ background: "var(--lime)", color: "var(--black)", alignItems: "center", justifyContent: "center", gap: 22 }}>
      <div style={{ transform: `scale(${logo * 2})` }}>
        <Logo size={44} />
      </div>
      <p className="display" style={{ fontSize: 72, marginTop: 26, opacity: line, transform: `translateY(${(1 - line) * 24}px)` }}>
        {TAGLINE}
      </p>
      <p style={{ font: "800 28px var(--sans)", opacity: more }}>todone.today</p>
    </AbsoluteFill>
  );
};

// ---- Sound ------------------------------------------------------------------------------------------------------
// The music is a placeholder made by make_sfx.py; drop a licensed track into public/ as music.wav to replace it.
const Sounds = () => (
  <>
    <Audio
      src={staticFile("music.wav")}
      loop
      volume={(f) => 0.22 * interpolate(f, [0, 20, DURATION - 40, DURATION], [0, 1, 1, 0], { extrapolateRight: "clamp" })}
    />
    <Sfx at={0} name="whoosh" />
    <Sfx at={14} name="chime" />
    {ORDER.flatMap((k) =>
      (SCENES[k].steps as Step[]).filter((s) => s.sfx).map((s) => <Sfx key={`${k}${s.at}`} at={FROM[k] + end(s)} name={s.sfx!} />),
    )}
    <Sfx at={END} name="whoosh" />
    <Sfx at={END + 12} name="chime" />
  </>
);

// ---- The video --------------------------------------------------------------------------------------------------
export const Onboarding = () => {
  const frame = useCurrentFrame();
  setTheme(frame < NIGHT_UNTIL ? "night" : "day");
  const inTeam = frame >= FROM.team && frame < FROM.team + SCENES.team.dur;
  setTeam(inTeam ? { members: 2, invited: frame >= INVITED_AT ? ["meera@todone.today"] : [] } : null);
  setReplies(REPLY_AT.filter((at) => frame >= at).length);
  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      <Sequence durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      {ORDER.map((k) => {
        const sc: Scene = SCENES[k];
        return (
          <Sequence key={k} from={FROM[k]} durationInFrames={sc.dur}>
            <LiveScene pre={PRE[k]} steps={sc.steps} caption={sc.caption} dur={sc.dur} after={sc.after} />
          </Sequence>
        );
      })}
      <Sequence from={END} durationInFrames={OUTRO}>
        <End />
      </Sequence>
      <Sounds />
    </AbsoluteFill>
  );
};
