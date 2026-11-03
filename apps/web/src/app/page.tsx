import { Logo } from "@/components/Logo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GithubMark } from "@/components/GithubMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LEGAL_DOCS, REPO } from "@/lib/brand";
import s from "./page.module.css";

const steps = [
  {
    n: 1,
    fill: "var(--lime)",
    title: "Catch it",
    line: "Type it, press enter. Dumping ten things at once? Keep typing, one per line.",
    proof: (
      <div className={s.capture}>
        <span>call the landlord about the heater</span>
        <i aria-hidden />
      </div>
    ),
  },
  {
    n: 2,
    fill: "var(--peri)",
    title: "Break it down",
    line: "Drop one note on another and it becomes a step. Steps tick off with their task.",
    proof: (
      <ul className={s.tree}>
        <li>Plan the trip</li>
        <li className={s.done}>Book flights</li>
        <li>Find a place to stay</li>
        <li>Pack</li>
      </ul>
    ),
  },
  {
    n: 3,
    fill: "var(--butter)",
    title: "Give it a day",
    line: "Drag a task onto a sticker, or a sticker onto a task: when, how long, how urgent, how often.",
    proof: (
      <div className={s.chips}>
        {["Today", "Tomorrow", "30 min", "High", "Weekly"].map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    ),
  },
  {
    n: 4,
    fill: "var(--pink)",
    title: "Plan the week",
    line: "Day, week, month or year. Drag tasks onto a time and stretch them to fit.",
    proof: (
      <div className={s.week} aria-hidden>
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
          <span key={d}>
            {d}
            {i % 2 === 0 && <i style={{ height: `${1.4 + i * 0.5}rem` }} />}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: 5,
    fill: "var(--cyan)",
    title: "Do it together",
    line: "Make a team, invite people, and share lists, a calendar and reminders.",
    proof: (
      <div className={s.faces} aria-hidden>
        {["A", "K", "M", "+"].map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    ),
  },
];

// What it connects to, as it is in the app's Integrations panel.
const works = [
  ["Google Calendar", "Two-way: dated tasks become events, and moved events move the task.", "var(--lime)"],
  ["Apple & Outlook calendars", "Subscribe to a private calendar feed of everything that's due.", "var(--butter)"],
  ["Notion", "Sync a list with a Notion database, both ways.", "var(--peri)"],
  [
    "Obsidian & Markdown",
    "Every list is Markdown with Obsidian Tasks fields. Pull it, edit it, push it back.",
    "var(--cyan)",
  ],
  ["Discord", "Post to a channel when tasks are added or done.", "var(--pink)"],
  ["Reminders", "Push notifications on this device when something's due, even with the app closed.", "var(--orange)"],
];

export default function Home() {
  return (
    <>
      <header className={s.nav}>
        <Link href="/" className={s.mark} aria-label="Home">
          <Logo size={30} />
        </Link>
        <nav className={s.links} aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#works">Integrations</a>
          <a href="#open">Open source</a>
        </nav>
        <div className={s.end}>
          <ThemeToggle />
          <Link href="/app" className="btn">
            Open the app
          </Link>
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.pitch}>
            <h1 className={`display ${s.h1}`}>
              <span>Lists</span>
              <span className={s.lime}>that actually</span>
              <span>get done.</span>
            </h1>
            <p className={s.lede}>
              Sticky notes you drag onto a day, a calendar you plan the week on, and teams to share it with. It works
              offline, and it&apos;s open source.
            </p>
            <div className={s.actions}>
              <Link href="/app" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
                Start a list <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
              <a className={s.more} href={REPO}>
                <GithubMark /> Source on GitHub
              </a>
            </div>
          </div>
          <ul className={s.board} aria-label="A list in todone: four sticky notes">
            {(
              [
                ["Write the launch post", "var(--butter)", ["Today", "2 hr"], false],
                ["Plan the trip", "var(--pink)", ["Fri"], false],
                ["Call the landlord", "var(--cyan)", ["High"], true],
                ["Stretch", "var(--lime)", ["Daily", "15 min"], false],
              ] as const
            ).map(([title, fill, chips, done]) => (
              <li key={title} className={s.note} style={{ "--fill": fill } as React.CSSProperties} data-done={done}>
                <span className={s.box} aria-hidden />
                <b>{title}</b>
                <span className={s.noteChips}>
                  {chips.map((c) => (
                    <i key={c}>{c}</i>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className={s.how}>
          <h2 className={`display ${s.h2}`}>
            Five moves.
            <br />
            <span className={s.lime}>Nothing else.</span>
          </h2>
          <ol className={s.steps}>
            {steps.map((st) => (
              <li key={st.n} className={s.step} style={{ "--fill": st.fill } as React.CSSProperties}>
                <span className={`display ${s.num}`} aria-hidden>
                  {st.n}
                </span>
                <div>
                  <h3 className={`display ${s.h3}`}>{st.title}</h3>
                  <p>{st.line}</p>
                </div>
                <div className={s.proof}>{st.proof}</div>
              </li>
            ))}
          </ol>
        </section>

        <section id="works" className={s.works}>
          <h2 className={`display ${s.h2}`}>
            Works with
            <br />
            <span className={s.lime}>what you use.</span>
          </h2>
          <ul className={s.tiles}>
            {works.map(([name, line, fill]) => (
              <li key={name} className="sticker" style={{ "--fill": fill } as React.CSSProperties}>
                <h3 className="display">{name}</h3>
                <p>{line}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="open" className={s.open}>
          <h2 className={`display ${s.h2}`}>
            Yours, <span className={s.lime}>all the way down.</span>
          </h2>
          <div className={s.deal}>
            <article className={`sticker ${s.term1}`} style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              <h3 className="display">Open source</h3>
              <p>Every part of todone is GPL-3.0. Read every line, change what you want.</p>
              <a href={REPO}>
                <GithubMark /> Source on GitHub
              </a>
            </article>
            <article className={`sticker ${s.term2}`} style={{ "--fill": "var(--peri)" } as React.CSSProperties}>
              <h3 className="display">Self-host it</h3>
              <p>Run the whole thing on your own server. Your lists never leave a machine you control.</p>
            </article>
            <article className={`sticker ${s.term3}`} style={{ "--fill": "var(--pink)" } as React.CSSProperties}>
              <h3 className="display">Or use our cloud</h3>
              <p>
                Sync across your devices without running a server. Free for everyday use; a paid plan only for unusually
                heavy use. Coming soon.
              </p>
            </article>
          </div>
        </section>

        <section className={s.close}>
          <p className={`display ${s.big}`}>
            Write it down.
            <br />
            <span className={s.slab}>Tick it off.</span>
          </p>
          <Link href="/app" className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties}>
            Open the app <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
        </section>
      </main>

      <footer className={s.foot}>
        <Logo size={22} />
        <span>Free and open source, GPL-3.0.</span>
        <nav className={s.legal} aria-label="Policies">
          {LEGAL_DOCS.map(([href, name]) => (
            <Link key={href} href={href}>
              {name}
            </Link>
          ))}
        </nav>
        <a href={REPO}>GitHub</a>
      </footer>
    </>
  );
}
