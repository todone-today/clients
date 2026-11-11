// Scenes with the whole app: the real TodoApp in its demo mode (the /demo page: no account, changes stay in memory),
// seeded with the video's own sample lists, goals and rewards. Its views can only be changed by clicking, like a
// person would, so each scene is a list of clicks: from a click's frame on, the app is mounted fresh and replays the
// clicks so far (any frame renders on its own), and the cursor walks to the next one.
import { useLayoutEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import type { GoalItem } from "@todone/sdk/goals";
import type { List, Task } from "@todone/sdk/tasks";
import { TodoApp } from "@/app/app/TodoApp";
import { startDemo } from "@/lib/store";
import app from "@/app/app/app.module.css";
import { ME } from "./mocks/auth-client";
import { day, list, today } from "./data";
import { Caption, Cursor, Fade, type Key, Ring, type SfxName, Stage, inStage, mid, useTargets } from "./kit";

// ---- Sample data ------------------------------------------------------------------------------------------------
const DAY = 86_400_000;
const ago = (d: number) => Date.now() - d * DAY;
const goal = (t: Task, g: string) => ({ ...t, goal: g });

function seed(): List[] {
  const week = list(
    "This week",
    `- [ ] Book flights to Goa 📅 ${today} ⏫\n  - [ ] Pack the chargers\n- [ ] Call the landlord\n- [ ] Water the plants 🔁 every week\n- [ ] Read 20 pages\n`,
    "week",
  );
  week.tasks = week.tasks.map((t) => (t.title === "Read 20 pages" ? goal(t, "g-read") : t));
  const goa = list(
    "Trip to Goa",
    `- [x] Pick the dates\n- [x] Book a stay near Anjuna\n- [ ] Rent a scooter\n- [ ] Pack sunscreen\n- [ ] Try the fish thali\n`,
    "goa",
  );
  goa.tasks = goa.tasks.map((t) => goal(t, "g-goa"));
  const groceries = list("Groceries", "- [ ] Oat milk\n- [ ] Coffee beans\n- [ ] Bananas\n- [ ] Basil\n", "groceries");
  const work = list("Work", "- [ ] Send the invoice\n- [ ] Review Kabir's design\n- [ ] Plan next sprint\n", "work");
  const ideas = list("Brainstorm", "- [ ] A reading nook by the window\n- [ ] Learn to make pasta\n- [ ] Weekend in Hampi?\n- [ ] Start a herb garden\n", "ideas");
  const items: GoalItem[] = [
    { t: "goal", id: "g-read", title: "Read before bed", kind: "habit", perWeek: 5, list: week.id, why: "Calmer evenings", created: ago(30) },
    { t: "goal", id: "g-run", title: "Run 10 km", kind: "target", start: 3, target: 10, unit: "km", why: "The Goa beach run", created: ago(40) },
    { t: "goal", id: "g-goa", title: "Plan the Goa trip", kind: "outcome", list: goa.id, by: day(20), created: ago(10) },
    { t: "reward", id: "r-movie", title: "Movie night", cost: 120 },
    { t: "reward", id: "r-book", title: "A new book", cost: 300 },
    { t: "reward", id: "r-away", title: "A weekend away", cost: 1500 },
    ...[0, 1, 2].map((d): GoalItem => ({ t: "log", id: `l-read-${d}`, goal: "g-read", at: ago(d), value: 1, by: ME.id })),
    ...([[30, 3], [14, 5], [3, 6.5]] as const).map(([d, v]): GoalItem => ({ t: "log", id: `l-run-${d}`, goal: "g-run", at: ago(d), value: v, by: ME.id })),
    ...["Paid the rent", "Fixed the tap", "Sent the photos", "Cleaned the desk", "Called the bank", "Booked the dentist", "Sorted the bills", "Mailed the parcel"].map(
      (title, i): GoalItem => ({ t: "win", id: `w-${i}`, title, at: ago(i + 1), xp: 20, by: ME.id }),
    ),
  ];
  return [week, goa, groceries, work, { ...ideas, kind: "ideas" as const }, { ...list("Goals", "", "goals"), kind: "goals" as const, tasks: items as unknown as Task[] }].map(
    (l, i) => ({ ...l, position: i + 1 }),
  );
}

// Seeded once up front too: the list-only scenes read goals from the same store, so every frame sees the same ones
// whichever order frames render in.
startDemo(seed());

// ---- The app, replaying clicks ----------------------------------------------------------------------------------
export type Click = { at: number; find: () => Element | null | undefined; sfx?: SfxName };
const tick = () => new Promise((r) => setTimeout(r, 30));

function LiveApp({ clicks, onReady }: { clicks: Click[]; onReady: () => void }) {
  const [handle] = useState(() => delayRender("app clicks"));
  useLayoutEffect(() => {
    startDemo(seed());
    (async () => {
      for (const c of clicks) {
        await tick();
        (c.find() as HTMLElement | null | undefined)?.click();
      }
      await tick();
      onReady(); // so the scene measures the app as the clicks left it
      await tick();
      continueRender(handle);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <TodoApp demo />;
}

export function AppScene({ clicks, caption, dur }: { clicks: Click[]; caption: string; dur: number }) {
  const f = useCurrentFrame();
  const [, remeasure] = useState(0);
  const done = clicks.filter((c) => f >= c.at).length;
  const next = clicks[done];
  const last = clicks[done - 1];
  // Where the cursor goes next, and where it last clicked (if that's still on screen).
  const { ref, at } = useTargets({ next: () => next?.find(), last: () => last?.find() });
  const to = mid(at.next ?? at.last);
  const from = at.last ? mid(at.last) : { x: to.x + 160, y: to.y + 120 };
  const keys: Key[] = next
    ? [
        { f: last ? last.at + 4 : 0, x: from.x, y: from.y },
        { f: next.at - 6, x: to.x, y: to.y },
        { f: next.at - 2, x: to.x, y: to.y, down: true },
        { f: next.at, x: to.x, y: to.y },
      ]
    : [{ f: 0, x: from.x, y: from.y }];
  return (
    <AbsoluteFill ref={ref}>
      {/* The demo's own extras (its "this is a demo" bar, "Make an account") aren't part of the app being shown. */}
      <style>{`.${app.demoBar},.${app.signUp}{display:none}`}</style>
      <Stage top={64} scale={0.8}>
        <LiveApp key={done} clicks={clicks.slice(0, done)} onReady={() => remeasure((n) => n + 1)} />
      </Stage>
      <Caption text={caption} duration={dur} />
      {last && f - last.at < 18 && at.last && <Ring x={mid(at.last).x} y={mid(at.last).y} f={f - last.at} />}
      <Cursor keys={keys} />
      <Fade f={f} dur={dur} />
    </AbsoluteFill>
  );
}

// ---- Finders ----------------------------------------------------------------------------------------------------
const byText = (sel: string, text: string) => () => inStage(sel).find((b) => b.textContent?.replace(/\s+/g, " ").trim() === text);
export const sideList = (name: string) => () => inStage(`aside button.${app.listBtn}`).find((b) => b.textContent?.includes(name));
export const tab = (name: string) => () => inStage(`nav button[aria-label='${name}']`)[0];
export const xpTile = () => inStage(`button.${app.xpTile}`)[0];
export const claim = (reward: string) => () =>
  inStage("button").find((b) => b.textContent?.trim() === "Claim" && b.closest("li")?.textContent?.includes(reward)) ??
  // once claimed, the button is gone: the reward's card
  inStage("li").find((li) => li.querySelector("h3")?.textContent === reward);
export { byText };
