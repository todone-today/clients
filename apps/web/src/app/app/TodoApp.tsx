"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Welcome, skipWelcome } from "@/components/Welcome";
import { setTour, tourDue } from "@/lib/onboard";
import { Intro } from "./Intro";
import { Tour } from "./Tour";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Target,
  ListChecks,
  CalendarDays,
  Gift,
  MessageSquare,
  Lightbulb,
  Lock,
  LockOpen,
  Paperclip,
  Menu,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  ChevronDown,
  BrushCleaning,
  LayoutGrid,
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
import { IconPick, ListIcon, NOTES, listColor, noteColor } from "./listIcon";
import { useUnread } from "./unread";
import { useFolded } from "./folded";
import { Account } from "./Account";
import { Diamond, PlanPrompt, needsPlan, usePlan } from "./PlanPrompt";
import { InstallPrompt } from "./InstallPrompt";
import { PullRefresh } from "./PullRefresh";
import { useSwipeDrawer } from "./swipeDrawer";
import { Search } from "./Search";
import { usage } from "@/lib/usage";
import { fileFeedback } from "./feedback-inbox";
import { openPlans } from "./checkout";
import { AiImport } from "./AiImport";
import { AllLists } from "./AllLists";
import { AskBar } from "./AskBar";
import { Brainstorm, ideaToTask } from "./Brainstorm";
import { CalendarView } from "./CalendarView";
import { Feedback } from "./Feedback";
import { Integrations } from "./Integrations";
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
  upcoming,
  doneToday,
} from "@todone/sdk/tasks";
import s from "./app.module.css";

// Each main task is a sticky note; its colour comes from its id, so it stays put when tasks move.
// Sticky colours. Each note's colour comes from its own id, so adding, deleting or moving notes doesn't recolour
// the list; a note that would match one just before it takes the next colour instead.
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

// Tasks only (steps are part of their task), and repeats waiting for their day aren't counted until it comes.
const count = (ts: Task[], today = todayISO()) => {
  const all = ts.filter((t) => !waiting(t, today));
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
  const plan = usePlan();
  // ?plan=plus-year from the pricing page, read once (the address is tidied up after loading).
  const [planWant] = useState(() => (typeof location === "undefined" ? null : new URLSearchParams(location.search).get("plan")));
  // ?go=add or ?go=calendar: the home-screen icon's shortcuts (manifest.ts), read once like ?plan.
  const [launch] = useState(() => (typeof location === "undefined" ? null : new URLSearchParams(location.search).get("go")));
  // First visit: "About you" (Intro), then the short tour; the i in the top bar plays the tour again.
  const [intro, setIntro] = useState(false);
  const [touring, setTouring] = useState(false);
  useEffect(() => {
    if (userId && tourDue(userId)) Promise.resolve().then(() => setTouring(true)); // reloaded mid-tour
  }, [userId]);
  const [drawer, setDrawer] = useState(false);
  useSwipeDrawer(drawer, setDrawer);
  // Desktop: the sidebar can fold away for more room for notes; remembered in this browser.
  const [slim, setSlim] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("todone:slim");
      // A tablet starts with the rail, so the board gets the width; once chosen, the choice is kept.
      if (
        saved === "1" ||
        (saved === null &&
          matchMedia("(min-width: 761px) and (max-width: 1100px)").matches)
      )
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
  // other lists (dropped above or below to reorder), and goals (they're linked to that list). Brainstorm ("ideas")
  // takes tasks back as ideas.
  const dropOnList = useDrop("sidebar", {
    accept: (p, listId) =>
      listId === "ideas"
        ? p.kind === "task"
        : p.kind === "idea" ||
          (p.kind === "task" && p.listId !== listId) ||
          (p.kind === "list" && p.id !== listId) ||
          p.kind === "goal",
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
      else if (p.kind === "goal")
        changeGoals(lists, (xs) => xs.map((x) => (x.id === p.id && x.t === "goal" ? { ...x, list: listId } : x)));
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
  // Ask todone answers itself only where the server has an AI set up, and never in the demo.
  const [askAi, setAskAi] = useState(false);
  useEffect(() => {
    if (demo) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((x) => setAskAi(!!x?.ai), () => {});
  }, [demo]);
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

  // Feedback for the maintainer: new tickets are filed into its lists once per visit, in the personal space
  // (everyone else's request comes back empty).
  const filed = useRef(false);
  useEffect(() => {
    if (demo || orgId || vault !== "open" || !lists || filed.current) return;
    filed.current = true;
    fileFeedback(lists);
  }, [demo, orgId, vault, lists]);

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
      // From a "Choose Plus" on the pricing page: the plans, straight away (the starter lists still get made
      // underneath, so closing the plans doesn't leave an empty page).
      if (planWant) openPlans({ want: planWant });
      if (launch === "calendar") return setPanel("calendar");
      if (launch === "add")
        setTimeout(() => document.querySelector<HTMLInputElement>("input[placeholder^='Add a task']")?.focus(), 300);
      // First visit: "About you" sets up their first list from what they say (made here, so it's encrypted).
      if (!orgId && (await startOnboarding())) {
        skipWelcome();
        setIntro(true);
      }
    })().catch(() => {});
  }, [demo, userId, orgId, vault, add, planWant, launch]);
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

  const folded = slim;
  // The tour again, from the i in the top bar (or the menu on a phone), on the board where it points.
  const steps = () => {
    setDrawer(false);
    setPanel(null);
    setTouring(true);
  };
  const endTour = () => {
    setTouring(false);
    if (userId) setTour(userId, false);
  };
  return (
    <div className={s.shell} data-slim={folded || undefined}>
      <Welcome />
      <PlanPrompt />
      {!demo && !intro && !touring && <InstallPrompt />}
      {!demo && <PullRefresh />}
      {intro && userId && (
        <Intro
          who={userId}
          ai={askAi}
          add={add}
          onDone={(id) => {
            setIntro(false);
            open(id);
            setTour(userId, true);
            setTouring(true);
          }}
        />
      )}
      {touring && lists && <Tour onEnd={endTour} />}
      <header className={s.top}>
        <button
          className={s.menu}
          data-tour="menu"
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
                : panel === "all"
                  ? "All lists"
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
          // Signed in, the logo is just the brand; the Lists tab is the way home.
          <span className={s.mark}>
            <Logo size={26} />
          </span>
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
              aria-label={name}
              data-tip={name}
            >
              <Icon size={16} strokeWidth={2.5} aria-hidden />{" "}
              <span className={s.tabName}>{name}</span>
            </button>
          ))}
        </nav>
        <p className={s.local} role="status">
          {error && <span className={s.err}>{error}</span>}
        </p>
        {lists && <Search lists={lists} onOpen={open} tile={s.tile} />}
        {!demo && <NotificationBell onOpen={open} />}
        <XpTile onClick={() => show("rewards")} />
        <button
          className={s.tile}
          style={{ "--fill": "var(--cyan)" } as React.CSSProperties}
          onClick={steps}
          data-tour="steps"
          aria-label="Take the tour"
          data-tip="Take the tour"
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
          aria-label={folded ? "Show the sidebar" : "Fold the sidebar to icons"}
          data-tip={folded ? "Show the sidebar" : "Fold the sidebar to icons"}
        >
          {folded ? (
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
            full={plan.gated && (lists?.filter((l) => !l.kind).length ?? 0) >= plan.listLimit}
          />
          <button
            className={`${s.listBtn} ${s.ideasBtn} ${s.allBtn}`}
            aria-current={panel === "all"}
            onClick={() => show("all")}
            data-tip="All lists"
          >
            <span>
              <LayoutGrid size={16} strokeWidth={2.5} aria-hidden />{" "}
              <span className={s.label}>All lists</span>
            </span>
            <span className={s.open}>
              {sorted.reduce((n, l) => n + count(l.tasks).open, 0) || ""}
            </span>
          </button>
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
            ai={askAi}
            current={list?.id ?? null}
            onAdd={(name, tasks) => open(add(name, tasks))}
            onAppend={(id, tasks) => {
              update(id, (l) => ({ ...l, tasks: [...l.tasks, ...tasks] }));
              open(id);
            }}
          />
          {/* The top bar's i tile doesn't fit a phone, so the steps come back from here there. */}
          <button className={`${s.ghost} ${s.phoneOnly}`} onClick={steps}>
            <Info size={16} strokeWidth={2.5} aria-hidden /> Take the tour
          </button>
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
          lists && <Brainstorm lists={lists} add={add} update={update} ai={askAi} />
        ) : panel === "all" ? (
          lists && <AllLists lists={sorted} update={update} onOpen={open} />
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
            bar={askAi && <AskBar />}
          />
        ) : (
          // No lists yet: start in Brainstorm, where ideas can become the first tasks.
          <Brainstorm lists={lists} add={add} update={update} ai={askAi} />
        )}
      </main>
    </div>
  );
}

function NewList({
  onAdd,
  taken,
  full,
}: {
  onAdd: (name: string) => void;
  taken: (name: string) => boolean;
  full?: boolean; // Free's lists are all used: a new one needs a plan
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
        if (full) return needsPlan("Free holds 10 lists. Plus has as many as you need.");
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
      <button aria-label={full ? "Create list (needs Plus)" : "Create list"} disabled={!clean || clash}>
        {full ? <Diamond /> : <Plus size={18} strokeWidth={2.5} />}
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
  // A short sticker; what it means, and the switch, open in a small card on click (switching off asks twice).
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && (setOpen(false), setSure(false));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setSure(false));
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", esc);
    };
  }, [open]);
  const plain = !!list.plain;
  return (
    <div className={s.privacyBox} ref={box}>
      <button
        className={s.privacy}
        data-plain={plain || undefined}
        aria-expanded={open}
        onClick={() => (setOpen(!open), setSure(false))}
        data-tip={open ? undefined : plain ? "Integrations can read this list" : "Only you can read this list"}
      >
        {plain ? <LockOpen size={14} strokeWidth={2.5} aria-hidden /> : <Lock size={14} strokeWidth={2.5} aria-hidden />}
        {plain ? "Not encrypted" : "Encrypted"}
      </button>
      {open && (
        <div className={s.privacyCard} role="dialog" aria-label="Encryption">
          {plain ? (
            <>
              <p>
                <b>Not encrypted.</b> Our server can read this list, so integrations and calendar links can use it.
              </p>
              <button
                className="btn"
                style={{ "--fill": "var(--lime)" } as React.CSSProperties}
                onClick={() => (update(list.id, (l) => ({ ...l, plain: false })), setOpen(false))}
              >
                <Lock size={15} strokeWidth={2.75} aria-hidden /> Encrypt it
              </button>
            </>
          ) : (
            <>
              <p>
                <b>End-to-end encrypted.</b> It&apos;s locked on your device; nobody else can read it, not even us.
                Integrations and calendar links can&apos;t see it.
              </p>
              {sure ? (
                <>
                  <p className={s.privacyWarn}>Our server could read this list. Switch off anyway?</p>
                  <div className={s.privacyRow}>
                    <button
                      className="btn"
                      style={{ "--fill": "var(--hot)" } as React.CSSProperties}
                      onClick={() => (update(list.id, (l) => ({ ...l, plain: true })), setOpen(false), setSure(false))}
                    >
                      Switch off
                    </button>
                    <button className={s.link} onClick={() => setSure(false)}>
                      Keep it
                    </button>
                  </div>
                </>
              ) : (
                <button className={s.link} onClick={() => setSure(true)}>
                  Switch off for integrations…
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Only read in drag handlers (never while rendering), for how long a drag has rested on one note.
const clockNow = () => performance.now();
const flatten = (ts: Task[]) => ts.flatMap((t) => [t, ...t.sub]);

// Tasks already on the board when a list opened. Anything else that shows up later (just added, from Ask todone,
// moved in from another list) pops in like a sticker being stuck on; filters and re-renders don't replay it.
const known = new Set<string>();

function ListView({
  list,
  lists,
  update,
  focus,
  bar,
}: {
  list: List;
  lists: { id: string; name: string }[];
  update: Update;
  focus?: { id: string } | null;
  bar?: React.ReactNode; // Ask todone's bar, as wide as the tasks
}) {
  // A list opened: what it has is "known" (no pop), however long ago it was made.
  useState(() => {
    known.clear();
    for (const t of list.tasks) for (const x of [t, ...t.sub]) known.add(x.id);
  });
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  // Deleting a list always asks first (it can't be undone); linked goals go too by default, or stay, unlinked.
  const [asking, setAsking] = useState(false);
  const { lists: all } = useLists();
  const linked = useGoalItems().items.filter((g): g is Goal => g.t === "goal" && g.list === list.id);
  const removeList = (goalsToo: boolean) => {
    if (linked.length)
      changeGoals(all, (xs) =>
        xs.flatMap((x) =>
          x.t === "goal" && x.list === list.id ? (goalsToo ? [] : [{ ...x, list: undefined }]) : [x],
        ),
      );
    update(list.id, () => null);
  };
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
  // The sticker panel (wider screens): tucked away unless pinned, sliding in while a task is picked or held.
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem("todone:stickers") === "pinned";
    } catch {
      return false;
    }
  });
  const pin = (on: boolean) => {
    setPinned(on);
    try {
      localStorage.setItem("todone:stickers", on ? "pinned" : "auto");
    } catch {}
  };
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
  // Dropping a task moves it by default: onto a note's left or right half (or the gap beside it) puts it there.
  // Holding it over a note's middle for a moment makes it a step of that note instead, and the note says so.
  // Among steps, the top or bottom half puts it above or below. While sorted, the screen isn't your order, so
  // dropping on a note nests (after the same pause) and there's nothing to reorder.
  const NEST_AFTER = 450;
  type Aim = "before" | "after" | "inside" | "hold"; // hold: resting on a note's middle, not yet a step
  const dwell = useRef<{ arg: string; since: number } | null>(null);
  const aim = useRef<{ arg: string; where: Aim; side: "before" | "after" } | null>(null);
  const place = (arg: string, at: At): Aim => {
    if (!isTop(arg)) return placeOn(at, "y", false);
    const r = at.el.getBoundingClientRect();
    const f = (at.x - r.left) / r.width;
    if (sort === "mine" && (f <= 0.3 || f >= 0.7)) {
      dwell.current = null;
      return f < 0.5 ? "before" : "after";
    }
    // The middle never moves the layout (that's what made notes flicker): it waits, then offers to nest.
    if (dwell.current?.arg !== arg) dwell.current = { arg, since: clockNow() };
    return clockNow() - dwell.current.since >= NEST_AFTER ? "inside" : "hold";
  };
  // Over the board's empty space or the gutters: the nearest note, and its nearer side.
  const nearest = (ids: string[], at: At) => {
    let best: { id: string; d: number; side: "before" | "after" } | null = null;
    for (const el of at.el.querySelectorAll<HTMLElement>(":scope > [data-id]")) {
      const id = el.dataset.id!;
      if (ids.includes(id)) continue;
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - at.x, 0, at.x - r.right);
      const dy = Math.max(r.top - at.y, 0, at.y - r.bottom);
      const d = dy * 3 + dx; // same row first
      if (!best || d < best.d) best = { id, d, side: at.x < r.left + r.width / 2 ? "before" : "after" };
    }
    return best;
  };
  // While a note is dragged, an empty slot opens where it would land and the neighbours shift aside; the slot is
  // a drop target too, so the gap holds while the pointer is in it.
  const [gap, setGap] = useState<{
    target: string;
    place: "before" | "after";
    ids: string[];
  } | null>(null);
  const openGap = (slot: typeof gap) =>
    setGap((g) => (g?.target === slot?.target && g?.place === slot?.place ? g : slot));
  // Notes glide to their new spots when the slot opens or moves, or a drop lands.
  const boardRef = useGlide<HTMLUListElement>();
  const drop = useDrop(`list-${list.id}`, {
    say: (_, arg) => (arg === "gap" ? "Move here" : arg === "unnest" ? "Make it a task of its own" : undefined),
    accept: (p, arg) =>
      p.kind === "sticker"
        ? arg !== "unnest" && arg !== "gap"
        : p.kind === "task" &&
          p.listId === list.id &&
          !p.ids.includes(arg) &&
          (arg === "gap"
            ? !!gap
            : arg === "unnest"
              ? p.ids.some((id) => !isTop(id)) || sort === "mine"
              : !!findTask(list.tasks, arg)),
    where: (p, arg, at) => {
      if (p.kind !== "task") return "inside";
      if (arg === "gap") return "inside";
      if (arg === "unnest") {
        dwell.current = null;
        const n = sort === "mine" && p.ids.every(isTop) ? nearest(p.ids, at) : null;
        openGap(n ? { target: n.id, place: n.side, ids: p.ids } : null);
        aim.current = null;
        return "inside";
      }
      const where = place(arg, at);
      const r = at.el.getBoundingClientRect();
      aim.current = { arg, where, side: at.x < r.left + r.width / 2 ? "before" : "after" };
      if (where === "before" || where === "after")
        openGap(isTop(arg) ? { target: arg, place: where, ids: p.ids } : null);
      return where;
    },
    leave: () => {
      setGap(null);
      dwell.current = null;
    },
    drop: (p, arg, at) => {
      setGap(null);
      dwell.current = null;
      if (p.kind === "sticker")
        applySticker(p.key, picked.has(arg) ? [...picked] : [arg]);
      else if (p.kind === "task") {
        // What the screen showed is what happens: the last answer for this target, not a fresh guess.
        const last = aim.current?.arg === arg ? aim.current : null;
        const where = last?.where ?? place(arg, at);
        setTasks((ts) =>
          (arg === "gap" || arg === "unnest" || where === "hold") && gap
            ? moveTasks(ts, p.ids, gap.target, gap.place) // into the open slot
            : arg === "unnest"
              ? p.ids.reduce((acc, id) => unnest(acc, id), ts)
              : where === "hold"
                ? sort === "mine"
                  ? moveTasks(ts, p.ids, arg, last?.side ?? "after")
                  : moveTasks(ts, p.ids, arg, "inside")
                : moveTasks(ts, p.ids, arg, where),
        );
        setPicked(new Set());
      }
      aim.current = null;
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
        {/* The bin: drop tasks (or a date sticker) to delete them, with undo; click it to delete the whole list (asks first). */}
        <button
          className={s.bin}
          data-tour="bin"
          data-bin
          {...binDrop("bin")}
          onClick={() => setAsking(true)}
          aria-label="Delete list, or drop tasks here to delete them"
          title="Drop tasks here to delete them. Click to delete the list."
        >
          <Trash2 size={28} strokeWidth={2.5} />
          <span>Bin</span>
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
      {asking && (
        <DeleteList
          name={list.name}
          tasks={c.all}
          goals={linked.map((g) => g.title)}
          onCancel={() => setAsking(false)}
          onDelete={(goalsToo) => {
            setAsking(false);
            removeList(goalsToo);
          }}
        />
      )}
      <ListGoals list={list} />

      {binned && (
        <div className={s.undo} role="status">
          {binned.text}
          {binned.ids?.length ? (
            <small>In the Bin for 7 days.</small>
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
      <div className={s.listBody} data-stickers={pinned ? "pinned" : "auto"}>
        <div>
          <form
            className={s.add}
            data-tour="add"
            onSubmit={(e) => {
              e.preventDefault();
              const t = draft.trim();
              if (!t) return;
              // New tasks go first. Colours come from ids and avoid the two notes before them, so the new note gets
              // an id whose colour differs from the top two: then no note below it changes colour.
              const near = new Set(list.tasks.slice(0, 2).map((x) => colors.get(x.id)));
              let id = uid();
              for (let i = 0; i < 30 && near.has(NOTES[noteColor(id)]); i++) id = uid();
              setTasks((ts) => [{ id, title: t, done: false, created: Date.now(), sub: [] }, ...ts]);
              usage({ name: "task_created", via: "typed" });
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
                  className={s.clearDone}
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
                  <BrushCleaning size={17} strokeWidth={2.5} aria-hidden /> Clear done
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
              {show === "open" && list.tasks.some((t) => waiting(t, today) && !upcoming(t, today)) && (
                <li className={s.noMatch}>
                  {(() => {
                    const n = list.tasks.filter((t) => waiting(t, today) && !upcoming(t, today)).length;
                    return `${n} repeating task${n === 1 ? " comes" : "s come"} back on ${n === 1 ? "its" : "their"} day. `;
                  })()}
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
          {bar}
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
        {/* Wider screens: the one control for the sticker panel, a big tab on the right edge pointing at it. */}
        <button
          className={s.stickTab}
          aria-expanded={pinned}
          aria-label={pinned ? "Hide stickers" : "Show stickers"}
          data-peek={!!selected || picked.size > 0 || undefined}
          onClick={() => pin(!pinned)}
        >
          {pinned ? (
            <>
              Hide <ChevronRight size={20} strokeWidth={3} aria-hidden />
            </>
          ) : (
            <>
              <ChevronLeft size={20} strokeWidth={3} aria-hidden /> Stickers
            </>
          )}
        </button>
      </div>
      {selected && picked.size <= 1 && findTask(list.tasks, selected) && (
        <TaskPanel
          key={selected}
          task={findTask(list.tasks, selected)!}
          top={isTop(selected)}
          fill={colors.get(selected)}
          edit={(f) => setTasks((ts) => mapTask(ts, selected, f))}
          onTick={() => {
            if (!findTask(list.tasks, selected)?.done) usage({ name: "task_done" });
            setTasks((ts) => tick(ts, selected, today, me));
          }}
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
  const [pop] = useState(() => !known.has(task.id));
  useEffect(() => void known.add(task.id), [task.id]);
  const [renaming, setRenaming] = useState(false);
  const [folded, setFolded] = useFolded(task.id);
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
      data-card={top || undefined}
      data-pop={pop || undefined}
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
          onClick={() => {
            if (!task.done) usage({ name: "task_done" });
            setTasks((ts) => tick(ts, task.id, today, me));
          }}
        >
          {task.done && <Check size={16} strokeWidth={3.5} />}
        </button>
        {/* Click opens the task's panel (rename it there); Ctrl/Cmd-click picks it (with others). */}
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
            onKeyDown={(e) => {
              if (e.key === "Escape" && open) onSelect(null);
              // Alt + arrows move a note among its neighbours, for keyboards (and anyone who'd rather not drag).
              const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
              if (!top || !e.altKey || !(back || e.key === "ArrowRight" || e.key === "ArrowDown")) return;
              e.preventDefault();
              let el = e.currentTarget.closest("li")?.[back ? "previousElementSibling" : "nextElementSibling"];
              while (el && !(el as HTMLElement).dataset.id) el = el[back ? "previousElementSibling" : "nextElementSibling"];
              const to = (el as HTMLElement | null)?.dataset.id;
              if (!to) return;
              setTasks((ts) => moveTasks(ts, [task.id], to, back ? "before" : "after"));
              const id = task.id;
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] [aria-pressed]`)?.focus(),
              );
            }}
            aria-pressed={open}
            title="Click to open and edit · Ctrl/⌘-click to pick several · Drag to move"
          >
            {task.title}
          </button>
        )}
        {/* Tasks start with no date or estimate; clicking a chip takes it off again. */}
        <span className={s.chips}>
          {upcoming(task, today) && <i className={s.nextChip}>Up next · {dueName(task.due!, today)}</i>}
          {doneToday(task, today) && <i className={s.nextChip}>Done for today</i>}
          {task.sub.length > 0 && (
            <button
              className={`${s.chip} ${s.fold}`}
              onClick={() => setFolded(!folded)}
              aria-expanded={!folded}
              aria-label={`${folded ? "Show" : "Hide"} ${task.sub.length} step${task.sub.length === 1 ? "" : "s"}`}
              title={folded ? "Show steps" : "Fold steps"}
            >
              <ChevronDown size={12} strokeWidth={3} aria-hidden />
              {task.sub.filter((x) => x.done).length}/{task.sub.length}
            </button>
          )}
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
          {task.history?.length ? (
            <span
              title={`${task.history.length} note${task.history.length === 1 ? "" : "s"}`}
            >
              <MessageSquare size={11} strokeWidth={2.75} aria-hidden />{" "}
              {task.history.length}
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

      {task.sub.length > 0 && !folded && (
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

// Deleting a list: a dialog first, since it can't be undone. Goals linked to it are ticked to go too (untick to keep
// them, no longer linked to a list).
function DeleteList({
  name,
  tasks,
  goals,
  onCancel,
  onDelete,
}: {
  name: string;
  tasks: number;
  goals: string[];
  onCancel: () => void;
  onDelete: (goalsToo: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [goalsToo, setGoalsToo] = useState(true);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  const one = goals.length === 1;
  return (
    <dialog ref={ref} className={s.disclosure} data-danger onClose={onCancel} aria-labelledby="del-list-h">
      <h2 id="del-list-h" className="display">
        Delete “{name}”?
      </h2>
      <p className={s.delNote}>
        {tasks ? `Its ${tasks === 1 ? "task goes" : `${tasks} tasks go`} with it, for good. This can't be undone.` : "This can't be undone."}
      </p>
      {goals.length > 0 && (
        <>
          <p className={s.delNote}>
            {one ? "A goal is linked to this list:" : `${goals.length} goals are linked to this list:`}
          </p>
          <ul className={s.delGoals}>
            {goals.map((g, i) => (
              <li key={i}>
                <Target size={15} strokeWidth={2.5} aria-hidden /> {g}
              </li>
            ))}
          </ul>
          <label className={s.delCheck}>
            <input type="checkbox" checked={goalsToo} onChange={(e) => setGoalsToo(e.target.checked)} />
            <span>Delete {one ? "this goal" : "these goals"} too</span>
          </label>
        </>
      )}
      <div className={s.tools}>
        <button
          className="btn"
          style={{ "--fill": "#fff8ef" } as React.CSSProperties}
          onClick={() => ref.current?.close()}
          autoFocus
        >
          Cancel
        </button>
        <button
          className="btn"
          style={{ "--fill": "var(--hot)" } as React.CSSProperties}
          onClick={() => onDelete(goalsToo)}
        >
          <Trash2 size={16} strokeWidth={2.5} aria-hidden /> Delete list
        </button>
      </div>
    </dialog>
  );
}
