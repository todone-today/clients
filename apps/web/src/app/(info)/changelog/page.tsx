import type { Metadata } from "next";
import s from "../../(legal)/legal.module.css";

export const metadata: Metadata = { title: "Changelog", description: "What's new in todone." };

// Newest first. Add an entry when something people notice ships; keep it in their words, not the code's.
const ENTRIES: { date: string; title: string; items: string[] }[] = [
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
