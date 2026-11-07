import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  EyeOff,
  GitPullRequest,
  KeyRound,
  Lightbulb,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { GithubMark } from "@/components/GithubMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LEGAL_DOCS, REPO } from "@/lib/brand";
import { FOUNDING, FUNDING, SHOTS } from "@/lib/landing";
import {
  Goals,
  Hardware,
  OfflineDemo,
  Pay,
  Pricing,
  SharedDemo,
  StepsDemo,
  ToolsDemo,
  WeekDemo,
} from "./landing/Demos";
import { HeroBoard } from "./landing/HeroBoard";
import { Shot } from "./landing/Shot";
import s from "./landing/landing.module.css";

const ISSUES = `${REPO}/clients/issues/new/choose`;

export default function Home() {
  return (
    <>
      <header className={s.nav}>
        <Link href="/" aria-label="todone home" className={s.mark}>
          <Logo size={30} />
        </Link>
        <nav className={s.links} aria-label="Sections">
          <a href="#features">What it does</a>
          <a href="#privacy">Privacy</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#pricing">Pricing</a>
          <Link href="/docs">Guide</Link>
        </nav>
        <div className={s.end}>
          <a href={REPO} className={s.navGh} aria-label="todone on GitHub">
            <GithubMark /> <span>GitHub</span>
          </a>
          <ThemeToggle />
          <Link href="/app" className="btn">
            Open the app
          </Link>
        </div>
      </header>

      <main>
        <HeroBoard />

        {/* What it does today: every feature is something you can try right here. */}
        <section
          id="features"
          className={s.features}
          aria-label="What todone does"
        >
          <article className={s.feat}>
            <h2 className="display">Big task, small steps.</h2>
            <p>
              Drop one note onto another and it becomes a step. Steps travel
              with their task.
            </p>
            <StepsDemo />
          </article>

          <article className={`${s.feat} ${s.wide}`}>
            <h2 className="display">Plan the week by dragging it there.</h2>
            <p>
              Day, week, month or year. Drag tasks onto a time and stretch a
              block to set how long it takes. Share one view with a private
              link.
            </p>
            {SHOTS.calendar.src ? (
              <Shot
                shot={SHOTS.calendar}
                sizes="(max-width: 1100px) 100vw, 58vw"
              />
            ) : (
              <WeekDemo />
            )}
          </article>

          <article className={`${s.feat} ${s.half}`}>
            <h2 className="display">One list, the whole house.</h2>
            <p>
              Make a team, invite people, and plan together. Changes show up on
              everyone&apos;s screens within seconds.
            </p>
            <SharedDemo />
          </article>

          <article className={`${s.feat} ${s.half} ${s.dark}`}>
            <h2 className="display">No signal? Keep going.</h2>
            <p>
              todone opens without a connection, shows your lists as last saved,
              and saves what you change once you&apos;re back. Try it:
            </p>
            <OfflineDemo />
          </article>

          <article className={`${s.feat} ${s.full}`}>
            <h2 className="display">Your calendar, in step.</h2>
            <p>
              Two integrations for now, done properly: Google Calendar both
              ways, and a private feed for Apple Calendar. More once these are
              rock solid.
            </p>
            <ToolsDemo />
          </article>
        </section>

        {/* Why it's different, said once, plainly, beside the real thing. */}
        <section className={s.why} aria-labelledby="why">
          <div className={s.whyCopy}>
            <h2 id="why" className="display">
              Not another checklist.
            </h2>
            <ul>
              <li>
                <b>You move things, you don&apos;t fill in forms.</b> Dates,
                lengths, priorities and repeats are stickers you drop on.
              </li>
              <li>
                <b>Your lists are yours.</b> End-to-end encrypted, open source
                under GPL-3.0, export any time, or run it on your own server.
              </li>
              <li>
                <b>Calm by design.</b> No streaks to break, no feed. Goals and
                rewards you set yourself, if you want them.
              </li>
            </ul>
            <Link
              href="/demo"
              className="btn"
              style={{ "--fill": "var(--butter)" } as React.CSSProperties}
            >
              Try the full app, no account{" "}
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          <Shot
            shot={SHOTS.board}
            sizes="(max-width: 900px) 100vw, 55vw"
            className={s.boardShot}
          />
          <Shot shot={SHOTS.boardMobile} sizes="80vw" className={s.phoneShot} />
        </section>

        {/* Privacy: zero knowledge, said plainly, including what the server can still see. */}
        <section id="privacy" className={s.zk} aria-labelledby="zk-h">
          <h2 id="zk-h" className="display">
            For your eyes only.
          </h2>
          <p className={s.sub}>
            todone is end-to-end encrypted. Your lists are locked on your device
            before they&apos;re saved, so our servers only ever hold scrambled
            data. We can&apos;t read your plans, and neither can anyone who
            breaks in.
          </p>
          <div className={s.ways}>
            <div
              className={s.way}
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            >
              <Lock size={22} strokeWidth={2.5} aria-hidden />
              <b>Encrypted on your device</b>
              <span>
                List names, tasks, steps, notes and ideas, with AES-256. Teams
                share a key only members hold.
              </span>
            </div>
            <div
              className={s.way}
              style={{ "--fill": "var(--cyan)" } as React.CSSProperties}
            >
              <EyeOff size={22} strokeWidth={2.5} aria-hidden />
              <b>We never see your password</b>
              <span>
                It unlocks your key in the browser; the server only gets a
                one-way hash of it.
              </span>
            </div>
            <div
              className={s.way}
              style={{ "--fill": "var(--butter)" } as React.CSSProperties}
            >
              <KeyRound size={22} strokeWidth={2.5} aria-hidden />
              <b>A recovery key, just for you</b>
              <span>
                Forget your password and it gets you back in. Nobody else can,
                us included.
              </span>
            </div>
            <div
              className={s.way}
              style={{ "--fill": "var(--pink)" } as React.CSSProperties}
            >
              <GitPullRequest size={22} strokeWidth={2.5} aria-hidden />
              <b>Open source, checkable</b>
              <span>
                The encryption is in our public code for anyone to read.
              </span>
            </div>
          </div>
          <p className={s.provisional}>
            What we can still see: your email and name, which teams you&apos;re
            in, how many lists you have, roughly how big they are and when they
            change. Lists you choose to connect to integrations (Google
            Calendar, the Apple Calendar feed) are stored readable so those can
            work; each list says which it is. Share a single task by link and
            that task, its comments and its files are readable too, until you
            stop sharing.
          </p>
        </section>

        {/* The roadmap: three lists on the same board, in order. */}
        <section id="roadmap" className={s.roadmap} aria-labelledby="roadmap-h">
          <h2 id="roadmap-h" className="display">
            Built for the long haul.
          </h2>
          <p className={s.sub}>
            The web app today, your phone next, then the places you actually
            look: your desk, your fridge, your bag.
          </p>

          <div className={s.lanes}>
            <div
              className={s.lane}
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            >
              <h3 className="display">Now</h3>
              <p className={s.laneSub}>Web app, live</p>
              <ul>
                {[
                  "End-to-end encrypted",
                  "Sticky-note lists with steps",
                  "Calendar and planning",
                  "Teams and shared lists",
                  "Works offline",
                  "Google & Apple Calendar",
                  "Open source, self-hostable",
                ].map((t) => (
                  <li key={t} data-done>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={s.lane}
              style={{ "--fill": "var(--butter)" } as React.CSSProperties}
            >
              <h3 className="display">Next</h3>
              <p className={s.laneSub}>Android, then iPhone</p>
              <ul>
                {[
                  "Quick capture, phone first",
                  "Push reminders",
                  "Sync across devices",
                  "Widgets and quick actions",
                  "Share sheet and OS integrations",
                ].map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <Shot
                shot={SHOTS.mobile}
                sizes="(max-width: 900px) 100vw, 30vw"
                className={s.phone}
              />
            </div>

            <div
              className={s.lane}
              style={{ "--fill": "var(--peri)" } as React.CSSProperties}
            >
              <h3 className="display">Then</h3>
              <p className={s.laneSub}>Hardware, after the apps</p>
              <ul>
                {[
                  "Desk display",
                  "Fridge display",
                  "Bag clip",
                  "E-ink calendar",
                  "Smart home",
                ].map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* The hardware, by where it lives. Concepts, labelled as such. */}
        <section className={s.hardware} aria-labelledby="hw-h">
          <div className={s.hwCopy}>
            <h2 id="hw-h" className="display">
              Your tasks, off your phone.
            </h2>
            <p>
              Calm e-ink screens that show the day without asking for your
              attention, wherever you&apos;ll see them. They come after the
              mobile apps and will be <b>sold separately</b> from the app. Right
              now they&apos;re concepts: your Plus, Team or Founding membership
              funds their prototype R&amp;D, one goal at a time.
            </p>
          </div>
          <Hardware />
        </section>

        {/* The kickstarter: members fund each step, in order. */}
        {!FUNDING.done && (
          <section id="goals" className={s.funding} aria-labelledby="goals-h">
            <h2 id="goals-h" className="display">
              Unlock what&apos;s next.
            </h2>
            <p className={s.sub}>
              Every Plus, Team or Founding purchase goes toward the next goal:
              first the app-store accounts, then hardware prototypes. App-store
              amounts are what Google and Apple charge; hardware amounts are our
              estimates for R&amp;D, not manufacturing.
            </p>
            <Goals />
          </section>
        )}

        {/* Pricing: the deal stated plainly; checkout opens with Razorpay. */}
        <section id="pricing" className={s.pricing} aria-labelledby="price-h">
          <h2 id="price-h" className="display">
            Free to use. Fair to keep running.
          </h2>
          <p className={s.sub}>
            todone is free and open source, and self-hosting is free forever.
            The hosted cloud is free for everyday use; paid plans are for heavy
            use and teams, pay for the servers, and fund the goals above.
            Checkout opens soon through Razorpay: UPI, cards and netbanking.
          </p>
          <Pricing />
          <p className={s.provisional}>
            Plan limits and extras are our plan for launch and may change before
            checkout opens; nothing changes for anyone already using todone.
          </p>
          <div className={s.founding}>
            <p>
              <b>{FOUNDING.name}:</b> {FOUNDING.inr} / {FOUNDING.usd} once for
              three years of Plus, instead of {FOUNDING.yearly} paying yearly at
              launch prices. It all goes to the goals above straight away.
            </p>
            <Pay fill="var(--butter)">Become a founding member</Pay>
          </div>
          <p className={s.selfhost}>
            Rather run it yourself?{" "}
            <a href={`${REPO}/server`}>Self-host todone</a> with Docker Compose:
            every feature, no limits, no licence key.
          </p>
          <p className={s.selfhost}>
            Want todone run for your company? Email{" "}
            <a href="mailto:hello@todone.today">hello@todone.today</a> and tell
            us what you need.
          </p>
        </section>

        {/* Community: four ways in. */}
        <section className={s.community} aria-labelledby="comm-h">
          <h2 id="comm-h" className="display">
            Build it with us.
          </h2>
          <div className={s.ways}>
            <a
              href={REPO}
              className={s.way}
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            >
              <GitPullRequest size={22} strokeWidth={2.5} aria-hidden />
              <b>Contribute code</b>
              <span>Server, web app and shared code on GitHub, GPL-3.0.</span>
            </a>
            <a
              href={ISSUES}
              className={s.way}
              style={{ "--fill": "var(--pink)" } as React.CSSProperties}
            >
              <Bug size={22} strokeWidth={2.5} aria-hidden />
              <b>Report a bug</b>
              <span>Or use Send feedback inside the app.</span>
            </a>
            <a
              href={ISSUES}
              className={s.way}
              style={{ "--fill": "var(--cyan)" } as React.CSSProperties}
            >
              <Lightbulb size={22} strokeWidth={2.5} aria-hidden />
              <b>Suggest an idea</b>
              <span>Tell us what would make todone yours.</span>
            </a>
            <Link
              href="/changelog"
              className={s.way}
              style={{ "--fill": "var(--butter)" } as React.CSSProperties}
            >
              <ArrowUpRight size={22} strokeWidth={2.5} aria-hidden />
              <b>Follow along</b>
              <span>The changelog, the roadmap and the status page.</span>
            </Link>
          </div>
        </section>

        <section className={s.close}>
          <p className={`display ${s.big}`}>
            Write it down.
            <br />
            <span className={s.slab}>Tick it off.</span>
          </p>
          <Link
            href="/app"
            className="btn"
            style={{ "--fill": "var(--butter)" } as React.CSSProperties}
          >
            Start a list <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
        </section>
      </main>

      <footer className={s.foot}>
        <Logo size={22} />
        <span>Free and open source, GPL-3.0.</span>
        <nav className={s.legal} aria-label="More">
          {[
            ["/docs", "Guide"],
            ["/changelog", "Changelog"],
            ["/status", "Status"],
            ...LEGAL_DOCS,
          ].map(([href, name]) => (
            <Link key={href} href={href}>
              {name}
            </Link>
          ))}
        </nav>
        <a href={REPO} className={s.gh}>
          <GithubMark /> GitHub
        </a>
      </footer>
    </>
  );
}
