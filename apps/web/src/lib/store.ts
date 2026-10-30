"use client";

import { useSyncExternalStore } from "react";
import { createList, deleteList, fetchLists, reorderLists, saveList } from "@/app/app/actions";
import { type List, type Task } from "./tasks";

// Lists from before accounts, kept in the browser; imported once into the personal workspace.
const LOCAL = "todone:lists:v1";

// What the UI shows (server state plus edits still in flight), and the last state the server confirmed.
let cache: List[] | null = null;
let server: List[] = [];
let error = "";
let queue = Promise.resolve();
let pending = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function show(next: List[]) {
  cache = next;
  emit();
}

// Writes run one at a time so each starts from the version the previous one produced.
function enqueue(op: () => Promise<void>) {
  pending++;
  queue = queue
    .then(op)
    .then(() => void (error = ""))
    .catch(async () => {
      error = "Couldn't save the last change; showing what is saved.";
      server = await fetchLists().catch(() => server);
    })
    .finally(() => {
      if (!--pending) show(server);
    });
}

const put = (ls: List[], l: List) => (ls.some((x) => x.id === l.id) ? ls.map((x) => (x.id === l.id ? l : x)) : [...ls, l]);

export async function reload(personal: boolean) {
  cache = null;
  emit();
  await queue;
  try {
    server = await fetchLists();
    error = "";
  } catch {
    error = "Couldn't load your lists.";
  }
  show(server);
  if (personal) importLocal();
}

// Picks up teammates' edits; skipped while our own writes are in flight.
// ponytail: refreshes on focus only, no live push; add SSE/websockets if teams need to watch edits happen.
export async function refresh() {
  if (pending || !cache) return;
  const next = await fetchLists().catch(() => null);
  if (next && !pending) show((server = next));
}

function importLocal() {
  let local: List[] = [];
  try {
    local = JSON.parse(localStorage.getItem(LOCAL) ?? "[]");
  } catch {}
  if (!local.length) return;
  for (const l of local) add(l.name, l.tasks);
  enqueue(async () => localStorage.removeItem(LOCAL));
}

function subscribe(f: () => void) {
  subs.add(f);
  return () => void subs.delete(f);
}

export function add(name: string, tasks: Task[] = [], kind?: "ideas") {
  const id = crypto.randomUUID();
  show([...(cache ?? []), { id, name, tasks, updated: Date.now(), version: 0, ...(kind ? { kind } : {}) }]);
  enqueue(async () => {
    server = put(server, await createList(id, name, tasks, kind));
  });
  return id;
}

// The edit is a function, so when someone else saved first it is re-applied to their version.
export function update(id: string, f: (l: List) => List | null) {
  show(
    (cache ?? []).flatMap((l) => {
      if (l.id !== id) return [l];
      const r = f(l);
      return r ? [{ ...r, updated: Date.now() }] : [];
    }),
  );
  enqueue(async () => {
    for (let tries = 0; tries < 3; tries++) {
      const base = server.find((l) => l.id === id);
      if (!base) return;
      const next = f(base);
      if (!next) {
        await deleteList(id);
        server = server.filter((l) => l.id !== id);
        return;
      }
      const r = await saveList(id, base.version, next.name, next.tasks);
      server = r.list ? put(server, r.list) : server.filter((l) => l.id !== id);
      if (r.ok) return;
    }
    throw new Error("Too many conflicting edits");
  });
}

// Puts lists in the given order (the sidebar after a drag).
export function reorder(ids: string[]) {
  const pos = new Map(ids.map((id, i) => [id, i + 1]));
  const apply = (ls: List[]) => ls.map((l) => (pos.has(l.id) ? { ...l, position: pos.get(l.id) } : l));
  show(apply(cache ?? []));
  enqueue(async () => {
    await reorderLists(ids);
    server = apply(server);
  });
}

// Moves tasks to another list: out of one, onto the end of the other.
export function moveToList(from: string, to: string, take: (tasks: Task[]) => [Task[], Task[]]) {
  if (from === to) return;
  let taken: Task[] = [];
  update(from, (l) => {
    const [t, rest] = take(l.tasks);
    taken = t;
    return { ...l, tasks: rest };
  });
  update(to, (l) => ({ ...l, tasks: [...l.tasks, ...taken] }));
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
  const lists = useSyncExternalStore(
    subscribe,
    () => cache,
    () => null,
  );
  const err = useSyncExternalStore(
    subscribe,
    () => error,
    () => "",
  );
  return { lists, error: err, update, add };
}
