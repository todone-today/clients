// A scene is the whole signed-in app (the real TodoApp: sidebar, header, panels) and a list of steps done to it:
// clicks, typing, and drags. A click and typing go into the app the way a person's would (a DOM click, the input's
// value); a drop is the edit the app's own drop makes, applied to its store, while the cursor carries a copy of the
// real element across. From each step's frame on, the app is mounted fresh and the steps so far are replayed, so any
// frame renders on its own and in any order.
import { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { TodoApp } from "@/app/app/TodoApp";
import { update, useLists } from "@/lib/store";
import app from "@/app/app/app.module.css";
import type { List } from "@todone/sdk/tasks";
import { EDITS, type EditName } from "./seed";
import { loaded, startFrom } from "./mocks/actions";
import { reseed } from "./setup";
import { Caption, Carried, Cursor, Fade, type Key, Ring, type SfxName, cursorAt as curAt, inStage, mid, useTargets } from "./kit";

export type Finder = () => Element | null | undefined;
export type Step =
  | { at: number; click: Finder; sfx?: SfxName; fake?: boolean } // fake: the cursor clicks; the frame does the rest
  // clicks in and types; then presses Enter (`enter`, the app's own submit) or makes `then`'s edit
  | { at: number; type: string; into: Finder; dur: number; enter?: boolean; then?: EditName; sfx?: SfxName }
  | { at: number; drag: Finder; to: Finder; edit: EditName; lift?: number; sfx?: SfxName } // lands at `at`
  | { at: number; wait: true; sfx?: SfxName }; // nothing done: the frame changes something (a reply comes in)

export const end = (s: Step) => s.at + ("dur" in s ? s.dur : 0);
const none: Finder = () => null;
const point = (s: Step): Finder => ("click" in s ? s.click : "into" in s ? s.into : "to" in s ? s.to : none);
const start = (s: Step): Finder => ("drag" in s ? s.drag : point(s));
const lift = (s: Step) => ("drag" in s ? (s.lift ?? 26) : 0);

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const setValue = (el: Element | null | undefined, v: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
  if (!proto) return;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, v);
  el!.dispatchEvent(new Event("input", { bubbles: true }));
};

function LiveApp({ pre, steps, typing, after, onReady }: { pre: readonly EditName[]; steps: Step[]; typing?: { step: Step; chars: number }; after?: () => void; onReady: () => void }) {
  const [handle] = useState(() => {
    startFrom(pre); // what the app loads when it opens
    reseed();
    return delayRender("the app, replaying the scene so far");
  });
  const [loadsBefore] = useState(loaded);
  const { lists } = useLists();
  const now = useRef<List[] | null>(lists);
  now.current = lists;
  // A drop's edit, made to the lists it changes (as the app's own drop does, through the store).
  const edit = (e: EditName) => {
    const before = now.current ?? [];
    for (const l of EDITS[e](before)) if (!before.includes(l)) update(l.id, () => l);
  };
  useLayoutEffect(() => {
    (async () => {
      // The app loads its lists once it's mounted (and shows them a moment later): act only after that.
      for (let i = 0; i < 150 && loaded() === loadsBefore; i++) await tick(20);
      await tick();
      for (const s of steps) {
        if ("click" in s) !s.fake && (s.click() as HTMLElement | null)?.click();
        else if ("into" in s) {
          const el = s.into();
          setValue(el, s.type);
          await tick();
          if (s.enter) (el as HTMLInputElement | null)?.form?.requestSubmit();
          if (s.then) edit(s.then);
          // The typed text stays in its box unless the app clears it (as the add box does after Enter).
          if (s.then && !s.enter) setValue(el, "");
        } else if ("drag" in s) edit(s.edit);
        await tick();
      }
      if (typing && "into" in typing.step) {
        setValue(typing.step.into(), typing.step.type.slice(0, typing.chars));
        await tick();
      }
      await tick();
      after?.();
      await tick();
      onReady(); // so the scene measures the app as the steps left it
      await tick();
      continueRender(handle);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <TodoApp />;
}

// The app as it is on a laptop screen (1600×900), scaled to fill the frame.
export const SCALE = 0.8;
// `after`: anything to set up once the steps so far are replayed (e.g. scroll to what the scene is showing).
export function LiveScene({ pre = [], steps, caption, dur, after }: { pre?: readonly EditName[]; steps: Step[]; caption: string; dur: number; after?: () => void }) {
  const f = useCurrentFrame();
  const [, remeasure] = useState(0);
  const done = steps.filter((s) => f >= end(s));
  const acts = (s?: Step) => s && !("wait" in s);
  // The cursor's next and last: steps it does (a "wait" is the world acting, not the cursor).
  const next = steps.slice(done.length).find(acts);
  const last = done.filter(acts).at(-1);
  const typing = next && "into" in next && f >= next.at && f < end(next) ? { step: next, chars: Math.min(next.type.length, Math.floor(((f - next.at) / next.dur) * next.type.length) + 1) } : undefined;
  const { ref, at } = useTargets({
    from: () => next && start(next)(),
    to: () => next && point(next)(),
    last: () => last && point(last)(),
  });
  // The cursor: from where it last acted, to the next step (picking up a drag's element first).
  const here = at.last ? mid(at.last) : at.from ? { x: mid(at.from).x + 140, y: mid(at.from).y + 110 } : { x: 900, y: 520 };
  const keys: Key[] = [{ f: last ? end(last) + 2 : 0, ...here }];
  if (next) {
    const a = mid(at.from);
    const b = mid(at.to);
    if ("drag" in next)
      keys.push({ f: next.at - lift(next) - 4, ...a }, { f: next.at - lift(next), ...a, down: true }, { f: next.at, ...b, down: true }, { f: next.at + 3, ...b });
    else keys.push({ f: next.at - 5, ...b }, { f: next.at - 2, ...b, down: true }, { f: next.at + 1, ...b });
  }
  const carrying = next && "drag" in next && f >= next.at - lift(next) && at.from;
  const cur = carrying ? curAt(keys, f) : null;
  return (
    <AbsoluteFill ref={ref}>
      {/* The frame never scrolls: the app's own scrollIntoView (the calendar opening on now) would move it. */}
      <div data-stage onScroll={(e) => e.currentTarget.scrollTo(0, 0)} style={{ position: "absolute", inset: 0, width: 1280 / SCALE, height: 720 / SCALE, overflow: "hidden", transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
        <LiveApp key={`${done.length}:${typing?.chars ?? 0}`} pre={pre} steps={done} typing={typing} after={after} onReady={() => remeasure((n) => n + 1)} />
      </div>
      {/* The XP tile pops "+N" when XP goes up, which a fresh mount does as the lists load: not a real gain. */}
      <style>{`.${app.xpPop}{display:none}`}</style>
      {/* Dialogs (opened in place, see setup.ts): centred over the app, the rest dimmed like a modal's backdrop. */}
      {/* A tilted card around one would hold it in place, so what holds an open dialog stays straight meanwhile. */}
      <style>{`[data-stage] dialog[open]{position:fixed;inset:0;margin:auto;z-index:45;box-shadow:0 0 0 100vmax rgba(0,0,0,.5),var(--lift)} [data-stage] :has(dialog[open]){transform:none!important;rotate:none!important;filter:none!important}`}</style>
      <Caption text={caption} duration={dur} />
      {carrying && cur && <Carried item={at.from} x={cur.x} y={cur.y} scale={1} />}
      {last && f - end(last) < 18 && at.last && <Ring x={mid(at.last).x} y={mid(at.last).y} f={f - end(last)} />}
      <Cursor keys={keys} />
      <Fade f={f} dur={dur} />
    </AbsoluteFill>
  );
}

// ---- Finders ----------------------------------------------------------------------------------------------------
export const sideList = (name: string): Finder => () => inStage(`aside button.${app.listBtn}`).find((b) => b.textContent?.includes(name));
export const tab = (name: string): Finder => () => inStage(`nav button[aria-label='${name}']`)[0];
export const xpTile: Finder = () => inStage(`button.${app.xpTile}`)[0];
export const tickBox = (title: string): Finder => () => inStage(`button[role='checkbox'][aria-label='${title}']`)[0];
export const note = (id: string): Finder => () => inStage(`[data-id='${id}']`)[0];
export const sticker = (label: string): Finder => () => inStage(`.${app.stick}`).find((b) => b.textContent?.trim() === label);
export const button = (text: string): Finder => () => inStage("button").find((b) => b.textContent?.replace(/\s+/g, " ").trim() === text);
export const field = (sel: string): Finder => () => inStage(sel)[0];
export const claim = (reward: string): Finder => () =>
  inStage("button").find((b) => b.textContent?.trim() === "Claim" && b.closest("li")?.textContent?.includes(reward)) ??
  inStage("li").find((li) => li.querySelector("h3")?.textContent === reward); // once claimed: its card
