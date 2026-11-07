"use client";

// Reminders from the open app. Lists are end-to-end encrypted, so the server can't know what's due: any open todone
// tab checks every minute and shows the notification itself (a nudge shortly before a task's time, and at 8 the
// day's summary). Nothing leaves the device. Each one shows once, across tabs, by its key.
import { dueNotes, localNow } from "@todone/sdk/reminders";
import { fromB64u, plan, seal, toB64u } from "@todone/sdk/push";
import { api } from "./api";
import type { List } from "@todone/sdk/tasks";
import { useEffect, useState } from "react";

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

export const canNotify = () =>
  typeof window !== "undefined" && "Notification" in window;
export const remindersOn = () =>
  canNotify() &&
  Notification.permission === "granted" &&
  store.get(ON) === "on";
export function setReminders(on: boolean) {
  store.set(ON, on ? "on" : null);
  dispatchEvent(new Event(CHANGED));
}
const CHANGED = "todone:reminders-changed";

export type ReminderState =
  "loading" | "unsupported" | "off" | "on" | "blocked";
const readState = (): ReminderState =>
  !canNotify()
    ? "unsupported"
    : Notification.permission === "denied"
      ? "blocked"
      : remindersOn()
        ? "on"
        : "off";

// This device's reminders, the same everywhere they're shown (the bell, a task's panel). The browser asks for
// permission only from turnOn, which runs on a click: asking out of the blue mostly gets "Block", for good.
export function useReminders() {
  const [state, setState] = useState<ReminderState>("loading");
  useEffect(() => {
    const read = () => setState(readState());
    Promise.resolve().then(read);
    addEventListener(CHANGED, read);
    addEventListener("focus", read); // permission may have changed in the browser's settings
    return () => {
      removeEventListener(CHANGED, read);
      removeEventListener("focus", read);
    };
  }, []);
  const turnOn = async () => {
    if (!canNotify()) return;
    if (
      Notification.permission !== "granted" &&
      (await Notification.requestPermission()) !== "granted"
    ) {
      dispatchEvent(new Event(CHANGED));
      return;
    }
    setReminders(true);
    await pushOn().catch(() => {}); // without push, reminders still come while a tab is open
    notify(
      "Reminders are on",
      "todone will nudge you before a task's time.",
      `test:${Date.now()}`,
    ).catch(() => {});
  };
  return {
    state,
    turnOn,
    turnOff: () => {
      setReminders(false);
      pushOff().catch(() => {});
    },
    // Its own tag each time: one that's still in the notification centre would be replaced silently, not shown.
    test: () =>
      notify(
        "A test from todone",
        "Reminders work on this device.",
        `test:${Date.now()}`,
      ),
  };
}

// Where clicking a reminder goes: a task's own reminder opens that task, the summary the app.
export const urlFor = (key: string) =>
  key.startsWith("t:") ? `/app?task=${key.split(":")[1]}` : "/app";

export async function notify(title: string, body: string, tag: string) {
  const url = urlFor(tag);
  const reg = await navigator.serviceWorker
    ?.getRegistration("/")
    .catch(() => undefined);
  if (reg)
    await reg.showNotification(title, {
      body,
      tag,
      icon: "/icon.svg",
      data: { url },
    });
  else new Notification(title, { body, tag });
}

const itemsOf = (lists: List[]) =>
  lists
    .filter((l) => !l.kind)
    .flatMap((l) =>
      l.tasks
        .flatMap((t) => [t, ...t.sub])
        .map((task) => ({ task, list: l.name })),
    );

export function remindNow(lists: List[]) {
  if (!remindersOn()) return;
  const { today, nowMin } = localNow(
    new Date(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const items = itemsOf(lists);
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

// Reminders with todone closed (Web Push). The browser's push address goes to the server; the reminders themselves
// are sealed here for each of the person's browsers (sdk/push.ts), so the server only learns when to send them.
const canPush = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

// The service worker TodoApp registers (production builds only); `ready` would wait forever without one.
const worker = async () =>
  (await navigator.serviceWorker.getRegistration("/")) &&
  navigator.serviceWorker.ready;

async function pushOn() {
  const reg = canPush() && (await worker());
  if (!reg) return;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: fromB64u(
        (await api<{ key: string }>("GET", "/push/key")).key,
      ),
    }));
  await api("POST", "/push/devices", sub.toJSON());
}

async function pushOff() {
  const reg = canPush() && (await worker());
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  await api("DELETE", "/push/devices", { endpoint: sub.endpoint });
  await sub.unsubscribe();
}

let last = { sig: "", at: 0 };
// Plans the coming week from these lists and hands each of the person's browsers its sealed copy. Lists reload
// often, so it only resends when the plan changed (or every half hour, to drop what's been sent).
export async function schedulePush(lists: List[]) {
  if (!remindersOn() || !canPush() || !(await worker())) return;
  const notes = plan(itemsOf(lists), new Date());
  if (!last.at) await pushOn(); // this browser may have turned reminders on before push existed
  const devices =
    await api<{ id: string; p256dh: string; auth: string }[]>(
      "GET",
      "/push/devices",
    );
  const sig = JSON.stringify([notes, devices.map((d) => d.id)]);
  if (sig === last.sig && Date.now() - last.at < 30 * 60_000) return;
  last = { sig, at: Date.now() };
  await Promise.all(
    devices.map(async (d) =>
      api("PUT", `/push/devices/${d.id}/notes`, {
        notes: await Promise.all(
          notes.map(async (n) => ({
            at: n.at,
            body: toB64u(
              await seal(
                d,
                JSON.stringify({
                  title: n.title,
                  body: n.body,
                  tag: n.key,
                  url: urlFor(n.key),
                }),
              ),
            ),
          })),
        ),
      }),
    ),
  );
}
