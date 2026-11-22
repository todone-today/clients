"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Welcome, skipWelcome } from "@/components/Welcome";
import { setTour, tourDue } from "@/lib/onboard";
import { Intro } from "./Intro";
import { Training } from "./Training";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Target,
  ListChecks,
  CalendarDays,
  Ellipsis,
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
  CheckCheck,
  SquareCheckBig,
  X,
  LayoutGrid,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Confetti } from "@/components/Confetti";
import { Avatar } from "@/components/Avatar";
import { authClient } from "@/lib/auth-client";
import { Select } from "@/components/Select";
import { ALL, SORTS, type Sort, type View, board } from "@/lib/board";
import { Views } from "./Views";
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
import { Goals, ListGoals, Moments, OPEN_GOAL, Rewards, XpTile } from "./Goals";
import { NotificationBell } from "./Bell";
import { changeGoals, useGoalItems } from "./goalStore";
import { api } from "@/lib/api";
import { fold, reconcile, type Goal, type GoalItem } from "@todone/sdk/goals";
import { GOAL_PRESET, type GoalPreset, joinGoal, linksChanged, shareFor, takeInvite, useGoalLinks } from "./goalLinks";
import { IconPick, ListIcon, NOTES, listColor, noteColor } from "./listIcon";
import { useUnread } from "./unread";
import { useFolded } from "./folded";
import { Account } from "./Account";
import { Diamond, PlanPrompt, needsPlan, usePlan } from "./PlanPrompt";
import { InstallSheet } from "./InstallSheet";
import { PullRefresh } from "./PullRefresh";
import { useSwipeNav } from "./swipeDrawer";
import { Search } from "./Search";
import { usage } from "@/lib/usage";
import { fileFeedback } from "./feedback-inbox";
import { openPlans } from "./checkout";
import { AiImport } from "./AiImport";
import { AllLists } from "./AllLists";
import { AskBar } from "./AskBar";
import { Brainstorm, ideaToTask } from "./Brainstorm";
import { CalendarView } from "./CalendarView";
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

// The four views in the tab bar's order (Lists is no panel), for swiping between them on a phone.
const VIEWS = [null, "calendar", "goals", "rewards"] as const satisfies readonly Panel[];

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
  // Wider screens: how far down the window the sidebar starts (below the top bar and any banner, until they scroll
  // away and it sticks at the top), for its height.
  const shellRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf = 0;
    const cut = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = sideRef.current?.getBoundingClientRect().top ?? 0;
        shellRef.current?.style.setProperty("--top-cut", `${Math.max(0, Math.round(b))}px`);
      });
    };
    cut();
    addEventListener("scroll", cut, { passive: true });
    addEventListener("resize", cut);
    // Also when something above it comes or goes (a banner, a notice), moving where it starts.
    const ro = new ResizeObserver(cut);
    if (shellRef.current) ro.observe(shellRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("scroll", cut);
      removeEventListener("resize", cut);
    };
  }, []);
  // Phones: swipe sideways between the views, as the tab bar orders them (and from the edge for the lists).
  const mainRef = useRef<HTMLElement>(null);
  useSwipeNav({ open: drawer, setOpen: setDrawer, views: VIEWS, view: panel, go: show, main: mainRef });
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

  // Goals shared by link (or challenges joined): their public copies follow progress (goalLinks.ts).
  const linkTasks = useMemo(() => (lists ? lists.filter((l) => !l.kind).flatMap((l) => l.tasks) : null), [lists]);
  const linkItems = useMemo(
    () => (lists?.find((l) => l.kind === "goals")?.tasks ?? []) as unknown as GoalItem[],
    [lists],
  );
  useGoalLinks(linkTasks, linkItems, !demo && vault === "open" && !!userId);
  // "Go to it" on a list's goal: Goals opens on it, scrolled into view and flashed.
  useEffect(() => {
    const go = (e: Event) => {
      setPanel("goals");
      setTimeout(() => {
        const el = document.getElementById(`goal-${(e as CustomEvent<string>).detail}`);
        el?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        el?.animate?.([{ outline: "4px solid var(--black)", outlineOffset: "4px" }, { outline: "4px solid transparent", outlineOffset: "4px" }], { duration: 1400 });
      }, 350);
    };
    addEventListener(OPEN_GOAL, go);
    return () => removeEventListener(OPEN_GOAL, go);
  }, []);
  // Arrived from a shared goal (/g/…): copy it into a new goal, or join the challenge with one, then show Goals.
  const invited = useRef(false);
  useEffect(() => {
    if (demo || vault !== "open" || !userId || !lists || invited.current) return;
    invited.current = true;
    const inv = takeInvite();
    if (!inv) return;
    (async () => {
      const g = await api<{ owner: { name: string }; snapshot: Partial<Goal> & { title: string; kind: Goal["kind"] } }>(
        "GET",
        `/g/${encodeURIComponent(inv.slug)}`,
      ).catch(() => null);
      setPanel("goals");
      const tell = (d: GoalPreset) =>
        setTimeout(() => dispatchEvent(new CustomEvent<GoalPreset>(GOAL_PRESET, { detail: d })), 300);
      if (!g) return tell({ note: "That shared goal isn't there any more." });
      const s = g.snapshot;
      // Their own copy: the goal and how it's measured (where they start is theirs to say).
      const preset: Partial<Goal> = { title: s.title, kind: s.kind, unit: s.unit, target: s.target, perWeek: s.perWeek, by: s.by };
      if (inv.what === "clone") return usage({ name: "goal_link_used", what: "clone", ok: true }), tell({ preset });
      const id = uid() + uid();
      try {
        await joinGoal(inv.slug, id);
        changeGoals(lists, (xs) => [...xs, { ...preset, t: "goal", id, created: Date.now() } as Goal]);
        linksChanged();
        usage({ name: "goal_link_used", what: "join", ok: true });
        tell({ note: `You joined ${g.owner.name}'s challenge: “${s.title}”. Your progress shows on the challenge page.` });
      } catch (x) {
        // Full, or no longer a challenge: they can still do it on their own.
        usage({ name: "goal_link_used", what: "join", ok: false });
        tell({ preset, note: x instanceof Error ? x.message : undefined });
      }
    })();
  }, [demo, vault, userId, lists]);
  // XP: whenever lists change, finished tasks earn a win in the goals list and unticked ones lose it. One place,
  // so it covers every way a task gets ticked (card, panel, calendar). Idempotent: an unchanged log isn't saved.
  useEffect(() => {
    if (!lists || vault !== "open") return;
    const tasks = lists.filter((l) => !l.kind).flatMap((l) => l.tasks);
    const goals = lists.find((l) => l.kind === "goals");
    const items = (goals?.tasks ?? []) as unknown as Parameters<
      typeof reconcile
    >[0];
    if (reconcile(items, tasks, todayISO(), userId, shareFor) === items) return;
    changeGoals(lists, (xs) =>
      fold(reconcile(xs, tasks, todayISO(), userId, shareFor), () => uid() + uid()),
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
  // The training again, from the i in the top bar (or the menu on a phone).
  const steps = () => {
    setDrawer(false);
    setPanel(null);
    setTouring(true);
    if (userId) setTour(userId, true); // a reload mid-training picks it up again
  };
  const endTour = () => {
    setTouring(false);
    if (userId) setTour(userId, false);
  };
  return (
    <div className={s.shell} data-slim={folded || undefined} ref={shellRef}>
      <Welcome />
      <PlanPrompt />
      {!demo && !intro && !touring && <InstallSheet />}
      {!demo && vault === "open" && <Moments />}
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
      {touring && lists && <Training who={userId} lists={lists} onEnd={endTour} />}
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
        ref={sideRef}
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
            trigger={!askAi}
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
        </div>
      </aside>

      {/* Phones: the sidebar is a drawer, so while a task or idea is held, its drop targets come up from the bottom:
          the other lists (move it there) and, for a task, Brainstorm. The same targets as the sidebar's. */}
      {lists && (
        <div className={s.dropDock} aria-hidden>
          <p>Move to</p>
          <ul>
            {sorted.map((l) => (
              <li key={l.id} data-current={(!panel && l.id === list?.id) || undefined}>
                <span
                  className={s.dockList}
                  style={{ "--list": listColor(l.id) } as React.CSSProperties}
                  {...dropOnList(l.id)}
                  data-tip={l.name}
                >
                  <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
                </span>
              </li>
            ))}
            <li data-ideas>
              <span className={s.dockList} {...dropOnList("ideas")} data-tip="Brainstorm">
                <Lightbulb size={15} strokeWidth={2.5} aria-hidden /> Brainstorm
              </span>
            </li>
          </ul>
        </div>
      )}
      <main className={s.main} ref={mainRef}>
        {panel === "calendar" ? (
          lists && (
            <>
              <CalendarView
                lists={lists.filter((l) => !l.kind)}
                update={update}
                onOpen={open}
                share={demo ? undefined : shareCalendar}
              />
              {/* The bar: a task for today, into the list last open; or ask todone to plan the week. */}
              {list && (
                <AskBar
                  place="calendar"
                  ai={askAi}
                  onAdd={(title) =>
                    update(list.id, (l) => ({
                      ...l,
                      tasks: [{ id: uid(), title, done: false, created: Date.now(), sub: [], due: todayISO() }, ...l.tasks],
                    }))
                  }
                />
              )}
            </>
          )
        ) : panel === "goals" ? (
          lists && <Goals onOpen={open} ai={askAi} />
        ) : panel === "rewards" ? (
          lists && <Rewards ai={askAi} />
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
            ai={askAi}
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
      data-tour="newlist"
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
  // A lock; a click opens one on/off switch for encryption.
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
        aria-label={plain ? "Not encrypted" : "Encrypted"}
        onClick={() => setOpen(!open)}
        data-tip={open ? undefined : plain ? "Not encrypted: integrations can read this list" : "Encrypted: only you can read this list"}
      >
        {plain ? <LockOpen size={18} strokeWidth={2.5} aria-hidden /> : <Lock size={18} strokeWidth={2.5} aria-hidden />}
      </button>
      {open && (
        // One switch: encrypted, on or off. Off means our server can read the list (for integrations and calendar
        // links); it can be switched back any time.
        <div className={s.privacyCard} role="dialog" aria-label="Encryption">
          <button
            role="switch"
            aria-checked={!plain}
            className={s.privacySwitch}
            onClick={() => update(list.id, (l) => ({ ...l, plain: !plain }))}
          >
            {plain ? <LockOpen size={16} strokeWidth={2.5} aria-hidden /> : <Lock size={16} strokeWidth={2.5} aria-hidden />}
            <b>Encrypted</b>
            <span className={s.switchTrack} aria-hidden>
              <i />
            </span>
          </button>
          {plain && <small>Off: integrations can read this list.</small>}
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
  ai,
}: {
  list: List;
  lists: { id: string; name: string }[];
  update: Update;
  focus?: { id: string } | null;
  ai: boolean; // Ask todone is on: its bar sits under the tasks
}) {
  // A list opened: what it has is "known" (no pop), however long ago it was made.
  useState(() => {
    known.clear();
    for (const t of list.tasks) for (const x of [t, ...t.sub]) known.add(x.id);
  });
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
  const [show, setShow] = useState<View>(ALL); // the view the board shows (Views.tsx)
  const DONE: View = { ...ALL, id: "done", name: "Done", status: "done" };
  // The sticker panel (wider screens): tucked away unless pinned, sliding in while a task is picked or held. A pin
  // lasts while you're on this list: it folds again on a refresh or another list.
  const [pinned, setPinned] = useState(false);
  const [pinnedOn, setPinnedOn] = useState(list.id);
  if (pinnedOn !== list.id) {
    setPinnedOn(list.id);
    setPinned(false);
  }
  const pin = (on: boolean) => setPinned(on);
  const [sort, setSort] = useState<Sort>("mine");
  const [picked, setPicked] = useState<Set<string>>(new Set()); // Ctrl/Cmd-click selection
  // Select mode (the Select button; phones have no Ctrl key and a long press drags): every tap picks.
  const [selecting, setSelecting] = useState(false);
  const selectMode = selecting || picked.size > 0;
  const endPick = () => {
    setPicked(new Set());
    setSelecting(false);
  };
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
  const pick = (id: string) => {
    navigator.vibrate?.(8); // a tick of feel on phones, as the Android app gives
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  };
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
    // Over the board's space a held note lands in the open slot; only a step dropped there becomes a task of its own.
    say: (p, arg) =>
      arg === "gap" || (arg === "unnest" && gap)
        ? "Move here"
        : arg === "unnest"
          ? p.kind === "task" && p.ids.every(isTop)
            ? "Leave it here"
            : "Make it a task of its own"
          : undefined,
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
        endPick();
      }
      aim.current = null;
    },
  });
  // Deletes tasks (to the bin for 7 days) with an undo bar, and ends any selection.
  const remove = (ids: string[]) => {
    const before = list.tasks;
    const gone = flatten(before).filter((t) => ids.includes(t.id));
    if (!gone.length) return;
    setTasks((ts) => ids.reduce((acc, id) => mapTask(acc, id, () => null), ts));
    binSound();
    setBinned({
      before,
      ids: bin(gone),
      text: gone.length > 1 ? `Deleted ${gone.length} tasks.` : `Deleted “${gone[0]?.title}”.`,
    });
    endPick();
  };
  // The bin takes tasks, or a date sticker: then every task due that day goes. Either way, undo puts the list back.
  const binDrop = useDrop(`bin-${list.id}`, {
    accept: (p) =>
      (p.kind === "task" && p.listId === list.id) ||
      (p.kind === "sticker" && !!sticker(p.key, today)?.due),
    drop: (p) => {
      const before = list.tasks;
      if (p.kind === "task") remove(p.ids);
      else if (p.kind === "sticker") {
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
      e.key === "Escape" && endPick();
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
  // New tasks go first. Colours come from ids and avoid the two notes before them, so the new note gets an id whose
  // colour differs from the top two: then no note below it changes colour.
  const addTask = (title: string) => {
    const near = new Set(list.tasks.slice(0, 2).map((x) => colors.get(x.id)));
    let id = uid();
    for (let i = 0; i < 30 && near.has(NOTES[noteColor(id)]); i++) id = uid();
    setTasks((ts) => [{ id, title, done: false, created: Date.now(), sub: [] }, ...ts]);
    usage({ name: "task_created", via: "typed" });
  };
  const row = {
    listId: list.id,
    today,
    nowMin,
    setTasks,
    selected,
    onSelect: setSelected,
    picked,
    onPick: pick,
    onRemove: remove,
    selecting: selectMode,
    drop,
    colors,
    lists,
  };

  return (
    <>
      <div className={s.listHead}>
        {/* First row: the list's icon, its lock and its name. Click the name to rename; Enter or clicking away saves,
            Esc cancels. */}
        <div className={s.nameRow} style={{ "--list": listColor(list.id) } as React.CSSProperties}>
          <IconPick
            id={list.id}
            name={list.name}
            icon={list.icon}
            onPick={(icon) => update(list.id, (l) => ({ ...l, icon }))}
          />
          <Privacy list={list} update={update} />
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
        </div>
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
          {/* Second row: the list's goals. */}
          <ListGoals list={list} />
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
      {selectMode && (
        // Pinned to the top while selecting (on a phone the sticker sheet has the bottom): what's picked, and what
        // to do with it.
        <div className={s.pickBar} role="toolbar" aria-label="Selected tasks">
          <p role="status">
            {picked.size ? (
              <>
                <b>{picked.size} selected.</b>{" "}
                <span className={s.pickHint}>Tap a sticker, or drag them onto the bin or another list.</span>
              </>
            ) : (
              "Tap tasks to select them."
            )}
          </p>
          <div className={s.pickActions}>
            <button
              className={s.ghost}
              onClick={() =>
                setPicked(new Set(board(list.tasks, show, sort, today, nowMin).map((t) => t.id)))
              }
            >
              <CheckCheck size={16} strokeWidth={2.5} aria-hidden /> All
            </button>
            {picked.size > 0 && (
              <>
                <button
                  className={s.ghost}
                  onClick={() => {
                    const open = [...picked].filter((id) => !findTask(list.tasks, id)?.done);
                    open.forEach(() => usage({ name: "task_done" }));
                    setTasks((ts) => open.reduce((acc, id) => tick(acc, id, today, me), ts));
                    navigator.vibrate?.(12);
                    endPick();
                  }}
                >
                  <Check size={16} strokeWidth={3} aria-hidden /> Done
                </button>
                <button className={s.ghost} onClick={() => remove([...picked])}>
                  <Trash2 size={16} strokeWidth={2.5} aria-hidden /> Delete
                </button>
              </>
            )}
            <button className={s.ghost} onClick={endPick} aria-label="Stop selecting">
              <X size={16} strokeWidth={3} aria-hidden /> <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}
      <div className={s.listBody} data-stickers={pinned ? "pinned" : "auto"}>
        <div>

          {list.tasks.length > 0 && (
            <div className={s.boardBar} data-tour="filters">
              <Views view={show} onView={setShow} tasks={list.tasks} today={today} nowMin={nowMin} />
              {show.status === "done" && list.tasks.some((t) => t.done) && (
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
                {list.tasks.length > 0 && !selectMode && (
                  <button className={s.selectBtn} onClick={() => setSelecting(true)} data-tip="Select tasks (or Ctrl/Cmd-click them)">
                    <SquareCheckBig size={15} strokeWidth={2.5} aria-hidden /> Select
                  </button>
                )}
                <Select
                  className={s.sortPick}
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
              {show.status === "open" && list.tasks.some((t) => waiting(t, today) && !upcoming(t, today)) && (
                <li className={s.noMatch}>
                  {(() => {
                    const n = list.tasks.filter((t) => waiting(t, today) && !upcoming(t, today)).length;
                    return `${n} repeating task${n === 1 ? " comes" : "s come"} back on ${n === 1 ? "its" : "their"} day. `;
                  })()}
                  <button className={s.link} onClick={() => setShow(ALL)}>
                    Show
                  </button>
                </li>
              )}
              {!board(list.tasks, show, sort, today, nowMin).length &&
                !list.tasks.some((t) => waiting(t, today)) &&
                (show.status !== "done" && c.all > 0 && c.done === c.all ? (
                  // Everything on the list is ticked: say so, properly, instead of "nothing here".
                  <li className={s.listDone} role="status">
                    <Confetti />
                    <p className="display">All done.</p>
                    <p>
                      Every task on {list.name} is ticked. Add the next one in the bar below, or{" "}
                      <button className={s.link} onClick={() => setShow(DONE)}>
                        look back at what you did
                      </button>
                      .
                    </p>
                  </li>
                ) : (
                  <li className={s.noMatch}>
                    No tasks here.{" "}
                    <button className={s.link} onClick={() => setShow(ALL)}>
                      Show all
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <div className={s.empty}>
              <p className="display">Nothing here.</p>
              <p>Add the first task in the bar below. Enjoy the quiet while it lasts.</p>
            </div>
          )}
          {/* The bar, with the Bin just above its right end: where your hands already are. */}
          <div className={s.askDock}>
        {/* The bin: drop tasks (or a date sticker) to delete them, with undo; click it to delete the whole list (asks first). */}
            <button
              className={s.bin}
              data-tour="bin"
              data-bin
              {...binDrop("bin")}
              onClick={() => setAsking(true)}
              aria-label="Delete list, or drop tasks here to delete them"
              data-tip="Bin: drop tasks here, or click to delete this list"
              data-tip-end
            >
              <Trash2 size={28} strokeWidth={2.5} />
              <span>Bin</span>
            </button>
            <AskBar place="list" ai={ai} onAdd={addTask} />
          </div>
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
  onRemove,
  selecting,
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
  onRemove: (ids: string[]) => void; // to the bin, with undo
  selecting: boolean; // select mode: a tap picks instead of ticking or opening
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
  const swipe = useSwipe(task.id, top && !selecting);
  const row = {
    listId,
    today,
    nowMin,
    setTasks,
    selected,
    onSelect,
    picked,
    onPick,
    onRemove,
    selecting,
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
      data-swiped={swipe.x ? "" : undefined}
      {...swipe.handlers}
      style={
        top
          ? ({ "--fill": colors.get(task.id), "--swipe": `${swipe.x}px` } as React.CSSProperties)
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
        // Ctrl/Cmd-click (or any tap in select mode) selects instead of ticking or opening.
        onClickCapture={(e) => {
          if (!selecting && !e.metaKey && !e.ctrlKey) return;
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
      {top && (
        // Swiped left (phones): the note's quick actions, sliding in from its right edge.
        <div className={s.swipeActions} data-swipe-actions aria-hidden={!swipe.x} inert={!swipe.x}>
          <button onClick={() => (swipe.close(), onSelect(task.id))}>
            <Ellipsis size={18} strokeWidth={2.75} aria-hidden /> More
          </button>
          <button
            data-act="today"
            onClick={() => (swipe.close(), edit((t) => ({ ...t, due: today })))}
          >
            <CalendarDays size={18} strokeWidth={2.5} aria-hidden /> Today
          </button>
          <button data-act="delete" onClick={() => (swipe.close(), onRemove([task.id]))}>
            <Trash2 size={18} strokeWidth={2.5} aria-hidden /> Delete
          </button>
        </div>
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

// Swipe a note left (touch) to show its actions, like a phone's mail app; swipe back, tap it, or open another to
// close. Only one note is open at a time. A long press still drags the note (lib/drag.ts gives way to a swipe).
const SWIPE_W = 168; // the actions' width
const SWIPE_EVENT = "todone:swipe";
function useSwipe(id: string, on: boolean) {
  const [x, setX] = useState(0);
  const from = useRef<{ x: number; y: number; base: number; dir?: "h" | "v" } | null>(null);
  const close = () => setX(0);
  useEffect(() => {
    const other = (e: Event) => (e as CustomEvent<string>).detail !== id && setX(0);
    addEventListener(SWIPE_EVENT, other);
    return () => removeEventListener(SWIPE_EVENT, other);
  }, [id]);
  useEffect(() => {
    if (!on) Promise.resolve().then(() => setX(0));
  }, [on]);
  const handlers = on
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType !== "touch") return;
          from.current = { x: e.clientX, y: e.clientY, base: x };
        },
        onPointerMove: (e: React.PointerEvent) => {
          const f = from.current;
          if (!f || document.body.classList.contains("is-dragging")) return;
          const dx = e.clientX - f.x;
          const dy = e.clientY - f.y;
          if (!f.dir && Math.hypot(dx, dy) > 10) f.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? "h" : "v";
          if (f.dir === "h") setX(Math.max(-SWIPE_W, Math.min(0, f.base + dx)));
        },
        onPointerUp: () => {
          const f = from.current;
          from.current = null;
          if (f?.dir !== "h") return;
          const open = x < -SWIPE_W / 2;
          setX(open ? -SWIPE_W : 0);
          if (open) {
            navigator.vibrate?.(8);
            dispatchEvent(new CustomEvent(SWIPE_EVENT, { detail: id }));
          }
          // The tap the browser sends at the end of a swipe isn't a tap on the note.
          const swallow = (c: MouseEvent) => (c.stopPropagation(), c.preventDefault());
          addEventListener("click", swallow, { capture: true, once: true });
          setTimeout(() => removeEventListener("click", swallow, { capture: true }), 0);
        },
        onPointerCancel: () => {
          from.current = null;
          setX((v) => (v < -SWIPE_W / 2 ? -SWIPE_W : 0));
        },
        // Open: a tap on the note (not its actions) closes it instead of opening the task.
        onClickCapture: (e: React.MouseEvent) => {
          if (!x || (e.target as HTMLElement).closest("[data-swipe-actions]")) return;
          e.preventDefault();
          e.stopPropagation();
          close();
        },
      }
    : {};
  return { x, close, handlers };
}
