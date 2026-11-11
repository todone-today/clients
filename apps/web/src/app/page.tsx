import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  Check,
  GitPullRequest,
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
  GoalsDemo,
  Hardware,
  OfflineDemo,
  Pay,
  Pricing,
  FocusDemo,
  PhoneDemo,
  RemindDemo,
  SharedDemo,
  StepsDemo,
  ToolsDemo,
  WeekDemo,
} from "./landing/Demos";
import { HeroBoard } from "./landing/HeroBoard";
import { Reveal } from "./landing/Reveal";
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
          <Link href="/install">Get the app</Link>
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

        {/* What it does today, one feature at a time: each gets the screen, a few words, and the real thing to try. */}
        <section id="features" className={s.features} aria-label="What todone does">
          <Chapter tag="Steps" title="Big task, small steps." fill="var(--butter)">
            Drop one note on another and it becomes a step. Fold them away when you&apos;re done looking.
            <StepsDemo />
          </Chapter>
          <Chapter tag="Calendar" title="Plan the week by dragging it there." fill="var(--cyan)" wide>
            Drag a task onto a time; stretch the block to say how long.
            {SHOTS.calendar.src ? <Shot shot={SHOTS.calendar} sizes="(max-width: 1100px) 100vw, 72rem" /> : <WeekDemo />}
          </Chapter>
          <Chapter tag="Focus" title="Focus mode. Just you and one task." fill="var(--lime)">
            Everything else disappears: one task, a timer and a soft tick-tock. Finish, and the time you spent is saved on it.
            <FocusDemo />
          </Chapter>
          <Chapter tag="Together" title="One list, the whole house." fill="var(--pink)">
            Plan with a team, or share one task by link with anyone. No account needed.
            <SharedDemo />
          </Chapter>
          <Chapter tag="Offline" title="No signal? Keep going." fill="var(--orange)">
            It opens without a connection and saves what you change once you&apos;re back. Try it.
            <OfflineDemo />
          </Chapter>
          <Chapter tag="Goals" title="Goals you can feel." fill="var(--peri)">
            Log in a tap, earn XP, spend it on rewards you choose. No streak to break.
            <GoalsDemo />
          </Chapter>
          <Chapter tag="Reminders" title="Reminders that can't read you." fill="var(--cyan)">
            Sealed on your device. Our server only knows when, never what.
            <RemindDemo />
          </Chapter>
          <Chapter tag="Calendars" title="Your calendar, in step." fill="var(--butter)">
            Google, Apple and Outlook from one private link. Add it once.
            <ToolsDemo />
          </Chapter>
          <Chapter tag="Phone" title="In your pocket, too." fill="var(--pink)">
            No app store needed. Add todone to your home screen and it works like a real app: full screen, offline, and
            notifications that remind you of tasks even when it&apos;s closed.
            <PhoneDemo />
          </Chapter>
        </section>

        {/* The psychology the features are built on, as a todo list of its own: every line ticked. */}
        <section id="why-it-works" className={s.mind} aria-labelledby="mind-h">
          <h2 id="mind-h" className="display">
            Built to get you doing.
          </h2>
          <p className={s.sub}>
            Every feature leans on something that helps people actually follow
            through, not just write things down.
          </p>
          <ul className={s.mindNote}>
            {MIND.map(([idea, line, feature]) => (
              <li key={idea}>
                <span className={s.mindTick} aria-hidden>
                  <Check size={16} strokeWidth={3.5} />
                </span>
                <p>
                  <b>{idea}</b> {line}
                </p>
                <small>{feature}</small>
              </li>
            ))}
          </ul>
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
            Everything you write is scrambled on your phone or computer before
            it&apos;s saved. Only you can unscramble it. Not us, not a hacker,
            nobody.
          </p>

          {/* The same task, as you see it and as our server stores it. */}
          <div className={s.zkPair} aria-label="What you see and what our server stores">
            <figure className={s.zkYou}>
              <figcaption>You see</figcaption>
              <p className="display">Buy a cake for Maa&apos;s birthday</p>
            </figure>
            <span className={s.zkArrow} aria-hidden>
              <Lock size={22} strokeWidth={2.75} />
            </span>
            <figure className={s.zkUs}>
              <figcaption>Our server stores</figcaption>
              <p>v1.q9Xf2Lr0aKz7…Hc4mPw8eT1yBn6Ud3sJ0vRk=</p>
            </figure>
          </div>

          <p className={s.zkMore}>
            What we can and can&apos;t see, in full:{" "}
            <Link href="/privacy#still-see">Privacy Policy</Link>.
          </p>
        </section>

        {/* The roadmap: three lists on the same board, in order. */}
        <section id="roadmap" className={s.roadmap} aria-labelledby="roadmap-h">
          <h2 id="roadmap-h" className="display">
            Built for the long haul.
          </h2>
          <p className={s.sub}>
            Today on the web and your phone&apos;s home screen, native apps next,
            then the places you actually look: your desk, your fridge, your bag.
          </p>

          <div className={s.lanes}>
            <div
              className={s.lane}
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
            >
              <h3 className="display">Now</h3>
              <p className={s.laneSub}>Web and phone, live</p>
              <ul>
                {[
                  "End-to-end encrypted",
                  "Sticky-note lists, steps and effort",
                  "Calendar and planning",
                  "Teams and shared lists",
                  "Share a task by link",
                  "Goals, XP and rewards",
                  "Reminders, even when closed",
                  "Works offline",
                  "Installs on iPhone and Android",
                  "Google, Apple & Outlook calendars",
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
              <p className={s.laneSub}>Native apps: Android, then iPhone</p>
              <ul>
                {[
                  "On the Play Store and App Store",
                  "Home-screen widgets",
                  "Add from the share sheet",
                  "Siri and Google Assistant",
                  "Deeper OS integrations",
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
              Calm e-ink screens that show your day without asking for your
              attention. Concepts for now: members fund the prototypes, one
              goal at a time.
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
            Checkout is through Razorpay: UPI, cards and netbanking.
          </p>
          <Pricing />
          <div className={s.founding}>
            <span className={s.foundingTag}>Founding member</span>
            <span className={s.foundingFace} aria-hidden>
              K
            </span>
            <div>
              <h3 className="display">
                Know Kartikey personally? Like where todone is going?
              </h3>
              <p>
                I&apos;m building todone in the open: private lists, no ads, no
                selling your data, then phones and a calm e-ink screen. If
                that&apos;s something you want to exist, back it once and
                you&apos;re part of it from the start.
              </p>
              <p className={s.foundingSign}>— Kartikey, who makes todone</p>
              <p className={s.foundingPrice}>
                <b className="display">{FOUNDING.inr}</b> / {FOUNDING.usd}{" "}
                <small>paid once</small>
              </p>
              <p>
                That gives you three years of Plus, and nothing renews (paying
                yearly would come to {FOUNDING.yearly}). Every rupee goes
                towards the app-store accounts and the first hardware
                prototypes.
              </p>
            </div>
            <Pay plan="founding" fill="var(--pink)">
              Become a founding member
            </Pay>
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
            href="/app?new=1"
            className="btn"
            style={{ "--fill": "var(--butter)" } as React.CSSProperties}
          >
            Start a list <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
        </section>
        <Reveal />
      </main>

      <footer className={s.foot}>
        <Logo size={22} />
        <span>Free and open source, GPL-3.0.</span>
        <nav className={s.legal} aria-label="More">
          {[
            ["/docs", "Guide"],
            ["/install", "Get the app"],
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

// The ideas behind the features, said plainly, each with where it lives in todone.
const MIND = [
  ["Start tiny.", "A big task is daunting; its first five-minute step isn't. Break it down and begin.", "Steps"],
  ["Decide when, not just what.", "A task with a time on the calendar gets done far more often than one on a list.", "Calendar"],
  ["Plan for the hard day.", "\"If I'm too tired, then I'll walk ten minutes.\" Deciding ahead beats willpower later.", "If-then plans"],
  ["One thing at a time.", "Switching costs focus. Give one task the whole screen and a clock.", "Focus mode"],
  ["Reward the effort.", "Bigger tasks earn more XP, and you spend it on treats you pick yourself.", "XP & rewards"],
  ["Miss a day, keep the habit.", "No streak to lose. A quiet week starts fresh, and one small win counts.", "Goals"],
  ["Know how long things take.", "Focus time goes on the task, so your next plan is honest.", "⏳ on cards"],
] as const;

// One feature at a time: a big headline, one line, then the thing itself on a coloured stage.
function Chapter({
  tag,
  title,
  fill,
  wide,
  children,
}: {
  tag: string;
  title: string;
  fill: string;
  wide?: boolean;
  children: [React.ReactNode, React.ReactNode];
}) {
  const [line, demo] = children;
  return (
    <article className={s.chapter} data-reveal style={{ "--fill": fill } as React.CSSProperties} aria-label={tag}>
      <h2 className="display">{title}</h2>
      <p>{line}</p>
      <div className={s.stage} data-wide={wide || undefined}>
        {demo}
      </div>
    </article>
  );
}
