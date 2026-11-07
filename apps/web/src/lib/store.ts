"use client";

import { useSyncExternalStore } from "react";
import { createList, deleteList, fetchLists, reorderLists, saveList } from "@/app/app/actions";
import { type List, type Task } from "@todone/sdk/tasks";
import { lockVault, openCache, sealCache } from "./vault";

// Lists from before accounts, kept in the browser; imported once into the personal workspace.
const LOCAL = "todone:lists:v1";
// The lists as the server last confirmed them, shown when the app opens offline: encrypted with your key, like
// everything else. Cleared on sign-out.
const SAVED = "todone:saved";
const OFFLINE = "You're offline. Changes save when you're back.";

// What the UI shows (server state plus edits still in flight), and the last state the server confirmed.
let cache: List[] | null = null;
let server: List[] = [];
let error = "";
let queue = Promise.resolve();
let pending = 0;
// The demo at /demo: the same app on sample lists, with every change kept in this tab only.
let demo = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function show(next: List[]) {
  cache = next;
  if (next === server && !demo)
    sealCache(server)
      .then((blob) => blob && localStorage.setItem(SAVED, blob))
      .catch(() => {});
  emit();
}

// Signing out: this browser forgets the lists and the keys.
export async function forget() {
  try {
    localStorage.removeItem(SAVED);
  } catch {}
  await lockVault();
}

// Offline, a write waits for the connection and then runs; the tab has to stay open until it does.
async function attempt(op: () => Promise<void>) {
  for (;;) {
    try {
      return await op();
    } catch (e) {
      if (navigator.onLine) throw e;
      error = OFFLINE;
      emit();
      await new Promise((r) => addEventListener("online", r, { once: true }));
    }
  }
}

// Writes run one at a time so each starts from the version the previous one produced.
function enqueue(op: () => Promise<void>) {
  if (demo) return;
  pending++;
  queue = queue
    .then(() => attempt(op))
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
    if (navigator.onLine) error = "Couldn't load your lists.";
    else return showSaved();
  }
  show(server);
  if (personal) importLocal();
}

export function startDemo(lists: List[]) {
  demo = true;
  error = "";
  show((server = lists));
}

export async function showSaved() {
  const blob = (() => {
    try {
      return localStorage.getItem(SAVED);
    } catch {
      return null;
    }
  })();
  server = (blob && (await openCache<List[]>(blob))) || server;
  error = OFFLINE;
  show(server);
}

// Picks up teammates' edits; skipped while our own writes are in flight.
// ponytail: polled (focus and every 20s), no live push; add SSE/websockets if teams need to watch edits happen.
export async function refresh() {
  if (demo || pending || !cache) return;
  const next = await fetchLists().catch(() => null);
  if (next && !pending) {
    if (error === OFFLINE) error = "";
    show((server = next));
  }
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

export function add(name: string, tasks: Task[] = [], kind?: "ideas" | "bin") {
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
      const r = await saveList(id, base.version, next.name, next.tasks, next.plain);
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

// The bin: deleted tasks wait 7 days in the workspace's "bin" list (end-to-end encrypted like any list), each with
// when it went and which list it came from, so they can be restored. Older ones are dropped on the next change.
const WEEK = 7 * 86_400_000;
export type Binned = Task & { binnedAt: number; from: string; fromName: string };
export const fresh = (ts: Task[]) => (ts as Binned[]).filter((t) => t.binnedAt > Date.now() - WEEK);
const binList = () => (cache ?? []).find((l) => l.kind === "bin");

export function toBin(tasks: Task[], from: { id: string; name: string }) {
  if (!tasks.length) return;
  const at = Date.now();
  const entries: Binned[] = tasks.map((t) => ({ ...t, binnedAt: at, from: from.id, fromName: from.name }));
  const bin = binList();
  if (bin) update(bin.id, (l) => ({ ...l, tasks: [...entries, ...fresh(l.tasks)] }));
  else add("Bin", entries, "bin");
}
// Takes tasks out of the bin without restoring them (the undo bar already put them back).
export function unbin(ids: string[]) {
  const bin = binList();
  if (bin) update(bin.id, (l) => ({ ...l, tasks: fresh(l.tasks).filter((t) => !ids.includes(t.id)) }));
}
// Puts a binned task back at the end of the list it came from, or of `fallback` if that list is gone.
export function restore(id: string, fallback: string) {
  const bin = binList();
  const entry = bin?.tasks.find((t) => t.id === id) as Binned | undefined;
  if (!bin || !entry) return;
  const { from } = entry;
  const task: Task = { ...entry };
  for (const k of ["binnedAt", "from", "fromName"]) delete (task as Record<string, unknown>)[k];
  const to = (cache ?? []).some((l) => l.id === from && !l.kind) ? from : fallback;
  update(bin.id, (l) => ({ ...l, tasks: fresh(l.tasks).filter((t) => t.id !== id) }));
  update(to, (l) => ({ ...l, tasks: [...l.tasks, task] }));
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
