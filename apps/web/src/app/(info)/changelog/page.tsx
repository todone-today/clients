import type { Metadata } from "next";
import s from "../../(legal)/legal.module.css";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in todone.",
};

// Newest first. Add an entry when something people notice ships; keep it in their words, not the code's.
const ENTRIES: { date: string; title: string; items: string[] }[] = [
  {
    date: "10 November 2026",
    title: "Focus mode",
    items: [
      "Open a task and press Focus: just that task, full screen, with a clock (and a soft tick-tock you can turn off).",
      "Space pauses, Enter finishes, Esc steps out. Either way the minutes go on the task (⏳ on its card).",
      "Tick its steps as you go. If it has a length, you see what's left; going over is fine.",
    ],
  },
  {
    date: "10 November 2026",
    title: "Fold steps, see your password",
    items: [
      "Fold a task's steps away with the chip on its card (it shows how many are done); this device remembers.",
      "An eye on password fields shows what you typed, at sign-in, sign-up, reset and unlock.",
      "The tour now covers goals, rewards, effort and reminders, and new accounts start with tasks that try them.",
      "Clear done has a broom, and comments on tasks you've shared arrive as notifications.",
    ],
  },
  {
    date: "9 November 2026",
    title: "Effort",
    items: [
      "Give a task an effort, XS to XL: how hard it is, apart from how long it takes. Drop an Effort sticker on it or set it in its panel. Bigger efforts earn more XP: +3 for S up to +15 for XL.",
    ],
  },
  {
    date: "9 November 2026",
    title: "Goals that live in your lists",
    items: [
      "A list can have its own goals, shown as sticky notes at its top: \"weigh 68 kg\", \"gym 5× a week\", \"140 g protein a day\". Log progress right there.",
      "Two new kinds of goal: reach a number, and a daily amount. Habits get a one-tap check-in. Logging earns a little XP.",
      "Rewards, rethought: what you can claim now, what you're saving for and how many tasks away it is, with help pricing a new one.",
    ],
  },
  {
    date: "8 November 2026",
    title: "Reminders with todone closed, still end-to-end encrypted",
    items: [
      "A bell in the top bar: new comments on shared tasks, what's due today, and one switch for this device's reminders. The browser asks for permission only when you flip it, or click \"Remind me\" on a task with a time.",
      "Reminders now arrive with todone closed. todone seals each one on your device for your browsers, so our server keeps only unreadable copies and the time to send them.",
    ],
  },
  {
    date: "8 November 2026",
    title: "Goals, XP and rewards",
    items: [
      "Goals: say what you want and why, what could get in the way and what you'll do then. Outcome goals track their milestones (linked tasks); habits count the weeks you showed up, and a quiet week never resets anything.",
      "Finishing a task earns XP: more for longer, higher-priority and on-time tasks, tasks with steps, and tasks toward a goal. Spend it on rewards you set yourself, like a cheat meal.",
      "Link a task to a goal from its panel. Goals, rewards and XP are end-to-end encrypted like your lists; in a team, each person has their own XP.",
    ],
  },
  {
    date: "8 November 2026",
    title: "A page for every task, and sharing one",
    items: [
      "Click a task to open it: every detail in one place, a description with **bold**, _italic_, links and lists, and attachments (photos, videos, PDFs), encrypted on your device before upload.",
      "Share a single task by link with anyone, no account needed. They can read it, comment, reply and add photos or videos; you see it all in the task.",
      "Sharing turns off end-to-end encryption for that one task, and todone says so before you agree. Make a new link to cut off the old one, or stop sharing: the link dies at once and the conversation stays in your task, encrypted again.",
    ],
  },
  {
    date: "8 November 2026",
    title: "A bin you can dig through",
    items: [
      "Deleted tasks wait in the bin for 7 days: open “Recently deleted” under the Bin and restore any of them to its list.",
      "Custom day and length are stickers like the rest; what you pick stays on the sticker for a moment so you can drag it onto other tasks.",
    ],
  },
  {
    date: "6 November 2026",
    title: "End-to-end encrypted",
    items: [
      "Your lists, tasks, steps and ideas are encrypted on your device before they're saved. Our servers only hold scrambled data; we can't read it.",
      "Your password never leaves your browser. Sign-up gives you a recovery key: it's the only way back in if you forget your password, so keep it safe. See it again under Account.",
      "Already have an account? Sign in once as usual and your lists are encrypted for you; you'll get your recovery key then.",
      "Teams share a key only members hold. A teammate confirms each new member, with a fingerprint to check.",
      "Integrations, the calendar feed and shared links only see lists you switch off encryption for, under a list's name.",
      "Reminders now come from todone itself while a tab is open, since the server can't see what's due.",
      "Sign in with email and password; GitHub sign-in is gone (Google Calendar still connects).",
    ],
  },
  {
    date: "6 November 2026",
    title: "Your account, safer",
    items: [
      "New accounts confirm their email with a link; unconfirmed accounts are deleted after 7 days, and a banner says when.",
      "Forgot your password? Reset it from the sign-in page. Or change it on your Account page.",
      "Profile pictures from Gravatar, for you and your teammates.",
      "Sign-in and sign-up slow down after too many tries, and the site sends stricter security headers.",
    ],
  },
  {
    date: "6 November 2026",
    title: "A homepage you can play with",
    items: [
      "New tagline: Todos. Done right.",
      "Every section of the homepage works: tick steps, drag the week around, go offline and back, connect tools, switch billing.",
      "The roadmap: the web app now, Android and iPhone next, then hardware for your desk, fridge and bag.",
      "Goals you can help unlock, in rupees, funded by Plus, Team and Founding members.",
      "Plans and prices, with checkout through Razorpay opening soon.",
    ],
  },
  {
    date: "5 November 2026",
    title: "todone.today",
    items: [
      "todone has its own address: todone.today.",
      "Try it without an account at todone.today/demo.",
      "This guide, a changelog and a status page.",
      "Team settings: rename a team by clicking its name; deleting a team asks once more and says what goes.",
      "New team moved into the workspace menu.",
      "Import with AI fills several lists at once, adding to lists you have and making new ones.",
      "Brainstorm: drag ideas next to each other, with the same jiggle and sliding slot as the board; click the bin twice to clear them all.",
      "The bin makes a little crumple-and-thud when something goes in.",
    ],
  },
  {
    date: "3 November 2026",
    title: "One app, built to grow",
    items: [
      "Finishing a task finishes its steps too.",
      "The terminal app is retired; todone is the web app now.",
      "Behind the scenes: a separate server and shared code, ready for more apps later.",
    ],
  },
  {
    date: "2 November 2026",
    title: "Policies and polish",
    items: [
      "Privacy Policy, Terms, Cookie, Refund & Cancellation and Acceptable Use pages; sign-up asks you to confirm you're 18 or older.",
      "Dragging a note: the others jiggle and glide aside to show where it'll land.",
      "Wide screens use their full width.",
      "The top bar uses words: Tour, Day / Night, Account.",
    ],
  },
  {
    date: "1 November 2026",
    title: "Account, offline and sync",
    items: [
      "Account page: export everything as JSON or CSV, or delete your account.",
      "Works offline: opens with your lists as last saved and saves changes once you're back.",
      "Open tabs pick up changes from your other devices within about 20 seconds.",
      "Send feedback from the sidebar.",
      "Repeating tasks wait for their day instead of reappearing straight away.",
      "Task editor inside the note, app-styled menus everywhere, team members as cards.",
      "Brainstorm: select several ideas and move them together; a bin with undo.",
    ],
  },
  {
    date: "31 October 2026",
    title: "Accounts, teams and the calendar",
    items: [
      "Accounts and teams, with your lists stored safely online.",
      "Sticky-note board with stickers for when, how long, priority and repeats.",
      "Day, week, month and year calendar: drag to plan, stretch to set how long; share a view by link.",
      "Brainstorm for loose ideas; Import with AI.",
      "Google Calendar, Notion, Obsidian, Discord and a calendar feed.",
      "Push reminders, even with todone closed.",
      "A guided tour with sample lists for new accounts; a phone layout.",
    ],
  },
  {
    date: "30 October 2026",
    title: "The web app",
    items: ["todone on the web: lists and tasks in the browser."],
  },
];

export default function Changelog() {
  return (
    <>
      <h1 className="display">Changelog</h1>
      <p className={s.lead}>What&apos;s new in todone, newest first.</p>
      {ENTRIES.map((e) => (
        <section key={e.date}>
          <h2>
            {e.title} <span className={s.date}>· {e.date}</span>
          </h2>
          <ul>
            {e.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
