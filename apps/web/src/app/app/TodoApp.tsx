"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Welcome } from "@/components/Welcome";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Target,
  ListChecks,
  CalendarDays,
  Gift,
  AlignLeft,
  Lightbulb,
  Lock,
  LockOpen,
  Paperclip,
  Menu,
  Check,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/Avatar";
import { authClient } from "@/lib/auth-client";
import { Select } from "@/components/Select";
import { SHOWS, SORTS, type Show, type Sort, board } from "@/lib/board";
import { type At, draggable, placeOn, useDrop } from "@/lib/drag";
import { useGlide } from "@/lib/glide";
import { binSound } from "@/lib/sound";
import {
  fresh,
  mapTask,
  moveToList,
  refresh,
  reload,
  reorder,
  showSaved,
  startDemo,
  toBin,
  unbin,
  useLists,
} from "@/lib/store";
import { BinView } from "./BinPanel";
import { TaskPanel } from "./TaskPanel";
import { Goals, ListGoals, Rewards, XpTile } from "./Goals";
import { NotificationBell } from "./Bell";
import { changeGoals, useGoalItems } from "./goalStore";
import { fold, reconcile, type Goal } from "@todone/sdk/goals";
import { IconPick, ListIcon } from "./listIcon";
import { useUnread } from "./unread";
import { Account } from "./Account";
import { AiImport } from "./AiImport";
import { Brainstorm, ideaToTask } from "./Brainstorm";
import { CalendarView } from "./CalendarView";
import { Feedback } from "./Feedback";
import { Integrations } from "./Integrations";
import { Tour } from "./Tour";
import { VerifyBanner } from "./VerifyBanner";
import {
  encryptPlainLists,
  setWorkspace,
  startOnboarding,
  waitingForTeamKey,
} from "./actions";
import { Unlock } from "./Unlock";
import { loadVault, startTeam, teamKey, teamMembers } from "@/lib/vault";
import { remindNow, schedulePush } from "@/lib/remind";
import { shareCalendar } from "./integration-actions";
import { Stickers, sticker } from "./Stickers";
import { Members, type Panel, Workspaces } from "./Workspaces";
import {
  type List,
  type Task,
  fmtMinutes,
  lateBy,
  lateLabel,
  moveTasks,
  relDue,
  repeatLabel,
  todayISO,
  uid,
  takeTasks,
  tick,
  unnest,
  waiting,
} from "@todone/sdk/tasks";
import s from "./app.module.css";

// Each main task is a sticky note; its colour comes from its id, so it stays put when tasks move.
// Sticky colours. Each note's colour comes from its own id, so adding, deleting or moving notes doesn't recolour
// the list; a note that would match one just before it takes the next colour instead.
const NOTES = [
  "var(--butter)",
  "var(--pink)",
  "var(--cyan)",
  "var(--lime)",
  "var(--peri)",
  "var(--orange)",
  "#c9b3ff", // lavender
  "#8fe3b0", // mint
];
// A list's own colour, from its id: picked once when it's made, the same on every device and after a rename.
const listColor = (id: string) => NOTES[noteColor(id)];
const noteColor = (id: string) => {
  let h = 2166136261; // FNV-1a, then a final mix so short ids spread evenly over the colours
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) % NOTES.length;
};
// A note that would match one of the two before it takes the next free colour.
const noteColors = (tasks: Task[]) => {
  const out = new Map<string, string>();
  const recent: number[] = [];
  for (const t of tasks) {
    let c = noteColor(t.id);
    while (recent.includes(c)) c = (c + 1) % NOTES.length;
    out.set(t.id, NOTES[c]);
    recent.push(c);
    if (recent.length > 2) recent.shift();
  }
  return out;
};
const PRI_NAME = { 1: "High", 2: "Medium", 3: "Low" } as const;
const findTask = (ts: Task[], id: string | null) =>
  ts.flatMap((t) => [t, ...t.sub]).find((t) => t.id === id);

// Repeats waiting for their day aren't counted until it comes.
const count = (ts: Task[], today = todayISO()) => {
  const all = ts
    .flatMap((t) => [t, ...t.sub])
    .filter((t) => !waiting(t, today));
  return {
    open: all.filter((t) => !t.done).length,
    done: all.filter((t) => t.done).length,
    all: all.length,
  };
};

// `demo`: the app on sample lists with no account (todone.today/demo); changes stay in this tab.
export function TodoApp({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const {
    data: session,
    isPending,
    error: offline,
    refetch,
  } = authClient.useSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id;
  const { lists, error, update, add } = useLists();
  const [picked, setPicked] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [touring, setTouring] = useState(false);
  const [drawer, setDrawer] = useState(false);
  // Desktop: the sidebar can fold away for more room for notes; remembered in this browser.
  const [slim, setSlim] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("todone:slim") === "1")
        Promise.resolve().then(() => setSlim(true));
    } catch {}
  }, []);
  const toggleSlim = () =>
    setSlim((v) => {
      try {
        localStorage.setItem("todone:slim", v ? "0" : "1");
      } catch {}
      return !v;
    });
  // End-to-end encryption: whether this browser holds the keys ("locked": ask for the password), and whether the
  // open team still has to give you its key.
  const [vault, setVault] = useState<"checking" | "open" | "locked">(
    "checking",
  );
  const [teamWait, setTeamWait] = useState(false);
  // Anything that changes the view closes the phone drawer.
  const show = (p: Panel) => {
    setPanel(p);
    setDrawer(false);
  };
  // Dragged lists keep their order; lists never dragged come first, newest first.
  const sorted = useMemo(
    () =>
      (lists ?? [])
        .filter((l) => !l.kind)
        .sort((a, b) =>
          a.position == null || b.position == null
            ? (a.position == null ? 0 : 1) - (b.position == null ? 0 : 1) ||
              b.updated - a.updated
            : a.position - b.position,
        ),
    [lists],
  );
  const list = sorted.find((l) => l.id === picked) ?? sorted[0];
  // The sidebar's lists take ideas (they become tasks), tasks from another list (they move there),
  // and other lists (dropped above or below to reorder). Brainstorm ("ideas") takes tasks back as ideas.
  const dropOnList = useDrop("sidebar", {
    accept: (p, listId) =>
      listId === "ideas"
        ? p.kind === "task"
        : p.kind === "idea" ||
          (p.kind === "task" && p.listId !== listId) ||
          (p.kind === "list" && p.id !== listId),
    where: (p, _, at) =>
      p.kind === "list" ? placeOn(at, "y", false) : "inside",
    drop: (p, listId, at) => {
      if (listId === "ideas" && p.kind === "task") {
        // A task (and its steps) goes back to the board as ideas, newest first.
        let taken: Task[] = [];
        update(p.listId, (l) => {
          const [t, rest] = takeTasks(l.tasks, p.ids);
          taken = t;
          return { ...l, tasks: rest };
        });
        const ideas = flatten(taken).map((t) => ({
          id: t.id,
          title: t.title,
          done: false,
          sub: [],
        }));
        const board = lists?.find((l) => l.kind === "ideas");
        if (!ideas.length) return;
        if (board) update(board.id, (l) => ({ ...l, tasks: [...ideas, ...l.tasks] }));
        else add("Brainstorm", ideas, "ideas");
      } else if (p.kind === "idea" && lists)
        for (const id of p.ids) ideaToTask(lists, id, listId, update);
      else if (p.kind === "task")
        moveToList(p.listId, listId, (ts) => takeTasks(ts, p.ids));
      else if (p.kind === "list") {
        const ids = sorted.map((l) => l.id).filter((id) => id !== p.id);
        ids.splice(
          ids.indexOf(listId) + (placeOn(at, "y", false) === "after" ? 1 : 0),
          0,
          p.id,
        );
        reorder(ids);
      }
    },
  });
  // A task to open in the list once it shows (the bell); a new object each time, so the same task opens again.
  const [focus, setFocus] = useState<{ id: string } | null>(null);
  const open = (id: string, task?: string) => {
    setPicked(id);
    setFocus(task ? { id: task } : null);
    setPanel(null);
    setDrawer(false);
  };
  // A reminder that was clicked: /app?task=… in a new tab, or a message from the service worker into this one.
  // It waits for the lists (the vault may still be locked), then opens the task like a click on it.
  const [wanted, setWanted] = useState<string | null>(null);
  useEffect(() => {
    const m = (e: MessageEvent) =>
      typeof e.data?.task === "string" && setWanted(e.data.task);
    navigator.serviceWorker?.addEventListener("message", m);
    return () => navigator.serviceWorker?.removeEventListener("message", m);
  }, []);
  useEffect(() => {
    // The address is read only now: the app can mount more than once while signing in.
    const want = wanted ?? new URLSearchParams(location.search).get("task");
    if (!want || !lists || vault !== "open") return; // before that, encrypted lists aren't readable yet
    if (location.search) history.replaceState(null, "", location.pathname);
    const l = lists.find(
      (l) => !l.kind && flatten(l.tasks).some((t) => t.id === want),
    );
    Promise.resolve().then(() => {
      setWanted(null);
      if (!l) return;
      setPicked(l.id);
      setFocus({ id: want });
      setPanel(null);
      setDrawer(false);
    });
  }, [wanted, lists, vault]);

  // XP: whenever lists change, finished tasks earn a win in the goals list and unticked ones lose it. One place,
  // so it covers every way a task gets ticked (card, panel, calendar). Idempotent: an unchanged log isn't saved.
  useEffect(() => {
    if (!lists || vault !== "open") return;
    const tasks = lists.filter((l) => !l.kind).flatMap((l) => l.tasks);
    const goals = lists.find((l) => l.kind === "goals");
    const items = (goals?.tasks ?? []) as unknown as Parameters<
      typeof reconcile
    >[0];
    if (reconcile(items, tasks, todayISO(), userId) === items) return;
    changeGoals(lists, (xs) =>
      fold(reconcile(xs, tasks, todayISO(), userId), () => uid() + uid()),
    );
  }, [lists, vault, userId]);

  useEffect(() => {
    if (!demo && !isPending && !userId && !offline)
      router.replace("/login?next=/app");
  }, [demo, isPending, userId, offline, router]);
  useEffect(() => {
    if (!demo) return;
    fetch(`/api/demo?today=${todayISO()}`)
      .then((r) => r.json())
      .then((ls: { name: string; tasks: Task[]; kind?: "ideas" }[]) => {
        startDemo(
          ls.map((l, i) => ({
            ...l,
            id: uid(),
            version: 0,
            updated: 0,
            position: i + 1,
          })),
        );
        setTouring(true);
      });
  }, [demo]);
  // The service worker keeps the app openable offline (and shows push notifications).
  useEffect(() => {
    if (process.env.NODE_ENV === "production")
      navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (demo || !userId) return;
    loadVault(userId).then((ok) => setVault(ok ? "open" : "locked"));
  }, [demo, userId]);
  // Opened without a connection: show the lists as last saved (decrypted with this device's key), and pick up
  // properly once it's back.
  useEffect(() => {
    if (demo || !offline || userId) return;
    if (!navigator.onLine) loadVault().then((ok) => void (ok && showSaved()));
    const back = () => refetch();
    addEventListener("online", back, { once: true });
    return () => removeEventListener("online", back);
  }, [demo, offline, userId, refetch]);
  useEffect(() => {
    if (demo || !userId || vault !== "open") return;
    setWorkspace(orgId);
    (async () => {
      // A team from before encryption has no key yet: the first member to open it makes one and encrypts its lists.
      if (
        orgId &&
        !(await teamKey(orgId)) &&
        !(await teamMembers(orgId)).some((m) => m.hasKey)
      ) {
        await startTeam(orgId);
        await encryptPlainLists(orgId);
      }
      await reload(!orgId);
      setTeamWait(!!orgId && (waitingForTeamKey() || !(await teamKey(orgId))));
      // Back from connecting a service (e.g. Google's sign-in): show Integrations once lists are in.
      if (new URLSearchParams(location.search).has("connect"))
        return setPanel("integrations");
      // First visit: sample lists to play with (made here, so they're encrypted), then the tour.
      if (!orgId && (await startOnboarding())) {
        const demoLists: { name: string; tasks: Task[]; kind?: "ideas" }[] =
          await fetch(`/api/demo?today=${todayISO()}`).then((r) => r.json());
        reorder(demoLists.map((l) => add(l.name, l.tasks, l.kind)));
        setTouring(true);
      }
    })().catch(() => {});
  }, [demo, userId, orgId, vault, add]);
  // Reminders come from the open app (the server can't read what's due): a check every minute.
  useEffect(() => {
    if (demo) return;
    const t = setInterval(() => remindNow(lists ?? []), 60_000);
    return () => clearInterval(t);
  }, [demo, lists]);
  // …and with todone closed: the week's reminders, sealed for each of this person's browsers (lib/remind.ts).
  useEffect(() => {
    if (demo || !lists) return;
    const go = () =>
      schedulePush(lists).catch((e) => console.warn("push", e));
    const t = setTimeout(go, 3000);
    addEventListener("todone:reminders-changed", go); // just turned on here
    return () => {
      clearTimeout(t);
      removeEventListener("todone:reminders-changed", go);
    };
  }, [demo, lists]);
  // Changes from other devices and teammates show up on focus, and every 20s while the tab is visible.
  useEffect(() => {
    const timer = setInterval(
      () => document.visibilityState === "visible" && refresh(),
      20_000,
    );
    addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      removeEventListener("focus", refresh);
    };
  }, []);

  if (!demo && session && vault === "locked")
    return (
      <Unlock
        userId={session.user.id}
        email={session.user.email}
        onDone={() => setVault("open")}
      />
    );

  return (
    <div className={s.shell} data-slim={slim || undefined}>
      <Welcome />
      {touring && <Tour onPanel={setPanel} onEnd={() => setTouring(false)} />}
      <header className={s.top}>
        <button
          className={s.menu}
          onClick={() => setDrawer(true)}
          aria-label="Lists and workspace"
          aria-expanded={drawer}
        >
          <Menu size={18} strokeWidth={2.5} aria-hidden />
          <span>
            {panel === "ideas"
              ? "Brainstorm"
              : panel === "bin"
                ? "Bin"
                : panel === "integrations"
                  ? "Integrations"
                  : panel === "account"
                    ? "Account"
                    : (list?.name ?? "Lists")}
          </span>
        </button>
        {demo ? (
          <Link href="/" className={s.mark} aria-label="todone home">
            <Logo size={26} />
          </Link>
        ) : (
          // Signed in, the logo is the app's home: back to your lists, not the marketing page.
          <button
            className={s.mark}
            onClick={() => setPanel(null)}
            aria-label="Your lists"
          >
            <Logo size={26} />
          </button>
        )}
        <nav className={s.tabs} aria-label="Views">
          {(
            [
              [null, "Lists", ListChecks],
              ["calendar", "Calendar", CalendarDays],
              ["goals", "Goals", Target],
              ["rewards", "Rewards", Gift],
            ] as const
          ).map(([p, name, Icon]) => (
            <button
              key={name}
              aria-pressed={panel === p}
              onClick={() => setPanel(p)}
              data-tour={p ?? "lists-tab"}
            >
              <Icon size={16} strokeWidth={2.5} aria-hidden /> {name}
            </button>
          ))}
        </nav>
        <p className={s.local} role="status">
          {error && <span className={s.err}>{error}</span>}
        </p>
        {!demo && <NotificationBell onOpen={open} />}
        <XpTile onClick={() => show("rewards")} />
        <button
          className={s.tile}
          style={{ "--fill": "var(--cyan)" } as React.CSSProperties}
          onClick={() => {
            setPanel(null);
            setTouring(true);
          }}
          data-tour="tour"
          aria-label="Tour"
          data-tip="Tour"
        >
          <Info size={18} strokeWidth={2.5} aria-hidden />
        </button>
        <ThemeToggle tile={s.tile} />
        {demo ? (
          <Link
            href="/login"
            className={`btn ${s.signUp}`}
            style={{ "--fill": "var(--lime)" } as React.CSSProperties}
          >
            <span className={s.wide}>Make an account</span>
            <span className={s.narrow}>Sign up</span>
          </Link>
        ) : (
          <button
            className={s.tile}
            aria-pressed={panel === "account"}
            onClick={() => show("account")}
            aria-label="Account"
            data-tip={
              session?.user.email
                ? `Account · ${session.user.email}`
                : "Account"
            }
            data-tip-end
          >
            <Avatar
              image={session?.user.image}
              name={session?.user.name || session?.user.email || "?"}
            />
          </button>
        )}
      </header>
      {!demo && session && (
        <VerifyBanner
          email={session.user.email}
          verified={session.user.emailVerified}
          created={session.user.createdAt}
        />
      )}
      {teamWait && (
        <p className={s.demoBar} role="note">
          This team&apos;s lists are end-to-end encrypted. A teammate who has
          the team&apos;s key needs to confirm you (Workspace → the team →
          Members) before you can see or add to them.
        </p>
      )}
      {demo && (
        <p className={s.demoBar} role="note">
          This is a demo with sample lists. Try anything: changes stay in this
          tab and vanish when you close it.
        </p>
      )}

      {/* On a phone the sidebar is a drawer, opened from the header. */}
      {drawer && (
        <div
          className={s.backdrop}
          onClick={() => setDrawer(false)}
          aria-hidden
        />
      )}
      <aside
        className={s.side}
        aria-label="Lists"
        data-open={drawer}
        data-demo={demo || undefined}
      >
        {/* Fold the sidebar to icons (desktop): top right beside Workspace, top of the rail when folded. */}
        <button
          className={s.foldIn}
          onClick={toggleSlim}
          aria-label={slim ? "Show the sidebar" : "Fold the sidebar to icons"}
          data-tip={slim ? "Show the sidebar" : "Fold the sidebar to icons"}
        >
          {slim ? (
            <PanelLeftOpen size={18} strokeWidth={2.5} aria-hidden />
          ) : (
            <PanelLeftClose size={18} strokeWidth={2.5} aria-hidden />
          )}
        </button>
        {!demo && (
          <Workspaces
            orgId={orgId}
            panel={panel}
            onPanel={show}
            onSwitch={() => {
              setPicked(null);
              setPanel(null);
            }}
          />
        )}
        {/* Brainstorm lives above the lists: a place for loose ideas that isn't a list itself. */}
        <button
          className={`${s.listBtn} ${s.ideasBtn}`}
          aria-current={panel === "ideas"}
          onClick={() => show("ideas")}
          {...dropOnList("ideas")}
          data-tour="ideas"
          data-tip="Brainstorm"
        >
          <span>
            <Lightbulb size={16} strokeWidth={2.5} aria-hidden />{" "}
            <span className={s.label}>Brainstorm</span>
          </span>
          <span className={s.open}>
            {lists?.find((l) => l.kind === "ideas")?.tasks.length || ""}
          </span>
        </button>
        <h2 className={s.sideHead}>Lists</h2>
        {lists && (
          <ul className={s.lists} data-tour="lists">
            {sorted.map((l) => {
              const c = count(l.tasks);
              return (
                <li key={l.id}>
                  <button
                    className={s.listBtn}
                    aria-current={!panel && l.id === list?.id}
                    style={{ "--list": listColor(l.id) } as React.CSSProperties}
                    onClick={() => open(l.id)}
                    {...dropOnList(l.id)}
                    {...draggable({ kind: "list", id: l.id }, l.name)}
                    data-tip={l.name}
                  >
                    <span>
                      <ListIcon id={l.id} name={l.name} icon={l.icon} />{" "}
                      <span className={s.label}>{l.name}</span>
                    </span>
                    <span className={s.open}>{c.open}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={s.sideTools}>
          <NewList
            onAdd={(name) => open(add(name))}
            taken={(n) => !!lists?.some((l) => l.name === n)}
          />
          <button
            className={`${s.listBtn} ${s.ideasBtn} ${s.binBtn}`}
            aria-current={panel === "bin"}
            onClick={() => show("bin")}
            data-tip="Bin"
          >
            <span>
              <Trash2 size={16} strokeWidth={2.5} aria-hidden />{" "}
              <span className={s.label}>Bin</span>
            </span>
            <span className={s.open}>
              {fresh(lists?.find((l) => l.kind === "bin")?.tasks ?? [])
                .length || ""}
            </span>
          </button>
          <AiImport
            lists={sorted}
            current={list?.id ?? null}
            onAdd={(name, tasks) => open(add(name, tasks))}
            onAppend={(id, tasks) => {
              update(id, (l) => ({ ...l, tasks: [...l.tasks, ...tasks] }));
              open(id);
            }}
          />
          {!demo && <Feedback />}
        </div>
      </aside>

      <main className={s.main}>
        {panel === "calendar" ? (
          lists && (
            <CalendarView
              lists={lists.filter((l) => !l.kind)}
              update={update}
              onOpen={open}
              share={demo ? undefined : shareCalendar}
            />
          )
        ) : panel === "goals" ? (
          lists && <Goals onOpen={open} />
        ) : panel === "rewards" ? (
          lists && <Rewards />
        ) : panel === "ideas" ? (
          lists && <Brainstorm lists={lists} add={add} update={update} />
        ) : panel === "bin" ? (
          <BinView fallback={list?.id ?? null} />
        ) : panel === "members" && orgId ? (
          <Members key={orgId} />
        ) : panel === "integrations" ? (
          <Integrations key={orgId} />
        ) : panel === "account" ? (
          <Account />
        ) : !lists ? null : list ? (
          <ListView
            key={list.id}
            list={list}
            lists={sorted}
            update={update}
            focus={focus}
          />
        ) : (
          // No lists yet: start in Brainstorm, where ideas can become the first tasks.
          <Brainstorm lists={lists} add={add} update={update} />
        )}
      </main>
    </div>
  );
}

function NewList({
  onAdd,
  taken,
}: {
  onAdd: (name: string) => void;
  taken: (name: string) => boolean;
}) {
  const [name, setName] = useState("");
  const clean = name.trim();
  const clash = clean !== "" && taken(clean);
  return (
    <form
      className={s.newList}
      onSubmit={(e) => {
        e.preventDefault();
        if (!clean || clash) return;
        onAdd(clean);
        setName("");
      }}
    >
      <label className="sr-only" htmlFor="new-list">
        New list
      </label>
      <input
        id="new-list"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New list"
        maxLength={60}
      />
      <button aria-label="Create list" disabled={!clean || clash}>
        <Plus size={18} strokeWidth={2.5} />
      </button>
      {clash && (
        <p className={s.err}>There is already a list called “{clean}”.</p>
      )}
    </form>
  );
}

type Update = (id: string, f: (l: List) => List | null) => void;

// Each list is end-to-end encrypted unless its owner switches that off, so integrations, the calendar feed and
// shared links can use it. Switching off asks twice: the server can then read the list.
function Privacy({ list, update }: { list: List; update: Update }) {
  const [armed, setArmed] = useState(false);
  if (list.plain)
    return (
      <button
        className={s.privacy}
        data-plain
        onClick={() => update(list.id, (l) => ({ ...l, plain: false }))}
        title="Encrypt this list again; integrations and shared links stop seeing it"
      >
        <LockOpen size={14} strokeWidth={2.5} aria-hidden /> Not encrypted:
        integrations can read it · <u>Encrypt</u>
      </button>
    );
  return (
    <button
      className={s.privacy}
      data-armed={armed || undefined}
      onClick={() => {
        if (!armed) return setArmed(true);
        update(list.id, (l) => ({ ...l, plain: true }));
        setArmed(false);
      }}
      onBlur={() => setArmed(false)}
      title="Only you (and your team) can read this list"
    >
      <Lock size={14} strokeWidth={2.5} aria-hidden />{" "}
      {armed
        ? "Switch off encryption so integrations can use it? Our server could read this list. Click again"
        : "End-to-end encrypted"}
    </button>
  );
}

const flatten = (ts: Task[]) => ts.flatMap((t) => [t, ...t.sub]);

function ListView({
  list,
  lists,
  update,
  focus,
}: {
  list: List;
  lists: { id: string; name: string }[];
  update: Update;
  focus?: { id: string } | null;
}) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [armed, setArmed] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    focus?.id ?? null,
  ); // the task whose editor is open
  const [focused, setFocused] = useState(focus);
  if (focus !== focused) {
    setFocused(focus);
    if (focus) setSelected(focus.id);
  }
  const me = authClient.useSession().data?.user.id;
  const [show, setShow] = useState<Show>("open");
  const [sort, setSort] = useState<Sort>("mine");
  const [picked, setPicked] = useState<Set<string>>(new Set()); // Ctrl/Cmd-click selection
  const [binned, setBinned] = useState<{
    before: Task[];
    text: string;
    ids?: string[];
  } | null>(null);
  // Binned tasks also go to the workspace's bin for 7 days. A task whose parent goes too travels inside it.
  const bin = (gone: Task[]) => {
    const inside = new Set(gone.flatMap((t) => t.sub.map((x) => x.id)));
    const top = gone.filter((t) => !inside.has(t.id));
    toBin(top, list);
    return top.map((t) => t.id);
  };
  const today = todayISO();
  // The minute of the day, kept current so a task turns late when its time passes.
  const [nowMin, setNowMin] = useState(
    () => new Date().getHours() * 60 + new Date().getMinutes(),
  );
  useEffect(() => {
    const t = setInterval(
      () => setNowMin(new Date().getHours() * 60 + new Date().getMinutes()),
      30_000,
    );
    return () => clearInterval(t);
  }, []);
  const c = count(list.tasks);
  const setTasks = (f: (ts: Task[]) => Task[]) =>
    update(list.id, (l) => ({ ...l, tasks: f(l.tasks) }));
  const isTop = (id: string) => list.tasks.some((t) => t.id === id);
  const pick = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const applySticker = (key: string, ids: string[]) => {
    if (key.startsWith("custom-"))
      return dispatchEvent(
        new CustomEvent("todone:custom", { detail: { key, ids } }),
      );
    const patch = sticker(key, today);
    if (patch)
      setTasks((ts) =>
        ids.reduce(
          (acc, id) => mapTask(acc, id, (t) => ({ ...t, ...patch })),
          ts,
        ),
      );
  };
  // Dropping a task: on a note's left or right edge puts it before or after; in the middle nests it.
  // Among subtasks, the top or bottom half puts it above or below.
  // While sorted, the screen isn't your order, so edges nest too instead of reordering.
  const place = (arg: string, at: At) =>
    !isTop(arg)
      ? placeOn(at, "y", false)
      : sort === "mine"
        ? placeOn(at, "x")
        : ("inside" as const);
  // While a note is dragged over another's left or right edge, an empty slot opens there and the
  // neighbours shift aside; the slot is a drop target too, so the gap holds while the pointer is in it.
  const [gap, setGap] = useState<{
    target: string;
    place: "before" | "after";
    ids: string[];
  } | null>(null);
  // Notes glide to their new spots when the slot opens or moves, or a drop lands.
  const boardRef = useGlide<HTMLUListElement>();
  const drop = useDrop(`list-${list.id}`, {
    accept: (p, arg) =>
      p.kind === "sticker"
        ? arg !== "unnest" && arg !== "gap"
        : p.kind === "task" &&
          p.listId === list.id &&
          !p.ids.includes(arg) &&
          (arg === "gap"
            ? !!gap
            : arg === "unnest"
              ? p.ids.some((id) => !isTop(id))
              : !!findTask(list.tasks, arg)),
    where: (p, arg, at) => {
      if (p.kind !== "task" || arg === "unnest") return "inside";
      if (arg === "gap") return "inside";
      const where = place(arg, at);
      const slot =
        isTop(arg) && where !== "inside"
          ? { target: arg, place: where, ids: p.ids }
          : null;
      setGap((g) =>
        g?.target === slot?.target && g?.place === slot?.place ? g : slot,
      );
      return where;
    },
    leave: () => setGap(null),
    drop: (p, arg, at) => {
      setGap(null);
      if (p.kind === "sticker")
        applySticker(p.key, picked.has(arg) ? [...picked] : [arg]);
      else if (p.kind === "task") {
        setTasks((ts) =>
          arg === "gap" && gap
            ? moveTasks(ts, p.ids, gap.target, gap.place)
            : arg === "unnest"
              ? p.ids.reduce((acc, id) => unnest(acc, id), ts)
              : moveTasks(ts, p.ids, arg, place(arg, at)),
        );
        setPicked(new Set());
      }
    },
  });
  // The bin takes tasks, or a date sticker: then every task due that day goes. Either way, undo puts the list back.
  const binDrop = useDrop(`bin-${list.id}`, {
    accept: (p) =>
      (p.kind === "task" && p.listId === list.id) ||
      (p.kind === "sticker" && !!sticker(p.key, today)?.due),
    drop: (p) => {
      const before = list.tasks;
      if (p.kind === "task") {
        const gone = flatten(before).filter((t) => p.ids.includes(t.id));
        setTasks((ts) =>
          p.ids.reduce((acc, id) => mapTask(acc, id, () => null), ts),
        );
        binSound();
        setBinned({
          before,
          ids: bin(gone),
          text:
            gone.length > 1
              ? `Deleted ${gone.length} tasks.`
              : `Deleted “${gone[0]?.title}”.`,
        });
        setPicked(new Set());
      } else if (p.kind === "sticker") {
        const due = sticker(p.key, today)!.due!;
        const gone = flatten(before).filter((t) => t.due === due);
        const day = relDue(due, today);
        if (!gone.length)
          return setBinned({ before, text: `Nothing is due ${day}.` });
        setTasks((ts) =>
          gone.reduce((acc, t) => mapTask(acc, t.id, () => null), ts),
        );
        binSound();
        setBinned({
          before,
          ids: bin(gone),
          text: `Deleted ${gone.length} task${gone.length === 1 ? "" : "s"} due ${day}.`,
        });
      }
    },
  });
  useEffect(() => {
    if (!binned) return;
    const t = setTimeout(() => setBinned(null), 10_000);
    return () => clearTimeout(t);
  }, [binned]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) =>
      e.key === "Escape" && setPicked(new Set());
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);
  // Cmd/Ctrl+A picks every task on the board (as shown), unless you're typing or a task is open.
  useEffect(() => {
    const all = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        e.key.toLowerCase() !== "a" ||
        !(e.metaKey || e.ctrlKey) ||
        e.altKey ||
        selected ||
        el.closest("input, textarea, select, [contenteditable=true]")
      )
        return;
      e.preventDefault();
      setPicked(
        new Set(board(list.tasks, show, sort, today, nowMin).map((t) => t.id)),
      );
    };
    addEventListener("keydown", all);
    return () => removeEventListener("keydown", all);
  }, [list.tasks, show, sort, today, nowMin, selected]);

  const colors = noteColors(list.tasks);
  const row = {
    listId: list.id,
    today,
    nowMin,
    setTasks,
    selected,
    onSelect: setSelected,
    picked,
    onPick: pick,
    drop,
    colors,
    lists,
  };

  return (
    <>
      <div className={s.listHead}>
        {/* The bin: drop tasks (or a date sticker) to delete them, with undo; click twice to delete the whole list. */}
        <button
          className={s.bin}
          data-tour="bin"
          data-bin
          data-armed={armed}
          {...binDrop("bin")}
          onClick={() => (armed ? update(list.id, () => null) : setArmed(true))}
          onBlur={() => setArmed(false)}
          aria-label={
            armed
              ? "Click again to delete this list"
              : "Delete list, or drop tasks here to delete them"
          }
          title={
            armed
              ? "Click again to delete this list"
              : "Drop tasks here to delete them. Click to delete the list."
          }
        >
          <Trash2 size={28} strokeWidth={2.5} />
          <span>{armed ? "Delete list?" : "Bin"}</span>
        </button>
        {/* Click the name to rename; Enter or clicking away saves, Esc cancels. */}
        {renaming ? (
          <>
            <label className="sr-only" htmlFor="list-name">
              List name
            </label>
            <input
              id="list-name"
              defaultValue={list.name}
              autoFocus
              maxLength={60}
              className={`display ${s.title} ${s.titleEdit}`}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  e.currentTarget.value = list.name;
                  setRenaming(false);
                }
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== list.name)
                  update(list.id, (l) => ({ ...l, name: v }));
                setRenaming(false);
              }}
            />
          </>
        ) : (
          <h1 className={`display ${s.title}`}>
            <button
              className={s.titleBtn}
              onClick={() => setRenaming(true)}
              title="Click to rename"
            >
              {list.name}
            </button>
          </h1>
        )}
        <p className={s.progress}>
          {c.all ? `${c.done} of ${c.all} done` : "Empty"}
          <span className={s.bar} aria-hidden>
            <i style={{ transform: `scaleX(${c.all ? c.done / c.all : 0})` }} />
          </span>
        </p>
        <div
          className={s.listMeta}
          style={{ "--list": listColor(list.id) } as React.CSSProperties}
        >
          <IconPick
            id={list.id}
            name={list.name}
            icon={list.icon}
            onPick={(icon) => update(list.id, (l) => ({ ...l, icon }))}
          />
          <Privacy list={list} update={update} />
        </div>
      </div>
      <ListGoals list={list} />

      {binned && (
        <div className={s.undo} role="status">
          {binned.text}
          {binned.ids?.length ? (
            <small>In the Bin (sidebar) for 7 days.</small>
          ) : null}
          {binned.before !== list.tasks && (
            <button
              className={s.ghost}
              onClick={() => {
                setTasks(() => binned.before);
                if (binned.ids) unbin(binned.ids);
                setBinned(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
      {picked.size > 0 && (
        <div className={s.pickBar} role="status">
          <b>{picked.size} selected.</b> Drag them onto a sticker, the bin or
          another list, or click a sticker.
          <button className={s.ghost} onClick={() => setPicked(new Set())}>
            Clear <kbd>Esc</kbd>
          </button>
        </div>
      )}
      <div className={s.listBody}>
        <div>
          <form
            className={s.add}
            data-tour="add"
            onSubmit={(e) => {
              e.preventDefault();
              const t = draft.trim();
              if (!t) return;
              setTasks((ts) => [
                ...ts,
                { id: uid(), title: t, done: false, sub: [] },
              ]);
              setDraft("");
            }}
          >
            <label className="sr-only" htmlFor="new-task">
              New task
            </label>
            <input
              id="new-task"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task, press enter"
              autoComplete="off"
            />
            <button
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              disabled={!draft.trim()}
            >
              Add
            </button>
          </form>

          {list.tasks.length > 0 && (
            <div className={s.boardBar} data-tour="filters">
              <div className={s.seg} role="group" aria-label="Show">
                {SHOWS.map(([k, name]) => (
                  <button
                    key={k}
                    aria-pressed={show === k}
                    onClick={() => setShow(k)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {show === "done" && list.tasks.some((t) => t.done) && (
                // Finished tasks (and their steps) go to the Bin for 7 days; the undo bar can put them back.
                <button
                  className={s.ghost}
                  onClick={() => {
                    const before = list.tasks;
                    const gone = before.filter((t) => t.done);
                    setTasks((ts) => ts.filter((t) => !t.done));
                    binSound();
                    setBinned({
                      before,
                      ids: bin(gone),
                      text: `Cleared ${gone.length} done task${gone.length === 1 ? "" : "s"}.`,
                    });
                  }}
                >
                  <Trash2 size={14} strokeWidth={2.5} aria-hidden /> Clear done
                  ({list.tasks.filter((t) => t.done).length})
                </button>
              )}
              <div className={s.sortBy}>
                <span aria-hidden>Sort</span>
                <Select
                  label="Sort"
                  value={sort}
                  options={SORTS.map(([value, label]) => ({ value, label }))}
                  onChange={(v) => setSort(v as Sort)}
                />
              </div>
            </div>
          )}

          {list.tasks.length ? (
            // A step dragged out of its note onto the board's empty space becomes a main task again.
            <ul
              className={s.tasks}
              data-tour="board"
              ref={boardRef}
              {...drop("unnest")}
            >
              {board(list.tasks, show, sort, today, nowMin).flatMap((t) => {
                const note = (
                  <TaskRow
                    key={t.id}
                    task={t}
                    {...row}
                    top
                    dragged={!!gap?.ids.includes(t.id)}
                  />
                );
                if (gap?.target !== t.id) return [note];
                const slot = (
                  <li
                    key="gap"
                    className={s.slot}
                    {...drop("gap")}
                    aria-hidden
                  />
                );
                return gap.place === "before" ? [slot, note] : [note, slot];
              })}
              {show === "open" && list.tasks.some((t) => waiting(t, today)) && (
                <li className={s.noMatch}>
                  {list.tasks.filter((t) => waiting(t, today)).length} repeating
                  task
                  {list.tasks.filter((t) => waiting(t, today)).length === 1
                    ? " comes"
                    : "s come"}{" "}
                  back on its day.{" "}
                  <button className={s.link} onClick={() => setShow("all")}>
                    Show
                  </button>
                </li>
              )}
              {!board(list.tasks, show, sort, today, nowMin).length &&
                !list.tasks.some((t) => waiting(t, today)) && (
                  <li className={s.noMatch}>
                    No tasks here.{" "}
                    <button className={s.link} onClick={() => setShow("all")}>
                      Show all
                    </button>
                  </li>
                )}
            </ul>
          ) : (
            <div className={s.empty}>
              <p className="display">Nothing here.</p>
              <p>Add the first task above. Enjoy the quiet while it lasts.</p>
            </div>
          )}
        </div>
        <Stickers
          active={!!selected || picked.size > 0}
          selected={
            picked.size > 1
              ? `${picked.size} tasks`
              : (findTask(list.tasks, [...picked][0] ?? selected)?.title ??
                null)
          }
          onApply={(key, taskIds) =>
            applySticker(
              key,
              taskIds ??
                (picked.size ? [...picked] : selected ? [selected] : []),
            )
          }
          task={
            picked.size > 1 ? null : (findTask(list.tasks, selected) ?? null)
          }
        />
      </div>
      {selected && picked.size <= 1 && findTask(list.tasks, selected) && (
        <TaskPanel
          key={selected}
          task={findTask(list.tasks, selected)!}
          top={isTop(selected)}
          fill={colors.get(selected)}
          edit={(f) => setTasks((ts) => mapTask(ts, selected, f))}
          onTick={() => setTasks((ts) => tick(ts, selected, today, me))}
          onDelete={() => {
            const before = list.tasks;
            const gone = flatten(before).filter((t) => t.id === selected);
            setTasks((ts) => mapTask(ts, selected, () => null));
            binSound();
            setBinned({
              before,
              ids: bin(gone),
              text: `Deleted “${gone[0]?.title}”.`,
            });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function TaskRow({
  listId,
  task,
  today,
  nowMin,
  setTasks,
  selected,
  onSelect,
  picked,
  onPick,
  drop,
  colors,
  lists,
  top = false,
  dragged = false,
}: {
  listId: string;
  task: Task;
  today: string;
  nowMin: number;
  setTasks: (f: (ts: Task[]) => Task[]) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  picked: Set<string>;
  onPick: (id: string) => void;
  drop: (arg: string) => object;
  colors: Map<string, string>;
  lists: { id: string; name: string }[];
  top?: boolean;
  dragged?: boolean; // the note being moved, faded while its new slot is shown
}) {
  const me = authClient.useSession().data?.user.id;
  const open = selected === task.id;
  const [renaming, setRenaming] = useState(false);
  const edit = (f: (t: Task) => Task | null) =>
    setTasks((ts) => mapTask(ts, task.id, f));
  const late = lateBy(task, today, nowMin);
  // Dragging a selected task carries the whole selection.
  const ids = picked.has(task.id) ? [...picked] : [task.id];
  const row = {
    listId,
    today,
    nowMin,
    setTasks,
    selected,
    onSelect,
    picked,
    onPick,
    drop,
    colors,
    lists,
  };

  return (
    <li
      className={top ? s.note : s.taskItem}
      data-id={top ? task.id : undefined}
      data-open={open || undefined}
      data-dragged={dragged || undefined}
      style={
        top
          ? ({ "--fill": colors.get(task.id) } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={s.row}
        data-done={task.done}
        data-waiting={waiting(task, today) || undefined}
        data-picked={picked.has(task.id) || undefined}
        {...drop(task.id)}
        {...draggable(
          { kind: "task", listId, id: task.id, ids },
          ids.length > 1 ? `${ids.length} tasks` : task.title,
        )}
        // Ctrl/Cmd-click selects instead of ticking or opening.
        onClickCapture={(e) => {
          if (!e.metaKey && !e.ctrlKey) return;
          e.preventDefault();
          e.stopPropagation();
          onPick(task.id);
        }}
      >
        <button
          className={s.check}
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.title}
          // A repeat's next copy waits for its day: it can't be ticked ahead (and earn XP for days not here yet).
          disabled={waiting(task, today)}
          data-tip={
            waiting(task, today)
              ? `Comes back ${dueName(task.due!, today)}`
              : undefined
          }
          onClick={() => setTasks((ts) => tick(ts, task.id, today, me))}
        >
          {task.done && <Check size={16} strokeWidth={3.5} />}
        </button>
        {/* Click picks the task (its stickers and custom values are in the sidebar); double-click renames it. */}
        {renaming ? (
          <input
            className={`${s.taskTitle} ${s.titleField}`}
            aria-label="Task name"
            defaultValue={task.title}
            autoFocus
            maxLength={500}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== task.title) edit((t) => ({ ...t, title: v }));
              setRenaming(false);
            }}
          />
        ) : (
          <button
            className={s.taskTitle}
            onClick={() => onSelect(open ? null : task.id)}
            onDoubleClick={() => setRenaming(true)}
            onKeyDown={(e) => e.key === "Escape" && open && onSelect(null)}
            aria-pressed={open}
            title="Click to pick, double-click to rename"
          >
            {task.title}
          </button>
        )}
        {/* Tasks start with no date or estimate; clicking a chip takes it off again. */}
        <span className={s.chips}>
          {task.rep ? (
            <button
              className={s.chip}
              onClick={() => edit((t) => ({ ...t, rep: undefined }))}
              aria-label={`Stop repeating ${task.rep}`}
              title="Stop repeating"
            >
              {repeatLabel(task.rep)}
            </button>
          ) : null}
          {task.pri ? (
            <button
              className={s.chip}
              data-pri={task.pri}
              onClick={() => edit((t) => ({ ...t, pri: undefined }))}
              aria-label={`Remove priority ${PRI_NAME[task.pri]}`}
              title="Remove priority"
            >
              {PRI_NAME[task.pri]}
            </button>
          ) : null}
          {task.effort ? (
            <button
              className={s.chip}
              data-effort
              onClick={() => edit((t) => ({ ...t, effort: undefined }))}
              aria-label={`Remove effort ${task.effort.toUpperCase()}`}
              title="Remove effort"
            >
              {task.effort.toUpperCase()}
            </button>
          ) : null}
          {task.est ? (
            <button
              className={s.chip}
              onClick={() => edit((t) => ({ ...t, est: undefined }))}
              aria-label={`Remove estimate ${fmtMinutes(task.est)}`}
              title="Remove estimate"
            >
              {fmtMinutes(task.est)}
            </button>
          ) : null}
          {task.spent ? (
            <span title="Time spent in focus">⏳ {fmtMinutes(task.spent)}</span>
          ) : null}
          {task.share ? <SharedChip share={task.share} /> : null}
          {task.goal ? <GoalChip goal={task.goal} /> : null}
          {task.files?.length ? (
            <span
              title={`${task.files.length} attachment${task.files.length === 1 ? "" : "s"}`}
            >
              <Paperclip size={11} strokeWidth={2.75} aria-hidden />{" "}
              {task.files.length}
            </span>
          ) : null}
          {task.note ? (
            <span title="Has a description">
              <AlignLeft size={11} strokeWidth={2.75} aria-hidden />
            </span>
          ) : null}
          {task.due ? (
            <button
              className={`${s.chip} ${late !== null ? s.late : s.due}`}
              onClick={() =>
                edit((t) => ({ ...t, due: undefined, at: undefined }))
              }
              aria-label={`Remove date ${relDue(task.due, today)}`}
              title="Remove date"
            >
              {late !== null && late !== Infinity
                ? `${lateLabel(late)} · ${task.at}`
                : `${relDue(task.due, today)}${task.at ? ` ${task.at}` : ""}`}
            </button>
          ) : null}
        </span>
      </div>

      {task.sub.length > 0 && (
        <ul className={s.subs}>
          {task.sub.map((x) => (
            <TaskRow key={x.id} task={x} {...row} />
          ))}
        </ul>
      )}
    </li>
  );
}

// A shared task's chip, with a badge for new anonymous comments (1, 2 … 9+) until its panel is opened.
function SharedChip({ share }: { share: string }) {
  const n = useUnread(share);
  return (
    <span
      className={s.sharedChip}
      title={
        n
          ? `${n} new comment${n === 1 ? "" : "s"} · shared by link, not end-to-end encrypted`
          : "Shared by link: not end-to-end encrypted"
      }
    >
      <LockOpen size={11} strokeWidth={2.75} aria-hidden /> Shared
      {n > 0 && (
        <b className={s.unread} aria-label={`${n} new`}>
          {n > 9 ? "9+" : n}
        </b>
      )}
    </span>
  );
}

// The goal a task moves forward, on its card.
function GoalChip({ goal }: { goal: string }) {
  const g = useGoalItems().items.find(
    (i) => i.t === "goal" && i.id === goal,
  ) as Goal | undefined;
  if (!g) return null;
  return (
    <span className={s.goalChip} title={`Toward: ${g.title}`}>
      <Target size={11} strokeWidth={2.75} aria-hidden /> {g.title}
    </span>
  );
}

// "tomorrow", "Mon", or "12 Nov" for a day after today.
const dueName = (due: string, today: string) => {
  const d = new Date(`${due}T00:00`);
  const days = Math.round((+d - +new Date(`${today}T00:00`)) / 86_400_000);
  return days === 1
    ? "tomorrow"
    : days < 7
      ? `on ${d.toLocaleDateString(undefined, { weekday: "long" })}`
      : `on ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
};
