"use client";

import { useCallback, useEffect, useState } from "react";
import {
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
import s from "./app.module.css";

type State = Awaited<ReturnType<typeof getIntegrations>>;
type Key =
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
    {
      key: "google",
      name: "Google Calendar",
      on: st.google.connected || !!st.icsToken,
    },
    { key: "notion", name: "Notion", on: st.notion },
    { key: "markdown", name: "Obsidian & Markdown", on: !!st.syncToken },
    {
      key: "link",
      name: "Outlook",
      on: !!st.icsToken,
    },
    {
      key: "apple",
      name: "Apple Calendar",
      on: !!st.icsToken,
    },
    { key: "discord", name: "Discord", on: st.discord },
    { key: "reminders", name: "Apple Reminders", on: false },
    { key: "keep", name: "Google Keep", on: false },
  ];
  const items = every.filter(
    // For now: Google Calendar, Apple Calendar and Outlook (notifications live in the bell). Others show only while
    // still connected, so a workspace that set one up can switch it off.
    (i) => ["google", "apple", "link"].includes(i.key) || i.on,
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
        {/* Two-way Google sync stays only for a workspace that linked it before; the rest subscribe to the link. */}
        {key === "google" && st.google.connected && (
          <Google st={st} busy={busy} act={act} />
        )}
        {key === "notion" && <Notion st={st} busy={busy} act={act} />}
        {key === "markdown" && (
          <Markdown token={st.syncToken} manager={st.manager} act={act} />
        )}
        {key === "link" && st.manager && <SharedViews />}
        {(key === "link" ||
          key === "apple" ||
          (key === "google" && !st.google.connected)) && (
          <CalendarLink
            token={st.icsToken}
            manager={st.manager}
            app={key === "link" ? "outlook" : key}
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

// How each calendar app subscribes to the link: one way, todone → calendar. Each fetches it on its own schedule.
const APPS = {
  apple: {
    name: "Apple Calendar",
    how: "Add it and Apple Calendar keeps your dated tasks in step, fetching the link on its own (pick how often in Calendar → Settings → Accounts). On an iPhone: Settings → Calendar → Accounts → Add Subscribed Calendar, then paste the link.",
    add: (f: string) => [["Add to Apple Calendar", f.replace(/^https?:/, "webcal:")]],
  },
  google: {
    name: "Google Calendar",
    how: "Add it and Google Calendar shows your dated tasks. Google fetches the link on its own schedule, every few hours up to a day, so a new task can take a while to show up. By hand: Other calendars → + → From URL, then paste the link.",
    add: (f: string) => [
      [
        "Add to Google Calendar",
        `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(f.replace(/^https?:/, "webcal:"))}`,
      ],
    ],
  },
  outlook: {
    name: "Outlook",
    how: "Add it and Outlook shows your dated tasks, refreshing the link every few hours. By hand: Add calendar → Subscribe from web, then paste the link. Opened in a browser, the link shows the calendar too.",
    add: (f: string) => [
      [
        "Add to Outlook.com",
        `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(f)}&name=todone`,
      ],
      [
        "Work or school account",
        `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(f)}&name=todone`,
      ],
    ],
  },
} as const;

function CalendarLink({
  token,
  manager,
  app,
  act,
}: {
  token: string | null;
  manager: boolean;
  app: keyof typeof APPS;
  act: Act;
}) {
  const feed = token && `${location.origin}/api/calendar/${token}.ics`;
  const a = APPS[app];
  // The feed is read by Apple's (or Outlook's) servers from ours, so it can only hold lists our server can read.
  const readable = (useLists().lists ?? []).filter((l) => !l.kind && l.plain);
  return (
    <>
      <h2>{a.name} · one way</h2>
      <p>
        {a.how} Edits made in {a.name} don&apos;t come back to todone. Anyone
        with the link can see the dated tasks in it; make a new link to cut
        the old one off.
      </p>
      {readable.length ? (
        <p className={s.e2eCount}>
          In this calendar: {readable.map((l) => l.name).join(", ")}
        </p>
      ) : (
        <p className={s.remindAsk}>
          <Lock size={15} strokeWidth={2.5} aria-hidden />
          <span>
            Empty for now: every list is end-to-end encrypted, so our server
            can&apos;t read a task to put in it. Switch encryption off for the
            lists you want here.
          </span>
          <button
            className={`btn ${s.claim}`}
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            onClick={() =>
              document
                .getElementById("e2e-h")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Choose lists
          </button>
        </p>
      )}
      {feed ? (
        <>
          <input
            readOnly
            value={feed}
            aria-label="Calendar link"
            onFocus={(e) => e.target.select()}
          />
          <div className={s.tools}>
            {a.add(feed).map(([label, href], i) => (
              <a
                key={label}
                className={i ? s.ghost : "btn"}
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                <CalendarDays size={16} strokeWidth={2.5} /> {label}
              </a>
            ))}
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
                  onClick={() => act(() => setCalendar(true).then(() => {}))}
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
          onClick={() => act(() => setCalendar(true).then(() => {}))}
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
