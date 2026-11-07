import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";

// New anonymous comments on shared tasks, for the badge on their cards. The server counts guest comments per share;
// how many of those you've seen is remembered in this browser, and opening the task's panel catches up.
let counts: Record<string, number> = {};
const listeners = new Set<() => void>();
const KEY = "todone:seen";
const seen = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};
let snapshot = "";
const emit = () => {
  snapshot = JSON.stringify([counts, seen()]);
  listeners.forEach((l) => l());
};
const refresh = () =>
  api<Record<string, number>>("GET", "/task-shares")
    .then((c) => {
      counts = c;
      emit();
    })
    .catch(() => {}); // the demo and signed-out pages have no server: no badges

let timer: ReturnType<typeof setInterval> | undefined;
const subscribe = (l: () => void) => {
  listeners.add(l);
  if (listeners.size === 1) {
    refresh();
    timer = setInterval(
      () => document.visibilityState === "visible" && refresh(),
      20_000,
    );
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) clearInterval(timer);
  };
};

// The panel calls this with the number of guest comments it's showing.
export function markSeen(share: string, n: number) {
  const s = seen();
  if (s[share] === n) return;
  s[share] = n;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  counts[share] = Math.max(counts[share] ?? 0, n);
  emit();
}

export function useUnread(share: string | undefined) {
  useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => "",
  );
  if (!share) return 0;
  return Math.max(0, (counts[share] ?? 0) - (seen()[share] ?? 0));
}
