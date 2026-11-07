import type { Metadata } from "next";
import s from "../../(legal)/legal.module.css";

export const metadata: Metadata = { title: "Changelog", description: "What's new in todone." };

// Newest first. Add an entry when something people notice ships; keep it in their words, not the code's.
const ENTRIES: { date: string; title: string; items: string[] }[] = [
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
