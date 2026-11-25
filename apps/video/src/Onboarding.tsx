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
const inStageText = (sel: string, text: string): Finder => () => inStage(sel).find((b) => b.textContent?.replace(/\s+/g, " ").trim().startsWith(text));
// The calendar: a task's card, and a day's column (where a drop lands).
const calTask = (title: string): Finder => () => inStage(`[aria-label='${title}']`)[0];
const calDay = (d: string): Finder => () => inStage(`[data-drop$='|day:${d}']`)[0];
// Sort: the card on top, a side's label, and the deck's own buttons (what a throw that way does).
const sortCard: Finder = () => inStage(`.${app.sortCard}`)[0];
const sortSide = (side: string): Finder => () => inStage(`.${app.sortTarget}[data-side='${side}']`)[0];
const sortChoice = (label: string): Finder => () => inStage(".sr-only button").find((b) => b.textContent === label);
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
    dur: 60,
    caption: "Add a task: type it, press Enter",
    makes: ["added"],
    steps: [{ at: 10, into: field("#ask-bar"), type: TYPED, dur: 28, then: "added", sfx: "pop" }],
  },
  stickers: {
    dur: 100,
    caption: "Drop stickers on it: when, priority, repeat",
    makes: ["today", "high", "weekly"],
    steps: [
      { at: 10, click: field("button[aria-label='Show stickers']"), sfx: "click" },
      { at: 36, drag: sticker("Today"), to: note(FLIGHT), edit: "today", sfx: "pop" },
      { at: 64, drag: sticker("High"), to: note(FLIGHT), edit: "high", sfx: "pop" },
      { at: 92, drag: sticker("Weekly"), to: note("t-water-the-plants"), edit: "weekly", sfx: "pop" },
    ],
  },
  steps: {
    dur: 55,
    caption: "Drop one note on another: it becomes a step",
    makes: ["step"],
    steps: [{ at: 38, drag: note("t-pack-the-chargers"), to: note(FLIGHT), edit: "step", lift: 26, sfx: "thud" }],
  },
  brainstorm: {
    dur: 75,
    caption: "Jot ideas, then drop one into a list",
    makes: ["idea"],
    steps: [
      { at: 10, click: sideList("Brainstorm"), sfx: "click" },
      { at: 62, drag: note(IDEA), to: sideList("This week"), edit: "idea", lift: 28, sfx: "thud" },
    ],
  },
  sort: {
    dur: 100,
    caption: "Sort: throw each card to today, this week or later",
    makes: [],
    steps: [
      { at: 10, click: sideList("Sort"), sfx: "click" },
      { at: 40, drag: sortCard, to: sortSide("right"), act: sortChoice("Today"), lift: 18, sfx: "whoosh" },
      { at: 66, drag: sortCard, to: sortSide("up"), act: sortChoice("This week"), lift: 16, sfx: "whoosh" },
      { at: 92, drag: sortCard, to: sortSide("left"), act: sortChoice("Later"), lift: 16, sfx: "whoosh" },
    ],
  },
  calendar: {
    dur: 85,
    caption: "Plan the week: drag a task to another day",
    makes: ["planned"],
    steps: [
      { at: 10, click: tab("Calendar"), sfx: "click" },
      { at: 26, click: button("Week"), sfx: "click" },
      { at: 70, drag: calTask(TYPED), to: calDay(day(1)), edit: "planned", lift: 28, sfx: "thud" },
    ],
  },
  goal: {
    dur: 70,
    caption: "Goals: tap Did it today and watch it fill",
    makes: [],
    steps: [
      { at: 10, click: tab("Goals"), sfx: "click" },
      { at: 44, click: inStageText("button", "Did it today"), sfx: "chime" },
    ],
  },
  rewards: {
    dur: 70,
    caption: "Finished tasks earn karma points: spend them on a treat",
    makes: [],
    steps: [
      { at: 8, click: tab("Rewards"), sfx: "click" },
      { at: 46, click: claim("Movie night"), sfx: "chime" },
    ],
  },
  share: {
    dur: 120,
    after: toConversation,
    caption: "Share a task by link: they reply, no account needed",
    makes: ["shared", "finished"],
    steps: [
      { at: 8, click: sideList("This week"), sfx: "click" },
      { at: 20, click: taskTitle(FLIGHT), sfx: "click" },
      { at: 34, click: field("button[aria-label='Share']"), sfx: "click" },
      { at: 46, click: button("I Understand"), sfx: "pop" },
      { at: 64, wait: true, sfx: "ding" },
      { at: 84, wait: true, sfx: "ding" },
      { at: 104, click: field("button[aria-label='Done']"), sfx: "chime" },
    ],
  },
  team: {
    dur: 80,
    caption: "Plan together: invite people to a team",
    makes: [],
    steps: [
      { at: 10, click: button("Team settings"), sfx: "click" },
      { at: 24, into: field("#invite-email"), type: "meera@todone.today", dur: 28 },
      { at: 62, click: button("Invite"), sfx: "ding", fake: true },
    ],
  },
} satisfies Record<string, Scene>;

// The pace: slow enough to read each caption, and the whole tour about a minute.
const PACE: Partial<Record<keyof typeof RAW, number>> = { share: 1.4 };
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
const SCENES = Object.fromEntries(Object.entries(RAW).map(([n, sc]) => [n, slower(sc, PACE[n as keyof typeof RAW] ?? 2)])) as unknown as {
  [K in keyof typeof RAW]: Omit<(typeof RAW)[K], "dur" | "steps"> & { dur: number; steps: Step[] };
};

// ---- Timeline ---------------------------------------------------------------------------------------------------
const INTRO = 45;
const OUTRO = 60;
export const ORDER = ["create", "stickers", "steps", "brainstorm", "sort", "calendar", "goal", "rewards", "share", "team"] as const;
type Name = (typeof ORDER)[number];
export const FROM = {} as Record<Name, number>;
const PRE = {} as Record<Name, EditName[]>; // each scene starts from what the ones before it made
ORDER.reduce(
  (acc, k) => ((FROM[k] = acc.t), (PRE[k] = acc.made), { t: acc.t + SCENES[k].dur, made: [...acc.made, ...(SCENES[k] as Scene).makes] }),
  { t: INTRO, made: [] as EditName[] },
);
const END = FROM.team + SCENES.team.dur;
export const DURATION = END + OUTRO;
// The team scene is in a team workspace (Home), with Meera invited once Invite is; the shared task's replies arrive
// at the share scene's waits.
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
  setTheme("night");
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
