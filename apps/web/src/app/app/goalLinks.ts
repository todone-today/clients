"use client";

// Goals shared by link (server actions/goalShares.ts). Goals are end-to-end encrypted, so what a link shows is a
// readable copy made here, with the owner's say-so: the goal, how it's measured, and its progress. While a goal is
// shared (or a challenge joined), every change to its progress republishes the copy, so the page stays live.
import { useEffect, useRef } from "react";
import { type Goal, type GoalItem, goalProgress, togetherShare } from "@todone/sdk/goals";
import type { Task } from "@todone/sdk/tasks";
import { api } from "@/lib/api";

export type Mode = "view" | "challenge";
export type Mine = {
  own: { slug: string; goal: string; mode: Mode }[];
  joined: { slug: string; goal: string }[];
  together: { slug: string; active: number; boost: boolean }[];
};
// The latest list of links, for the together bonus: what share of a goal's XP friends in its challenge add.
let latest: Mine | null = null;
export function shareFor(goal: string) {
  const slug = [...(latest?.own ?? []), ...(latest?.joined ?? [])].find((x) => x.goal === goal)?.slug;
  const t = latest?.together.find((x) => x.slug === slug);
  return t ? togetherShare(t.active, t.boost) : 0;
}
export const goalLink = (slug: string) => `${location.origin}/g/${slug}`;

// The readable copy of one goal: only what the public page shows.
export function snapshotOf(goal: Goal, tasks: Task[], items: GoalItem[]) {
  const p = goalProgress(goal, tasks, items);
  return {
    title: goal.title,
    kind: goal.kind,
    unit: goal.unit,
    start: goal.start,
    target: goal.target,
    perWeek: goal.perWeek,
    by: goal.by,
    current: p.current,
    towards: goal.kind === "target" ? p.towards : goal.kind === "outcome" ? (p.total ? p.done / p.total : 0) : 0,
    thisWeek: goal.kind === "daily" ? p.daysHit : p.thisWeek,
    weeks: p.weeks.map((w) => w.n),
    done: p.done,
    total: p.total,
    reached: !!goal.done,
  };
}

// Make (or get again) the link to one goal. A challenge needs Plus: the server says so (402).
export const shareGoal = (goal: Goal, mode: Mode, tasks: Task[], items: GoalItem[]) =>
  api<{ slug: string }>("POST", "/goal-shares", { goal: goal.id, mode, snapshot: snapshotOf(goal, tasks, items) });
export const unshareGoal = (slug: string) => api("DELETE", `/goal-shares/${slug}`);
export const joinGoal = (slug: string, goal: string) => api("POST", `/g/${slug}/join`, { goal });

// Keeps every shared (and joined) goal's copy up to date: on first load, then whenever progress changes, at most
// every few seconds, and only what actually changed.
export function useGoalLinks(tasks: Task[] | null, items: GoalItem[], on: boolean) {
  const mine = useRef<Mine | null>(null);
  const sent = useRef(new Map<string, string>());
  useEffect(() => {
    if (!on) return;
    const load = () =>
      api<Mine>("GET", "/goal-shares").then(
        (m) => void (mine.current = latest = m),
        () => {},
      );
    load();
    addEventListener(CHANGED, load);
    return () => removeEventListener(CHANGED, load);
  }, [on]);
  useEffect(() => {
    if (!on || !tasks) return;
    const t = setTimeout(() => {
      const m = mine.current;
      if (!m) return;
      for (const { slug, goal } of [...m.own, ...m.joined]) {
        const g = items.find((i): i is Goal => i.t === "goal" && i.id === goal);
        if (!g) continue;
        const body = JSON.stringify(snapshotOf(g, tasks, items));
        if (sent.current.get(slug) === body) continue;
        sent.current.set(slug, body);
        api("PUT", `/goal-shares/${slug}`, { snapshot: JSON.parse(body) }).catch(() => sent.current.delete(slug));
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [tasks, items, on]);
}
// Something was shared, unshared or joined: the list of links is read again.
export const CHANGED = "todone:goal-links";
export const linksChanged = () => dispatchEvent(new Event(CHANGED));

// Arriving from a shared goal's page (/g/…, "Join" or "Copy"): the link's ?goal=&do=, or what the page remembered in
// this browser (if sign-up lost the way). Read once, then forgotten.
export const INVITE = "todone:goal-invite";
export function takeInvite(): { slug: string; what: "join" | "clone" } | null {
  const q = new URLSearchParams(location.search);
  let slug = q.get("goal");
  let what = q.get("do");
  try {
    const saved = JSON.parse(localStorage.getItem(INVITE) ?? "null") as { slug: string; what: string; at: number } | null;
    localStorage.removeItem(INVITE);
    if (!slug && saved && Date.now() - saved.at < 86_400_000) ({ slug, what } = saved);
  } catch {}
  if (q.has("goal")) {
    q.delete("goal");
    q.delete("do");
    history.replaceState(null, "", location.pathname + (q.size ? `?${q}` : ""));
  }
  return slug && (what === "join" || what === "clone") ? { slug, what } : null;
}
// Told to the Goals page: a goal to start from (the dialog opens with it), and a line to say what happened.
export const GOAL_PRESET = "todone:goal-preset";
export type GoalPreset = { preset?: Partial<Goal>; note?: string };
