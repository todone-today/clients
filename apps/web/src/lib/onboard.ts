import type { PlanGoal } from "@todone/sdk/plan";
import type { Reward } from "@todone/sdk/goals";

// First-run help, per person on this device: whether the short tour is due, which one-time tips were closed, and the
// goals and rewards Ask todone drafted from "About you" (shown when they first open Goals or Rewards). Kept in this
// browser only; losing it just means a tip shows again or the drafts are gone.
const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    // private window: it just won't be remembered
  }
};

export const tourDue = (who: string) => get(`todone:tour:${who}`) === "on";
export const setTour = (who: string, on: boolean) => set(`todone:tour:${who}`, on ? "on" : "off");

export type TipKey = "ideas" | "calendar" | "goals" | "rewards";
const tipsKey = (who: string) => `todone:tips:${who}`;
const closed = (who: string): string[] => {
  try {
    const v = JSON.parse(get(tipsKey(who)) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
export const tipOpen = (who: string, k: TipKey) => !closed(who).includes(k);
export const closeTip = (who: string, k: TipKey) => set(tipsKey(who), JSON.stringify([...new Set([...closed(who), k])]));

export type Suggested = { goals: PlanGoal[]; rewards: Reward[] };
const sugKey = (who: string) => `todone:suggest:${who}`;
export function suggested(who: string): Suggested {
  try {
    const v = JSON.parse(get(sugKey(who)) ?? "{}");
    return { goals: Array.isArray(v.goals) ? v.goals : [], rewards: Array.isArray(v.rewards) ? v.rewards : [] };
  } catch {
    return { goals: [], rewards: [] };
  }
}
export const suggest = (who: string, s: Suggested) =>
  set(sugKey(who), s.goals.length || s.rewards.length ? JSON.stringify(s) : null);
