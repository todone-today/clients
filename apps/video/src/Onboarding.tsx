// todone's onboarding video: eight scenes, each a frame range of the real app's components driven by sample data.
// Scenes are timed by frame (Sequence from/duration); everything inside reads the current frame, so any frame renders
// on its own. Sound cues are all in <Sounds /> at the bottom.
import { useEffect, useLayoutEffect } from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { type List, type Task } from "@todone/sdk/tasks";
import { ListView } from "@/app/app/TodoApp";
import { CalendarView } from "@/app/app/CalendarView";
import { Members } from "@/app/app/Workspaces";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import app from "@/app/app/app.module.css";
import { setTeam } from "./mocks/auth-client";
import { setTheme } from "./setup";
import { day, list, tasks, today } from "./data";
import { Caption, Carried, Cursor, type Key, Sfx, Stage, cursorAt as interpolateKeys, inStage, mid, usePop, useTargets } from "./kit";

// ---- Timeline (frames at 30fps) ----------------------------------------------------------------------------------
export const S = {
  intro: { from: 0, dur: 90 },
  create: { from: 90, dur: 150 },
  stickers: { from: 240, dur: 240 },
  steps: { from: 480, dur: 150 },
  calendar: { from: 630, dur: 180 },
  team: { from: 810, dur: 165 },
  theme: { from: 975, dur: 120 },
  end: { from: 1095, dur: 120 },
};
export const DURATION = S.end.from + S.end.dur; // 1215 frames, 40.5 s

// Moments inside scenes (relative to the scene's start), shared by the scene and its sound cues.
const T = {
  createEnter: 96, // the typed task is added
  stickerDrops: [70, 130, 190], // Today, High, Weekly land
  stepDrop: 92,
  calPick: 40,
  calDrop: 104,
  invite: 112,
  themeClick: 54,
};

const NIGHT_UNTIL = S.theme.from + T.themeClick; // the toggle in scene 7 switches to Day

// ---- Sample data ------------------------------------------------------------------------------------------------
const START = "- [ ] Call the landlord\n- [ ] Pack the chargers\n- [ ] Water the plants\n";
const typed = "Book flights to Goa";
const base = (more = "") => list("This week", START + more, "week");
const withNew = (patch: Partial<Task> = {}): List => {
  const l = base();
  const t = tasks(`- [ ] ${typed}\n`)[0];
  return { ...l, tasks: [...l.tasks, { ...t, id: "t-new", ...patch }] };
};
const noop = () => {};

// ---- Scenes -----------------------------------------------------------------------------------------------------
const Intro = () => {
  const f = useCurrentFrame();
  const logo = usePop(0, 10);
  const line = usePop(18, 14);
  return (
    <AbsoluteFill style={{ background: "var(--ground)", color: "var(--ink)", alignItems: "center", justifyContent: "center", gap: 28 }}>
      <div style={{ transform: `scale(${logo * 2.2}) rotate(${(1 - logo) * -12}deg)` }}>
        <Logo size={44} />
      </div>
      <p
        className="display"
        style={{
          fontSize: 76,
          lineHeight: 0.9,
          marginTop: 40,
          opacity: line,
          transform: `translateY(${(1 - line) * 30}px)`,
        }}
      >
        Plan your day, calmly.
      </p>
      <Fade f={f} dur={S.intro.dur} />
    </AbsoluteFill>
  );
};

// A short fade to the ground colour at a scene's end, so cuts feel soft.
const Fade = ({ f, dur }: { f: number; dur: number }) => (
  <AbsoluteFill
    style={{ background: "var(--ground)", opacity: interpolate(f, [dur - 8, dur], [0, 1], { extrapolateLeft: "clamp" }), pointerEvents: "none", zIndex: 70 }}
  />
);

// Types into a real input the component owns (its own state stays empty; only the DOM shows the letters).
function useTyping(selector: string, text: string, from: number, to: number) {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [from, to], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  useLayoutEffect(() => {
    const el = document.querySelector<HTMLInputElement>(selector);
    if (el) el.value = f < from ? "" : text.slice(0, n);
  });
}

const Create = () => {
  const f = useCurrentFrame();
  const added = f >= T.createEnter;
  useTyping("input[placeholder^='Add a task']", added ? "" : typed, 30, 80);
  const { ref, at } = useTargets({ input: "input[placeholder^='Add a task']", note: "[data-id='t-new']" });
  const pop = usePop(T.createEnter, 9);
  const L = added ? withNew() : base();
  const i = mid(at.input);
  const keys: Key[] = [
    { f: 0, x: 900, y: 600 },
    { f: 24, x: i.x - 120, y: i.y },
    { f: 28, x: i.x - 120, y: i.y, down: true },
    { f: 32, x: i.x - 120, y: i.y },
  ];
  return (
    <AbsoluteFill ref={ref}>
      <Stage>
        <PopNote id="t-new" scale={added ? 0.6 + pop * 0.4 : 1} />
        <ListView list={L} lists={[L]} update={noop} />
      </Stage>
      <Caption text="Add a task: type it, press Enter" duration={S.create.dur} />
      <Cursor keys={keys} />
      {added && at.note && <Ring x={mid(at.note).x} y={mid(at.note).y} f={f - T.createEnter} />}
      <Fade f={f} dur={S.create.dur} />
    </AbsoluteFill>
  );
};

// The new note pops: a style tag scales it from 60% as it lands.
const PopNote = ({ id, scale }: { id: string; scale: number }) => (
  <style>{`[data-id='${id}'] { transform: scale(${scale}); transform-origin: 50% 60%; }`}</style>
);
// A lime ring that spreads from where something landed.
const Ring = ({ x, y, f }: { x: number; y: number; f: number }) => {
  if (f > 18) return null;
  const r = 20 + f * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        border: "4px solid var(--lime)",
        borderRadius: "50%",
        opacity: 1 - f / 18,
        zIndex: 58,
        pointerEvents: "none",
      }}
    />
  );
};

const stickerBy = (label: string) => () =>
  inStage(`button.${app.stick}, span.${app.stick}`).find((b) => b.textContent?.trim() === label);

const Stickers = () => {
  const f = useCurrentFrame();
  const [d1, d2, d3] = T.stickerDrops;
  const L = withNew({
    ...(f >= d1 ? { due: today } : {}),
    ...(f >= d2 ? { pri: 1 as const } : {}),
    ...(f >= d3 ? { rep: "every week" } : {}),
  });
  const { ref, at } = useTargets({
    note: "[data-id='t-new']",
    when: stickerBy("Today"),
    high: stickerBy("High"),
    weekly: stickerBy("Weekly"),
  });
  const n = mid(at.note);
  const drags = [
    { s: at.when, drop: d1 },
    { s: at.high, drop: d2 },
    { s: at.weekly, drop: d3 },
  ];
  // Each sticker: reach it, pick it up, carry it onto the note, drop.
  const keys: Key[] = [{ f: 0, x: 700, y: 600 }];
  for (const { s, drop } of drags) {
    const p = mid(s);
    keys.push({ f: drop - 42, x: p.x, y: p.y }, { f: drop - 36, x: p.x, y: p.y, down: true }, { f: drop, x: n.x + 20, y: n.y, down: true }, { f: drop + 4, x: n.x + 20, y: n.y });
  }
  const carrying = drags.find(({ drop }) => f >= drop - 36 && f < drop);
  const c = keys.length ? interpolateKeys(keys, f) : { x: 0, y: 0 };
  const landed = drags.filter(({ drop }) => f >= drop).at(-1);
  return (
    <AbsoluteFill ref={ref}>
      <Stage>
        <ListView list={L} lists={[L]} update={noop} />
      </Stage>
      <Caption text="Drop stickers on it: when, priority, repeat" duration={S.stickers.dur} />
      {carrying && <Carried item={carrying.s} x={c.x} y={c.y} />}
      {landed && <Ring x={n.x} y={n.y} f={f - landed.drop} />}
      <Cursor keys={keys} />
      <Fade f={f} dur={S.stickers.dur} />
    </AbsoluteFill>
  );
};


// "Pack the chargers" dropped onto the new note, as its step.
const withStep = (L: List): List => ({
  ...L,
  tasks: L.tasks
    .filter((t) => t.title !== "Pack the chargers")
    .map((t) => (t.id === "t-new" ? { ...t, sub: [...t.sub, L.tasks.find((x) => x.title === "Pack the chargers")!] } : t)),
});

const Steps = () => {
  const f = useCurrentFrame();
  const drop = T.stepDrop;
  const before = withNew({ due: today, pri: 1, rep: "every week" });
  const L: List =
    f < drop
      ? before
      : withStep(before);
  const chargers = () =>
    inStage("[data-id]").find((el) => el.textContent?.includes("Pack the chargers") && !el.textContent.includes(typed));
  const { ref, at } = useTargets({ note: "[data-id='t-new']", step: chargers });
  const from = mid(at.step);
  const to = mid(at.note);
  const keys: Key[] = [
    { f: 0, x: 900, y: 620 },
    { f: 22, x: from.x, y: from.y },
    { f: 28, x: from.x, y: from.y, down: true },
    { f: drop - 14, x: to.x, y: to.y, down: true },
    { f: drop, x: to.x, y: to.y, down: true },
    { f: drop + 4, x: to.x, y: to.y },
  ];
  const c = interpolateKeys(keys, f);
  return (
    <AbsoluteFill ref={ref}>
      <Stage>
        <ListView list={L} lists={[L]} update={noop} />
      </Stage>
      <Caption text="Drop one note on another: it becomes a step" duration={S.steps.dur} />
      {f >= 28 && f < drop && <Carried item={at.step} x={c.x} y={c.y} />}
      {f >= drop && <Ring x={to.x} y={to.y} f={f - drop} />}
      <Cursor keys={keys} />
      <Fade f={f} dur={S.steps.dur} />
    </AbsoluteFill>
  );
};

const Calendar = () => {
  const f = useCurrentFrame();
  const target = day(1);
  const plan = list(
    "This week",
    `- [ ] Stand-up 📅 ${today} ⏰ 09:30 ⏱ 30m\n- [ ] Dentist 📅 ${day(2)} ⏰ 11:00 ⏱ 1h\n- [ ] Gym 📅 ${day(-1)} ⏰ 07:00 ⏱ 1h\n- [ ] ${typed}\n- [ ] Water the plants\n`,
    "week",
  );
  const L: List =
    f < T.calDrop
      ? plan
      : { ...plan, tasks: plan.tasks.map((t) => (t.title === typed ? { ...t, due: target, at: "10:00", est: 90 } : t)) };
  const tray = () => inStage("button, li, div").reverse().find((el) => el.textContent?.trim().startsWith(typed) && el.getBoundingClientRect().width < 400);
  const { ref, at } = useTargets({
    item: tray,
    hour: "span[data-hour='10']",
    col: () => inStage("button").find((b) => b.textContent?.replace(/\s+/g, " ").trim().endsWith(` ${+target.slice(8)}`)),
  });
  // Show the morning (the app itself opens on the current time, which depends on when this renders).
  useEffect(() => {
    const h = inStage("span[data-hour='7']")[0];
    // The week grid scrolls inside its own box: move whichever ancestor actually scrolls.
    let box = h?.parentElement;
    while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
    if (h && box) box.scrollTop += h.getBoundingClientRect().top - box.getBoundingClientRect().top - 130;
  });
  const p = mid(at.item);
  const dropAt = { x: mid(at.col).x, y: at.hour ? at.hour.y + 10 : 400 };
  const keys: Key[] = [
    { f: 0, x: 600, y: 600 },
    { f: T.calPick - 6, x: p.x, y: p.y },
    { f: T.calPick, x: p.x, y: p.y, down: true },
    { f: T.calDrop, x: dropAt.x, y: dropAt.y, down: true },
    { f: T.calDrop + 4, x: dropAt.x, y: dropAt.y },
  ];
  const c = interpolateKeys(keys, f);
  return (
    <AbsoluteFill ref={ref}>
      <Stage>
        <CalendarView lists={[L]} update={noop} />
      </Stage>
      <Caption text="Plan the week: drag tasks onto a time" duration={S.calendar.dur} />
      {f >= T.calPick && f < T.calDrop && <Carried item={at.item} x={c.x} y={c.y} />}
      {f >= T.calDrop && <Ring x={dropAt.x} y={dropAt.y} f={f - T.calDrop} />}
      <Cursor keys={keys} />
      <Fade f={f} dur={S.calendar.dur} />
    </AbsoluteFill>
  );
};

const Team = () => {
  const f = useCurrentFrame();
  const invited = f >= T.invite;
  setTeam({ members: 2, invited: invited ? ["meera@todone.today"] : [] });
  useTyping("#invite-email", invited ? "" : "meera@todone.today", 40, 95);
  const { ref, at } = useTargets({
    email: "#invite-email",
    invite: () => inStage("button").find((b) => b.textContent?.trim() === "Invite"),
  });
  const e = mid(at.email);
  const b = mid(at.invite);
  const keys: Key[] = [
    { f: 0, x: 900, y: 600 },
    { f: 30, x: e.x - 80, y: e.y },
    { f: 34, x: e.x - 80, y: e.y, down: true },
    { f: 38, x: e.x - 80, y: e.y },
    { f: T.invite - 6, x: b.x, y: b.y },
    { f: T.invite - 2, x: b.x, y: b.y, down: true },
    { f: T.invite + 2, x: b.x, y: b.y },
  ];
  return (
    <AbsoluteFill ref={ref}>
      <Stage>
        <Members />
      </Stage>
      <Caption text="Plan together: make a team, invite people" duration={S.team.dur} />
      <Cursor keys={keys} />
      <Fade f={f} dur={S.team.dur} />
    </AbsoluteFill>
  );
};

const Theme = () => {
  const f = useCurrentFrame();
  const L = withStep(withNew({ due: today, pri: 1, rep: "every week" }));
  const { ref, at } = useTargets({ toggle: `button.${app.tile}` });
  const t = mid(at.toggle);
  const keys: Key[] = [
    { f: 0, x: 700, y: 500 },
    { f: T.themeClick - 6, x: t.x, y: t.y },
    { f: T.themeClick - 2, x: t.x, y: t.y, down: true },
    { f: T.themeClick + 2, x: t.x, y: t.y },
  ];
  return (
    <AbsoluteFill ref={ref}>
      <Stage>
        <div style={{ position: "absolute", top: 18, right: 240, zIndex: 5 }}>
          <ThemeToggle tile={app.tile} />
        </div>
        <ListView list={L} lists={[L]} update={noop} />
      </Stage>
      <Caption text="Day or night: one tap" duration={S.theme.dur} />
      {f >= T.themeClick && <Ring x={t.x} y={t.y} f={f - T.themeClick} />}
      <Cursor keys={keys} />
      <Fade f={f} dur={S.theme.dur} />
    </AbsoluteFill>
  );
};

const End = () => {
  const logo = usePop(0, 10);
  const line = usePop(14, 14);
  return (
    <AbsoluteFill style={{ background: "var(--lime)", color: "var(--black)", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ transform: `scale(${logo * 2})` }}>
        <Logo size={44} />
      </div>
      <p className="display" style={{ fontSize: 64, marginTop: 30, opacity: line, transform: `translateY(${(1 - line) * 24}px)` }}>
        todone.today
      </p>
      <p style={{ font: "800 26px var(--sans)", opacity: line }}>Free · Open source · Encrypted</p>
    </AbsoluteFill>
  );
};

// ---- Sound cues (all of them, in one place) -------------------------------------------------------------------
const Sounds = () => (
  <>
    <Sfx at={S.intro.from} name="whoosh" />
    <Sfx at={S.intro.from + 22} name="chime" />
    <Sfx at={S.create.from + 28} name="click" volume={0.4} />
    <Sfx at={S.create.from + T.createEnter} name="pop" />
    {T.stickerDrops.map((d) => (
      <Sfx key={d} at={S.stickers.from + d} name="pop" />
    ))}
    <Sfx at={S.steps.from + T.stepDrop} name="pop" />
    <Sfx at={S.steps.from + T.stepDrop + 3} name="thud" volume={0.4} />
    <Sfx at={S.calendar.from + T.calPick} name="whoosh" volume={0.45} />
    <Sfx at={S.calendar.from + T.calDrop} name="thud" />
    <Sfx at={S.team.from + T.invite} name="ding" />
    <Sfx at={S.theme.from + T.themeClick} name="click" />
    <Sfx at={S.end.from} name="whoosh" />
    <Sfx at={S.end.from + 16} name="chime" />
    {/* Background music: drop a track into public/ and uncomment.
    <Audio src={staticFile("music.mp3")} volume={0.15} /> */}
  </>
);

// ---- The video --------------------------------------------------------------------------------------------------
export const Onboarding = () => {
  const frame = useCurrentFrame();
  setTheme(frame < NIGHT_UNTIL ? "night" : "day");
  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      <Sequence from={S.intro.from} durationInFrames={S.intro.dur}>
        <Intro />
      </Sequence>
      <Sequence from={S.create.from} durationInFrames={S.create.dur}>
        <Create />
      </Sequence>
      <Sequence from={S.stickers.from} durationInFrames={S.stickers.dur}>
        <Stickers />
      </Sequence>
      <Sequence from={S.steps.from} durationInFrames={S.steps.dur}>
        <Steps />
      </Sequence>
      <Sequence from={S.calendar.from} durationInFrames={S.calendar.dur}>
        <Calendar />
      </Sequence>
      <Sequence from={S.team.from} durationInFrames={S.team.dur}>
        <Team />
      </Sequence>
      <Sequence from={S.theme.from} durationInFrames={S.theme.dur}>
        <Theme />
      </Sequence>
      <Sequence from={S.end.from} durationInFrames={S.end.dur}>
        <End />
      </Sequence>
      <Sounds />
    </AbsoluteFill>
  );
};
