"use client";

// The homepage's hero notes, shared with the 3D hardware concepts: tick or reorder a note at the top of the page and
// the devices' screens update, the way a real one would sync with the app.
export type HeroTask = { title: string; done: boolean };

let tasks: HeroTask[] = [];
const subs = new Set<(t: HeroTask[]) => void>();

export function publishHero(next: HeroTask[]) {
  tasks = next;
  subs.forEach((f) => f(tasks));
}
export function onHero(f: (t: HeroTask[]) => void) {
  subs.add(f);
  if (tasks.length) f(tasks);
  return () => void subs.delete(f);
}
