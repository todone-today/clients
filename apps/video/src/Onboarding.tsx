// todone's onboarding video: the whole signed-in app (src/live.tsx) on a sample account (src/seed.ts), one feature
// per scene, timed by frame. Sound cues and the music are in <Sounds /> at the bottom.
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "@/components/Logo";
import { setTeam } from "./mocks/auth-client";
import { setTheme } from "./setup";
import { FLIGHT, TYPED, day } from "./seed";
import { Fade, Sfx, inStage, usePop } from "./kit";
import { type Finder, LiveScene, type Step, button, claim, end, field, note, sideList, sticker, tab, tickBox, xpTile } from "./live";

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
// ---- The scenes: what each one does (frames at 30fps, from the scene's start) ------------------------------------
type Scene = { dur: number; caption: string; steps: Step[]; pre?: Parameters<typeof LiveScene>[0]["pre"] };
const DONE = ["added", "today", "high", "weekly", "step", "planned"] as const;
const SCENES = {
  create: {
    dur: 80,
    caption: "Add a task: type it, press Enter",
    steps: [{ at: 14, into: field("#new-task"), type: TYPED, dur: 34, then: "added", sfx: "pop" }],
  },
  stickers: {
    dur: 115,
    caption: "Drop stickers on it: when, priority, repeat",
    pre: DONE.slice(0, 1),
    steps: [
      { at: 34, drag: sticker("Today"), to: note(FLIGHT), edit: "today", sfx: "pop" },
      { at: 68, drag: sticker("High"), to: note(FLIGHT), edit: "high", sfx: "pop" },
      { at: 102, drag: sticker("Weekly"), to: note("t-water-the-plants"), edit: "weekly", sfx: "pop" },
    ],
  },
  steps: {
    dur: 70,
    caption: "Drop one note on another: it becomes a step",
    pre: DONE.slice(0, 4),
    steps: [{ at: 46, drag: note("t-pack-the-chargers"), to: note(FLIGHT), edit: "step", lift: 30, sfx: "thud" }],
  },
  calendar: {
    dur: 105,
    caption: "Plan the week: drag tasks onto a time",
    pre: DONE.slice(0, 5),
    steps: [
      { at: 16, click: tab("Calendar"), sfx: "click" },
      { at: 84, drag: trayItem, to: tomorrowAt10, edit: "planned", lift: 34, sfx: "thud" },
    ],
  },
  lists: {
    dur: 75,
    caption: "Every list in the sidebar, one click away",
    pre: [...DONE],
    steps: [
      { at: 20, click: sideList("Trip to Goa"), sfx: "click" },
      { at: 50, click: sideList("Brainstorm"), sfx: "click" },
    ],
  },
  goals: {
    dur: 60,
    caption: "Goals: small steps, every one counted",
    pre: [...DONE],
    steps: [{ at: 18, click: tab("Goals"), sfx: "click" }],
  },
  rewards: {
    dur: 110,
    caption: "Tick tasks, earn XP, spend it on a treat",
    pre: [...DONE],
    steps: [
      { at: 22, click: tickBox("Call the landlord"), sfx: "ding" },
      { at: 54, click: xpTile, sfx: "click" },
      { at: 86, click: claim("Movie night"), sfx: "chime" },
    ],
  },
  team: {
    dur: 110,
    caption: "Plan together: invite people to a team",
    pre: [...DONE],
    steps: [
      { at: 16, click: button("Team settings"), sfx: "click" },
      { at: 34, into: field("#invite-email"), type: "meera@todone.today", dur: 36 },
      { at: 84, click: button("Invite"), sfx: "ding", fake: true },
    ],
  },
  theme: {
    dur: 50,
    caption: "Day or night: one tap",
    pre: [...DONE],
    steps: [{ at: 22, click: theToggle, sfx: "click", fake: true }],
  },
} satisfies Record<string, Scene>;

// ---- Timeline ---------------------------------------------------------------------------------------------------
const INTRO = 60;
const OUTRO = 80;
const ORDER = ["create", "stickers", "steps", "calendar", "lists", "goals", "rewards", "team", "theme"] as const;
const FROM = {} as Record<(typeof ORDER)[number], number>;
ORDER.reduce((t, k) => ((FROM[k] = t), t + SCENES[k].dur), INTRO);
const END = FROM.theme + SCENES.theme.dur;
export const DURATION = END + OUTRO;
// Night until the toggle is tapped; the team scene is in a team workspace (Home), with Meera invited once Invite is.
const NIGHT_UNTIL = FROM.theme + SCENES.theme.steps[0].at;
const INVITED_AT = FROM.team + SCENES.team.steps[2].at;

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
      <p style={{ font: "700 22px var(--sans)", opacity: more }}>Free · Open source · Encrypted</p>
    </AbsoluteFill>
  );
};

// ---- Sound ------------------------------------------------------------------------------------------------------
// The music is a placeholder made by make_sfx.py; drop a licensed track into public/ as music.wav to replace it.
const Sounds = () => (
  <>
    <Audio
      src={staticFile("music.wav")}
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
  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      <Sequence durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      {ORDER.map((k) => {
        const sc: Scene = SCENES[k];
        return (
          <Sequence key={k} from={FROM[k]} durationInFrames={sc.dur}>
            <LiveScene pre={sc.pre} steps={sc.steps} caption={sc.caption} dur={sc.dur} />
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
