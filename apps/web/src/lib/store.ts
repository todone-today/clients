"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type List, type Task, uid } from "./tasks";

// ponytail: lists live in this browser only until accounts and cloud sync land.
const KEY = "todone:lists:v1";

const starter = (): List[] => [
  {
    id: uid(),
    name: "inbox",
    updated: Date.now(),
    tasks: [
      { id: uid(), title: "Tick me off", done: false, sub: [] },
      {
        id: uid(),
        title: "Plan the week",
        done: false,
        est: 30,
        sub: [{ id: uid(), title: "Pick three things that matter", done: false, sub: [] }],
      },
    ],
  },
];

function load(): List[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as List[];
  } catch {}
  return starter();
}

// One in-memory copy shared by every component, saved on each change.
let cache: List[] | null = null;
const subs = new Set<() => void>();

const snapshot = () => (cache ??= load());

function commit(next: List[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  subs.forEach((f) => f());
}

function subscribe(f: () => void) {
  subs.add(f);
  // Another tab changed the lists: take its version.
  const on = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = load();
    f();
  };
  addEventListener("storage", on);
  return () => {
    subs.delete(f);
    removeEventListener("storage", on);
  };
}

// Maps a task (or subtask) by id; the callback returns the new task, or null to delete it.
export function mapTask(tasks: Task[], id: string, f: (t: Task) => Task | null): Task[] {
  return tasks.flatMap((t) => {
    if (t.id === id) {
      const r = f(t);
      return r ? [r] : [];
    }
    return [{ ...t, sub: mapTask(t.sub, id, f) }];
  });
}

export function useLists() {
  // null while rendering on the server: lists exist only in the browser.
  const lists = useSyncExternalStore(subscribe, snapshot, () => null);

  const update = useCallback((id: string, f: (l: List) => List | null) => {
    commit(
      snapshot().flatMap((l) => {
        if (l.id !== id) return [l];
        const r = f(l);
        return r ? [{ ...r, updated: Date.now() }] : [];
      }),
    );
  }, []);

  const add = useCallback((name: string, tasks: Task[] = []) => {
    const l: List = { id: uid(), name, tasks, updated: Date.now() };
    commit([...snapshot(), l]);
    return l.id;
  }, []);

  return { lists, update, add };
}
