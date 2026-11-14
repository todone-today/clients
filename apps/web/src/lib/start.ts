// Getting started: a short checklist new people tick off by doing each thing, with XP for each. Some steps are seen in
// the data (a task ticked, a goal or a reward made); the rest are told by the part of the app where they happen.
export const START_STEPS = [
  { key: "ask", label: "Tell Ask todone your day", xp: 20 },
  { key: "add", label: "Add a task yourself", xp: 10 },
  { key: "done", label: "Tick a task off", xp: 10 },
  { key: "calendar", label: "Open the calendar", xp: 10 },
  { key: "goal", label: "Set a goal", xp: 15 },
  { key: "reward", label: "Pick a reward", xp: 15 },
] as const;
export type StartKey = (typeof START_STEPS)[number]["key"];
export const START_XP = START_STEPS.reduce((n, s) => n + s.xp, 0);

const EVENT = "todone:did";
// A step that happened here (Ask todone added things, a task was typed in, the calendar opened).
export const did = (key: StartKey) => dispatchEvent(new CustomEvent<StartKey>(EVENT, { detail: key }));
export const onDid = (f: (key: StartKey) => void) => {
  const on = (e: Event) => f((e as CustomEvent<StartKey>).detail);
  addEventListener(EVENT, on);
  return () => removeEventListener(EVENT, on);
};

// Where it's kept, per person on this device: "on" while it runs, "off" once finished or skipped. The XP itself
// is in the goals list like all XP, as wins with ids "start-<key>", so it shows everywhere.
const slot = (who: string) => `todone:start:${who}`;
export function readStart(who: string): "on" | "off" | null {
  try {
    const v = localStorage.getItem(slot(who));
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}
export function writeStart(who: string, v: "on" | "off") {
  try {
    localStorage.setItem(slot(who), v);
  } catch {
    // private window: it just won't be remembered
  }
}
export const startWinId = (key: StartKey) => `start-${key}`;
