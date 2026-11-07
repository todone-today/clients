import type { Metadata } from "next";
import Link from "next/link";
import { REPO } from "@/lib/brand";
import s from "../../(legal)/legal.module.css";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "How todone works: lists, stickers, the calendar, teams and integrations.",
};

const SECTIONS = [
  ["start", "Getting started"],
  ["notes", "Lists and notes"],
  ["stickers", "Stickers: when, how long, priority, repeat"],
  ["board", "Moving things around"],
  ["calendar", "Calendar"],
  ["ideas", "Brainstorm"],
  ["ai", "Import with AI"],
  ["teams", "Teams"],
  ["goals", "Goals, XP and rewards"],
  ["sharing", "Sharing one task"],
  ["integrations", "Integrations"],
  ["reminders", "Reminders, offline and devices"],
  ["account", "Your account and data"],
  ["keys", "Keyboard"],
] as const;

export default function Docs() {
  return (
    <>
      <h1 className="display">Guide</h1>
      <p className={s.lead}>
        Everything todone does, in one page. Want to try it first? The{" "}
        <Link href="/demo">demo</Link> has sample lists and needs no account.
      </p>
      <nav aria-label="On this page">
        <ul>
          {SECTIONS.map(([id, name]) => (
            <li key={id}>
              <a href={`#${id}`}>{name}</a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="start">Getting started</h2>
      <p>
        <Link href="/login">Make an account</Link> with your email (or GitHub,
        where it&apos;s offered). Your first visit starts with two sample lists
        and a short tour; change or delete anything. Take the tour again any
        time with <b>Tour</b> at the top.
      </p>

      <h2 id="notes">Lists and notes</h2>
      <ul>
        <li>
          Each list is a board of sticky notes. Type a task in the box at the
          top and press Enter.
        </li>
        <li>
          Click a note to open its panel: rename it, set its day, time, length,
          priority and repeat, write a description (**bold**, _italic_, links,
          and &ldquo;- &rdquo; lists) and attach photos, videos or PDFs.
          Attachments are encrypted on your device like everything else.
        </li>
        <li>
          Tick the box to finish it. Finishing a task finishes its steps too;
          unticking leaves them as they were.
        </li>
        <li>
          Rename a list by clicking its name. The bin deletes it after a second
          click.
        </li>
        <li>
          Filter by Open, Done, Today, Late or No date, and sort by your own
          order, date, length or priority.
        </li>
      </ul>

      <h2 id="stickers">Stickers: when, how long, priority, repeat</h2>
      <p>
        The stickers beside the board set things by drag and drop: drag a note
        onto <b>Tomorrow</b> or <b>1 hr</b>, or a sticker onto a note.{" "}
        <b>Repeat</b> stickers (Daily, Weekdays, Weekends, Weekly, Monthly,
        Yearly) bring a task back: tick it off and the next one waits until its
        day. Ctrl/⌘-click notes to select several and set them all at once.
      </p>

      <h2 id="board">Moving things around</h2>
      <ul>
        <li>
          Drag a note onto another note&apos;s left or right edge to reorder;
          the others slide aside to show where it lands.
        </li>
        <li>
          Drop a note in the middle of another to make it a step of that task.
        </li>
        <li>
          Drag notes onto a list in the sidebar to move them there; drag lists
          up and down to reorder them.
        </li>
        <li>
          Drop notes in the <b>bin</b> to delete them (Undo brings them back).
          Drop the <b>Today</b> sticker in the bin to clear the day.
        </li>
      </ul>

      <h2 id="calendar">Calendar</h2>
      <p>
        Day, week, month or year, for every list or just one. Drag tasks from{" "}
        <b>To plan</b> onto a time, move them around, and stretch a block to set
        how long it takes. <b>Share</b> makes a private link to the view
        you&apos;re looking at (that day, week, month or year only); stop
        sharing it any time from Integrations.
      </p>

      <h2 id="ideas">Brainstorm</h2>
      <p>
        A board for loose ideas that aren&apos;t tasks yet. Double-click one to
        edit it, drag ideas next to each other to arrange them, and drag a good
        one onto a list to make it a task. Click the bin twice to clear them
        all.
      </p>

      <h2 id="ai">Import with AI</h2>
      <p>
        <b>Import with AI</b> in the sidebar gives you a prompt to paste into
        ChatGPT, Claude or any AI, followed by your plans. Paste the answer
        back: tasks land in the lists it names, added to lists you have and new
        ones made for the rest, with their dates, times and lengths. A Markdown
        file with <code>## List</code> headings imports the same way.
      </p>

      <h2 id="teams">Teams</h2>
      <p>
        Pick <b>+ New team…</b> in the workspace menu. In <b>Team settings</b>,
        rename the team by clicking its name, invite people by email (send them
        the invite link) and set them as members or admins. Everyone in a team
        sees and edits its lists. The owner can delete the team; anyone else can
        leave it.
      </p>

      <h2 id="goals">Goals, XP and rewards</h2>
      <ul>
        <li>
          Goals (top bar) are what your tasks add up to. &ldquo;New goal&rdquo;
          asks what you want, why it matters, what could get in the way and what
          you&apos;ll do then, and lets you add the first steps. Only the first
          step is needed.
        </li>
        <li>
          A goal can belong to a list, and a list can have several: a
          &ldquo;Gym&rdquo; list might hold &ldquo;weigh 68 kg&rdquo;,
          &ldquo;gym 5× a week&rdquo; and &ldquo;140 g protein a day&rdquo;.
          They show as sticky notes at the top of the list, where you log
          progress in a tap.
        </li>
        <li>
          Four kinds: <b>reach a number</b> (log where you are, it shows how
          far you&apos;ve come), <b>show up</b> (check in, or tick its tasks;
          it counts the week, and a quiet week resets nothing), <b>a daily
          amount</b> (add to it through the day; it counts the days you hit it)
          and <b>get somewhere</b> (milestones: the tasks you link to it from
          their panel).
        </li>
        <li>
          Logging earns 3 XP the first time each goal each day, and 10 more
          when a daily amount is reached.
        </li>
        <li>
          Finishing a task earns XP: 5, plus a point per 5 minutes estimated (up
          to 4 hours), 6 for high or 3 for medium priority, 4 for on time, 2 a
          step (up to 10) and 5 toward a goal. Unticking takes it back.
        </li>
        <li>
          Rewards: set your own (&ldquo;cheat meal · 150&rdquo;) and claim them
          with your XP. In a team, XP is per person.
        </li>
      </ul>

      <h2 id="sharing">Sharing one task</h2>
      <ul>
        <li>
          In a task&apos;s panel, &ldquo;Share this task&rdquo; makes a link
          anyone can open, no account needed. They can read the task, comment,
          reply and add photos, videos or PDFs. They show up by the name they
          type, or as &ldquo;Anonymous&rdquo; if they leave it blank.
        </li>
        <li>
          A shared task is <b>not end-to-end encrypted</b>: our server and
          anyone with the link can read it, its comments and its files. todone
          asks before turning that on. The rest of your lists stay encrypted.
        </li>
        <li>
          &ldquo;New link&rdquo; stops the old link working; send the new one to
          whoever should still have it.
        </li>
        <li>
          &ldquo;Stop sharing&rdquo; kills the link at once and deletes the
          shared copy from our server. The conversation and its files go back
          into your task, encrypted.
        </li>
        <li>
          Limits: photos and documents up to 10 MB, videos up to 50 MB, 200 MB
          per shared task.
        </li>
      </ul>

      <h2 id="integrations">Integrations</h2>
      <p>
        Each workspace has its own, under <b>Integrations</b>:
      </p>
      <ul>
        <li>
          <b>Google Calendar</b>, <b>Apple Calendar</b> and <b>Outlook</b>:
          make your private calendar link, then &ldquo;Add to&rdquo; your
          calendar in one click. It&apos;s one way: dated tasks show up as
          events, and edits in the calendar don&apos;t come back. Each calendar
          fetches the link on its own schedule (Google can take up to a day).
        </li>
        <li>
          The link can only hold lists our server can read: switch encryption
          off for the lists you want in it, under Integrations.
        </li>
      </ul>
      <p>
        We&apos;re keeping it to these three until they&apos;re rock solid; more
        integrations will follow.
      </p>

      <h2 id="reminders">Reminders, offline and devices</h2>
      <ul>
        <li>
          The bell (top bar) shows new comments on shared tasks and what&apos;s
          due today. Switch on reminders there, on each device, to get a nudge
          15 minutes before a task&apos;s time and a summary at 8 a.m., even with
          todone closed. While todone is open it plans the next 7 days and
          seals each reminder for your browsers; the server only holds the
          sealed copies and a send time. Changes show up in them the next time
          todone is open on any of your devices.
        </li>
        <li>
          todone works offline: it opens showing your lists as last saved, and
          saves your changes once you&apos;re back.
        </li>
        <li>
          Open tabs pick up changes from your other devices and teammates within
          about 20 seconds.
        </li>
      </ul>

      <h2 id="account">Your account and data</h2>
      <p>
        <b>Account</b> at the top: change your name, export everything as JSON
        or CSV, sign out, or delete your account. Found a bug or have an idea?{" "}
        <b>Send feedback</b> in the sidebar. See the{" "}
        <Link href="/privacy">Privacy Policy</Link> for what we keep and why.
      </p>

      <h2 id="keys">Keyboard</h2>
      <ul>
        <li>Enter adds a task or saves a name; Esc cancels an edit.</li>
        <li>
          Ctrl/⌘-click selects several notes or ideas; Esc clears the selection.
        </li>
        <li>In the tour, ← and → move between steps.</li>
      </ul>

      <p>
        todone is open source: <a href={REPO}>github.com/todone-today</a>.
        Self-hosting and development are covered in{" "}
        <a href={`${REPO}/contributing-docs`}>contributing-docs</a>.
      </p>
    </>
  );
}
