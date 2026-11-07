"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Copy,
  Lock,
  LockOpen,
  RefreshCw,
} from "lucide-react";
import { Select } from "@/components/Select";
import { authClient } from "@/lib/auth-client";
import { label, rangeOf } from "@todone/sdk/calendar";
import { GOOGLE_SCOPE } from "@todone/sdk/integrations";
import { refresh, useLists } from "@/lib/store";
import { ListIcon } from "./listIcon";
import {
  connectGoogle,
  disconnectGoogle,
  getIntegrations,
  listShares,
  stopShare,
  setCalendar,
  setDiscord,
  setMarkdownSync,
  setNotion,
  syncNow,
} from "./integration-actions";
import { canNotify, notify, remindersOn, setReminders } from "@/lib/remind";
import s from "./app.module.css";

type State = Awaited<ReturnType<typeof getIntegrations>>;
type Key =
  | "notify"
  | "google"
  | "notion"
  | "markdown"
  | "link"
  | "discord"
  | "apple"
  | "reminders"
  | "keep";
type Act = (f: () => Promise<unknown>) => void;

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 6e4);
  return m < 1
    ? "just now"
    : m < 60
      ? `${m} min ago`
      : `${Math.round(m / 60)} h ago`;
};

// One dropdown of services; each shows how it connects and which way it syncs.
export function Integrations() {
  const [st, setSt] = useState<State | null>(null);
  const [pick, setPick] = useState<Key | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => getIntegrations().then(setSt), []);

  // Back from Google's sign-in: finish connecting.
  useEffect(() => {
    getIntegrations().then(async (st) => {
      setSt(st);
      if (new URLSearchParams(location.search).get("connect") !== "google")
        return;
      history.replaceState(null, "", "/app");
      setPick("google");
      if (!st.google.linked || st.google.connected) return;
      setBusy(true);
      setMsg(await connectGoogle(zone()));
      setBusy(false);
      load();
      refresh();
    });
  }, [load]);

  if (!st) return null;
  const off = !st.manager;
  const act: Act = async (f) => {
    setBusy(true);
    const r = await f();
    setMsg(typeof r === "string" ? r : "");
    setBusy(false);
    await load();
    refresh();
  };

  const every: { key: Key; name: string; on: boolean }[] = [
    { key: "notify", name: "Notifications (this device)", on: false },
    { key: "google", name: "Google Calendar", on: st.google.connected },
    { key: "notion", name: "Notion", on: st.notion },
    { key: "markdown", name: "Obsidian & Markdown", on: !!st.syncToken },
    {
      key: "link",
      name: "Calendar link (Outlook, any app)",
      on: !!st.icsToken,
    },
    {
      key: "apple",
      name: "Apple Calendar (or any calendar app)",
      on: !!st.icsToken,
    },
    { key: "discord", name: "Discord", on: st.discord },
    { key: "reminders", name: "Apple Reminders", on: false },
    { key: "keep", name: "Google Keep", on: false },
  ];
  const items = every.filter(
    // For now: Google and Apple Calendar (plus this device's notifications). Others show only while still connected,
    // so a workspace that set one up can switch it off.
    (i) =>
      i.key === "notify" ||
      i.key === "google" ||
      i.key === "apple" ||
      (i.on && i.key !== "link"),
  );
  const key = pick ?? items.find((i) => i.on)?.key ?? "google";

  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>Integrations</h1>
        <p className={s.progress}>
          {off
            ? "Only team owners and admins can change these."
            : "For this workspace. Teammates share them."}
        </p>
        {(st.google.connected || st.notion) && (
          <div className={s.tools}>
            <button
              className={s.ghost}
              disabled={busy}
              onClick={() => act(syncNow)}
            >
              <RefreshCw size={16} strokeWidth={2.5} />{" "}
              {busy ? "Syncing…" : "Sync now"}
            </button>
            <span className={s.open}>
              {st.syncedAt ? `Synced ${ago(st.syncedAt)}` : "Not synced yet"}.
              Also syncs on its own when you open your lists.
            </span>
          </div>
        )}
        {st.syncError && <p className={s.err}>{st.syncError}</p>}
        {msg && <p className={s.open}>{msg}</p>}
      </div>

      <Encryption />

      <div className={s.picker}>
        <span aria-hidden>Service</span>
        <Select
          label="Service"
          value={key}
          options={items.map((i) => ({
            value: i.key,
            label: `${i.on ? "● " : ""}${i.name}`,
          }))}
          onChange={(v) => {
            setPick(v as Key);
            setMsg("");
          }}
        />
      </div>

      <section className={s.integration}>
        {key === "notify" && <Notify />}
        {key === "google" && <Google st={st} busy={busy} act={act} />}
        {key === "notion" && <Notion st={st} busy={busy} act={act} />}
        {key === "markdown" && (
          <Markdown token={st.syncToken} manager={st.manager} act={act} />
        )}
        {key === "link" && st.manager && <SharedViews />}
        {(key === "link" || key === "apple") && (
          <CalendarLink
            token={st.icsToken}
            manager={st.manager}
            apple={key === "apple"}
            act={act}
          />
        )}
        {key === "discord" && <Discord st={st} act={act} />}
        {key === "reminders" && (
          <>
            <h2>Apple Reminders</h2>
            <p>
              Apple offers no web API for Reminders, so todone can&apos;t
              connect to it. Turn on notifications for reminders on this device,
              or subscribe Apple Calendar to your calendar link.
            </p>
          </>
        )}
        {key === "keep" && (
          <>
            <h2>Google Keep</h2>
            <p>
              Google offers no Keep API for personal accounts, so todone
              can&apos;t connect to it.
            </p>
          </>
        )}
      </section>
    </>
  );
}

function Google({ st, busy, act }: { st: State; busy: boolean; act: Act }) {
  if (!st.google.available)
    return (
      <>
        <h2>Google Calendar</h2>
        <p>
          This server has no Google keys yet. In Google Cloud Console enable the
          Google Calendar API, create an OAuth client (Web application) with the
          redirect URL <code>{location.origin}/api/auth/callback/google</code>,
          then set <code>GOOGLE_CLIENT_ID</code> and{" "}
          <code>GOOGLE_CLIENT_SECRET</code> and restart.
        </p>
      </>
    );
  return (
    <>
      <h2>Google Calendar</h2>
      <p>
        Dated tasks are events on a “todone” calendar in your Google account.
        Move or resize an event and the task&apos;s day, time and estimate
        follow; delete it and the task is unscheduled; add an event there and it
        becomes a task. Finished tasks leave the calendar. todone can only touch
        that one calendar.
      </p>
      {st.google.connected ? (
        st.manager && (
          <button
            className={`${s.ghost} ${s.danger}`}
            onClick={() => act(disconnectGoogle)}
          >
            Disconnect
          </button>
        )
      ) : (
        <button
          className="btn"
          disabled={!st.manager || busy}
          onClick={() =>
            st.google.linked
              ? act(() => connectGoogle(zone()))
              : authClient.linkSocial({
                  provider: "google",
                  scopes: [GOOGLE_SCOPE],
                  callbackURL: "/app?connect=google",
                })
          }
        >
          <CalendarDays size={16} strokeWidth={2.5} /> Connect Google Calendar
        </button>
      )}
    </>
  );
}

function Notion({ st, busy, act }: { st: State; busy: boolean; act: Act }) {
  return (
    <>
      <h2>Notion</h2>
      <p>
        Tasks and a Notion database stay in step: title, Done, Due (with time)
        and List. Edits, ticks and new pages in Notion come back here; deleting
        a page deletes its task. Make an internal integration at
        notion.so/my-integrations, then share the database with it (••• →
        Connections).
      </p>
      {st.notion ? (
        st.manager && (
          <button
            className={`${s.ghost} ${s.danger}`}
            onClick={() => act(() => setNotion(null, "", ""))}
          >
            Disconnect
          </button>
        )
      ) : (
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act(() =>
              setNotion(String(f.get("token")), String(f.get("db")), zone()),
            );
          }}
        >
          <input
            name="token"
            type="password"
            required
            disabled={!st.manager}
            placeholder="Integration secret (ntn_…)"
            aria-label="Notion integration secret"
            autoComplete="off"
          />
          <input
            name="db"
            required
            disabled={!st.manager}
            placeholder="Database link"
            aria-label="Notion database link"
          />
          <button className="btn" disabled={!st.manager || busy}>
            Connect and sync
          </button>
        </form>
      )}
    </>
  );
}

function Markdown({
  token,
  manager,
  act,
}: {
  token: string | null;
  manager: boolean;
  act: Act;
}) {
  const base = token && `${location.origin}/api/sync/${token}`;
  return (
    <>
      <h2>Obsidian &amp; Markdown</h2>
      <p>
        A private address that reads and writes this workspace&apos;s lists as
        Obsidian Tasks Markdown. Pull a list into your vault, edit it in
        Obsidian, push it back. Tasks keep their links to Notion and Google by
        title.
      </p>
      {base ? (
        <>
          <pre className={s.code}>
            {`# every list, as JSON with Markdown
curl ${base}

# one list into your vault, and back
curl ${base}/inbox.md > Inbox.md
curl -X PUT --data-binary @Inbox.md ${base}/inbox.md`}
          </pre>
          <p className={s.open}>
            Send <code>If-Match</code> with the ETag from the GET to refuse
            overwriting newer edits. Anyone with the address can read and change
            these lists.
          </p>
          {manager && (
            <div className={s.tools}>
              <button
                className={s.ghost}
                onClick={() => act(() => setMarkdownSync(true))}
              >
                <RefreshCw size={16} strokeWidth={2.5} /> New address
              </button>
              <button
                className={`${s.ghost} ${s.danger}`}
                onClick={() => act(() => setMarkdownSync(false))}
              >
                Turn off
              </button>
            </div>
          )}
        </>
      ) : (
        <button
          className="btn"
          disabled={!manager}
          onClick={() => act(() => setMarkdownSync(true))}
        >
          Make a sync address
        </button>
      )}
    </>
  );
}

function Discord({ st, act }: { st: State; act: Act }) {
  return (
    <>
      <h2>Discord · notifications</h2>
      <p>
        Posts to a channel when someone adds or finishes a task. Channel
        settings → Integrations → Webhooks → copy URL. Adding tasks from Discord
        needs a bot, which isn&apos;t built yet.
      </p>
      {st.discord ? (
        st.manager && (
          <button
            className={`${s.ghost} ${s.danger}`}
            onClick={() => act(() => setDiscord(null))}
          >
            Disconnect
          </button>
        )
      ) : (
        <form
          className={s.add}
          onSubmit={(e) => {
            e.preventDefault();
            act(() =>
              setDiscord(String(new FormData(e.currentTarget).get("hook"))),
            );
          }}
        >
          <input
            name="hook"
            required
            disabled={!st.manager}
            placeholder="https://discord.com/api/webhooks/…"
            aria-label="Discord webhook URL"
          />
          <button className="btn" disabled={!st.manager}>
            Connect
          </button>
        </form>
      )}
    </>
  );
}

function CalendarLink({
  token,
  manager,
  apple,
  act,
}: {
  token: string | null;
  manager: boolean;
  apple: boolean;
  act: Act;
}) {
  const feed = token && `${location.origin}/api/calendar/${token}.ics`;
  return (
    <>
      <h2>
        {apple ? "Apple Calendar · read-only" : "Calendar link · read-only"}
      </h2>
      <p>
        {apple
          ? "Apple Calendar subscribes to the calendar link: File → New Calendar Subscription, then paste it. It refreshes on its own. Apple's calendar has no API todone can write back through, so edits there don't come back."
          : "Opened in a browser it shows the calendar; added to Outlook or any calendar app it stays in sync. Anyone with the link can read your dated tasks."}
      </p>
      {feed ? (
        <>
          <input
            readOnly
            value={feed}
            aria-label="Calendar link"
            onFocus={(e) => e.target.select()}
          />
          <div className={s.tools}>
            <a className={s.ghost} href={feed} target="_blank" rel="noreferrer">
              <CalendarDays size={16} strokeWidth={2.5} /> Open
            </a>
            <button
              className={s.ghost}
              onClick={() => navigator.clipboard.writeText(feed)}
            >
              <Copy size={16} strokeWidth={2.5} /> Copy link
            </button>
            {manager && (
              <>
                <button
                  className={s.ghost}
                  onClick={() => act(() => setCalendar(true))}
                >
                  <RefreshCw size={16} strokeWidth={2.5} /> New link
                </button>
                <button
                  className={`${s.ghost} ${s.danger}`}
                  onClick={() => act(() => setCalendar(false))}
                >
                  Turn off
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <button
          className="btn"
          disabled={!manager}
          onClick={() => act(() => setCalendar(true))}
        >
          Make a calendar link
        </button>
      )}
    </>
  );
}

// Views shared from the calendar's Share button; each link can be stopped on its own.
function SharedViews() {
  const [shares, setShares] = useState<Awaited<
    ReturnType<typeof listShares>
  > | null>(null);
  const load = useCallback(() => listShares().then(setShares), []);
  useEffect(() => {
    load();
  }, [load]);
  if (!shares?.length) return null;
  const name = (v: string, at: string) =>
    ({
      day: label(at, { weekday: "short", month: "short", day: "numeric" }),
      week: `Week of ${label(rangeOf("week", at)[0], { month: "short", day: "numeric" })}`,
      month: label(at, { month: "long", year: "numeric" }),
      year: at.slice(0, 4),
    })[v];
  return (
    <div className={s.shares}>
      <h2>Shared views</h2>
      <p>
        Each link shows only its day, week, month or year. Stop one and it no
        longer opens.
      </p>
      <ul>
        {shares.map((sh) => (
          <li key={sh.token}>
            <span>
              {name(sh.view, sh.at)} <em>{sh.view}</em>
            </span>
            <button
              className={s.ghost}
              onClick={() =>
                navigator.clipboard.writeText(
                  `${location.origin}/calendar/${sh.token}`,
                )
              }
            >
              <Copy size={16} strokeWidth={2.5} /> Copy link
            </button>
            <button
              className={`${s.ghost} ${s.danger}`}
              onClick={() => stopShare(sh.token).then(load)}
            >
              Stop sharing
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Reminders on this device, from the open app: lists are end-to-end encrypted, so the server can't see what's due.
function Notify() {
  const [state, setState] = useState<
    "loading" | "unsupported" | "off" | "on" | "blocked"
  >("loading");
  // Read once mounted (the browser's permission isn't known while rendering on the server).
  useEffect(() => {
    Promise.resolve().then(() =>
      setState(
        !canNotify()
          ? "unsupported"
          : Notification.permission === "denied"
            ? "blocked"
            : remindersOn()
              ? "on"
              : "off",
      ),
    );
  }, []);

  const turnOn = async () => {
    if ((await Notification.requestPermission()) !== "granted")
      return setState("blocked");
    setReminders(true);
    setState("on");
    notify(
      "Reminders are on",
      "todone will nudge you here before a task's time, while a todone tab is open.",
      "test",
    );
  };

  return (
    <>
      <h2>Reminders</h2>
      <p>
        A nudge about 15 minutes before a task&apos;s time, and at 8 in the
        morning what&apos;s due today and what&apos;s late. Your lists are
        end-to-end encrypted, so our server can&apos;t see what&apos;s due:
        reminders come from todone itself, <b>while a todone tab is open</b> on
        this device (a pinned tab works well).
      </p>
      {state === "unsupported" && (
        <p className={s.open}>
          This browser can&apos;t show notifications. On an iPhone or iPad, add
          todone to your Home Screen (Share → Add to Home Screen) and open it
          from there.
        </p>
      )}
      {state === "blocked" && (
        <p className={s.open}>
          Notifications are blocked for this site. Allow them in the
          browser&apos;s site settings, then come back.
        </p>
      )}
      {state === "off" && (
        <button className="btn" onClick={turnOn}>
          <Bell size={16} strokeWidth={2.5} /> Turn on for this device
        </button>
      )}
      {state === "on" && (
        <div className={s.tools}>
          <span className={s.on}>On for this device</span>
          <button
            className={s.ghost}
            onClick={() =>
              notify("A test from todone", "Reminders work here.", "test")
            }
          >
            Send a test
          </button>
          <button
            className={`${s.ghost} ${s.danger}`}
            onClick={() => {
              setReminders(false);
              setState("off");
            }}
          >
            Turn off
          </button>
        </div>
      )}
    </>
  );
}

// Which lists integrations can see. Lists are end-to-end encrypted, so integrations (and our server) can't read them;
// switching encryption off for a list makes it readable to both, so it can sync. One switch per list.
function Encryption() {
  const { lists, update } = useLists();
  const [armed, setArmed] = useState<string | null>(null);
  const mine = (lists ?? []).filter((l) => !l.kind);
  const open = mine.filter((l) => l.plain).length;
  return (
    <section className={s.e2e} aria-labelledby="e2e-h">
      <h2 id="e2e-h">
        <Lock size={18} strokeWidth={2.5} aria-hidden /> End-to-end encryption
      </h2>
      <p>
        Your lists are locked on your device before they&apos;re saved. Our
        server and these integrations can&apos;t read them. To use a list with
        an integration, switch its encryption off below: from then on our server
        and the integrations you connect can read that list. Switch it back on
        any time.
      </p>
      <p className={s.e2eCount}>
        {open
          ? `${open} of ${mine.length} lists readable by integrations`
          : "Every list is encrypted: integrations see nothing yet."}
      </p>
      <ul className={s.e2eLists}>
        {mine.map((l) => {
          const on = !l.plain;
          return (
            <li key={l.id}>
              <span className={s.e2eName}>
                <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
              </span>
              {armed === l.id && (
                <span className={s.e2eWarn}>
                  Our server could read it. Click again
                </span>
              )}
              <button
                role="switch"
                aria-checked={on}
                aria-label={`Encrypt ${l.name}`}
                className={s.e2eSwitch}
                data-armed={armed === l.id || undefined}
                onBlur={() => setArmed((x) => (x === l.id ? null : x))}
                onClick={() => {
                  if (!on) return update(l.id, (x) => ({ ...x, plain: false }));
                  if (armed !== l.id) return setArmed(l.id);
                  update(l.id, (x) => ({ ...x, plain: true }));
                  setArmed(null);
                }}
              >
                <i aria-hidden />
                <span>
                  {on ? (
                    <Lock size={13} strokeWidth={2.75} aria-hidden />
                  ) : (
                    <LockOpen size={13} strokeWidth={2.75} aria-hidden />
                  )}
                  {on ? "Encrypted" : "Readable"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
