"use client";

// Reminders from the open app. Lists are end-to-end encrypted, so the server can't know what's due: any open todone
// tab checks every minute and shows the notification itself (a nudge shortly before a task's time, and at 8 the
// day's summary). Nothing leaves the device. Each one shows once, across tabs, by its key.
import { dueNotes, localNow } from "@todone/sdk/reminders";
import type { List } from "@todone/sdk/tasks";

const ON = "todone:reminders";
const SENT = "todone:reminded";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {}
  },
};

export const canNotify = () => typeof window !== "undefined" && "Notification" in window;
export const remindersOn = () => canNotify() && Notification.permission === "granted" && store.get(ON) === "on";
export function setReminders(on: boolean) {
  store.set(ON, on ? "on" : null);
}

export async function notify(title: string, body: string, tag: string) {
  const reg = await navigator.serviceWorker?.getRegistration("/").catch(() => undefined);
  if (reg) await reg.showNotification(title, { body, tag, icon: "/icon.svg" });
  else new Notification(title, { body, tag });
}

export function remindNow(lists: List[]) {
  if (!remindersOn()) return;
  const { today, nowMin } = localNow(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const items = lists
    .filter((l) => !l.kind)
    .flatMap((l) => l.tasks.flatMap((t) => [t, ...t.sub]).map((task) => ({ task, list: l.name })));
  let sent: string[] = [];
  try {
    sent = JSON.parse(store.get(SENT) ?? "[]");
  } catch {}
  const seen = new Set(sent);
  for (const n of dueNotes(items, today, nowMin)) {
    if (seen.has(n.key)) continue;
    seen.add(n.key);
    sent.push(n.key);
    notify(n.title, n.body, n.key).catch(() => {});
  }
  store.set(SENT, JSON.stringify(sent.slice(-300)));
}
