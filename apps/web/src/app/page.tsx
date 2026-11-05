import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bug, Check, GitPullRequest, HeartHandshake, Lightbulb, WifiOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GithubMark } from "@/components/GithubMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LEGAL_DOCS, REPO } from "@/lib/brand";
import { FOUNDING, FUNDING, PAY_URL, PLANS, SHOTS } from "@/lib/landing";
import { HeroBoard } from "./landing/HeroBoard";
import { Shot } from "./landing/Shot";
import s from "./landing/landing.module.css";

const ISSUES = `${REPO}/clients/issues/new/choose`;

// A payment button that admits it isn't live yet rather than leading nowhere.
function Pay({ children, fill = "var(--lime)" }: { children: React.ReactNode; fill?: string }) {
  return PAY_URL ? (
    <a href={PAY_URL} className="btn" style={{ "--fill": fill } as React.CSSProperties}>
      {children}
    </a>
  ) : (
    <span className={`btn ${s.soon}`} aria-disabled="true">
      Opening soon
    </span>
  );
}

// The week strip: [day, [title, first row, rows]].
const WEEK = [
  ["Mon", [["Standup", 1, 1]]],
  ["Tue", [["Write the launch post", 0, 3]]],
  ["Wed", [["Dentist", 2, 1]]],
  ["Thu", [["Plan the trip", 1, 2]]],
  ["Fri", [["Groceries", 3, 1]]],
] as const;
const WEEK_FILL = ["var(--butter)", "var(--cyan)", "var(--pink)", "var(--lime)", "var(--peri)"];

export default function Home() {
  const raised = Math.min(FUNDING.raisedUsd / FUNDING.targetUsd, 1);
  return (
    <>
      <header className={s.nav}>
        <Link href="/" aria-label="todone home" className={s.mark}>
          <Logo size={30} />
        </Link>
        <nav className={s.links} aria-label="Sections">
          <a href="#features">What it does</a>
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

        {/* What it does today: each feature next to the note it makes, each laid out its own way. */}
        <section id="features" className={s.features} aria-label="What todone does">
          <article className={s.feat}>
            <h2 className="display">Big task, small steps.</h2>
            <p>
              Drop one note onto another and it becomes a step. Steps travel with their task, and ticking the task off ticks
              them too.
            </p>
            <div className={s.stepNote} aria-hidden>
              <b>Plan the trip</b>
              <ul>
                <li data-done>Book flights</li>
                <li>Find a place to stay</li>
                <li>Pack the chargers</li>
              </ul>
            </div>
          </article>

          <article className={`${s.feat} ${s.wide}`}>
            <h2 className="display">Plan the week by dragging it there.</h2>
            <p>
              Day, week, month or year. Drag tasks onto a time and stretch a block to set how long it takes. Share one view
              with a private link.
            </p>
            {/* Your calendar screenshot once SHOTS.calendar has one; until then the week drawn from the app's parts. */}
            {SHOTS.calendar.src ? (
              <Shot shot={SHOTS.calendar} sizes="(max-width: 1100px) 100vw, 58vw" />
            ) : (
              <div className={s.week} aria-hidden>
                {WEEK.map(([day, items], d) => (
                  <div key={day}>
                    <span>{day}</span>
                    {items.map(([t, top, h]) => (
                      <i
                        key={t}
                        style={{ "--fill": WEEK_FILL[d], gridRow: `${top + 2} / span ${h}` } as React.CSSProperties}
                      >
                        {t}
                      </i>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={`${s.feat} ${s.half}`}>
            <h2 className="display">One list, the whole house.</h2>
            <p>Make a team, invite people, and plan together. Everyone sees changes within seconds, on every device.</p>
            <div className={s.shared} aria-hidden>
              <span className={s.faces}>
                <i>A</i>
                <i>K</i>
                <i>M</i>
              </span>
              <b>Groceries</b>
              <ul>
                <li data-done>Milk</li>
                <li>Rice, 5 kg</li>
                <li>Diyas for Saturday</li>
              </ul>
            </div>
          </article>

          <article className={`${s.feat} ${s.half} ${s.dark}`}>
            <h2 className="display">No signal? Keep going.</h2>
            <p>
              todone opens without a connection, shows your lists as last saved, and saves what you change once you&apos;re
              back.
            </p>
            <p className={s.offline} aria-hidden>
              <WifiOff size={18} strokeWidth={2.5} /> Offline. 3 changes waiting to save.
            </p>
          </article>

          <article className={`${s.feat} ${s.full}`}>
            <h2 className="display">Keeps the tools you already use.</h2>
            <ul className={s.tools}>
              {[
                ["Google Calendar", "both ways"],
                ["Notion", "both ways"],
                ["Obsidian", "Markdown sync"],
                ["Apple & Outlook", "calendar feed"],
                ["Discord", "notifications"],
                ["Push reminders", "even when closed"],
              ].map(([name, how]) => (
                <li key={name}>
                  <b>{name}</b> <span>{how}</span>
                </li>
              ))}
            </ul>
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
                <b>You move things, you don&apos;t fill in forms.</b> Dates, lengths, priorities and repeats are stickers you
                drop on.
              </li>
              <li>
                <b>Your lists are yours.</b> Open source under GPL-3.0, Markdown inside, export any time, or run it on your
                own server.
              </li>
              <li>
                <b>Calm by design.</b> No streaks, no badges, no feed. A board, a calendar, and done.
              </li>
            </ul>
            <Link href="/demo" className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties}>
              Try it, no account <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          <Shot shot={SHOTS.board} sizes="(max-width: 900px) 100vw, 55vw" className={s.boardShot} />
        </section>

        {/* The roadmap as three lists on the same board. */}
        <section id="roadmap" className={s.roadmap} aria-labelledby="roadmap-h">
          <h2 id="roadmap-h" className="display">
            Built for the long haul.
          </h2>
          <p className={s.sub}>
            A simple app today, one calm system tomorrow: your lists on the web, your phone, and maybe your wall.
          </p>

          <div className={s.lanes}>
            <div className={s.lane} style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              <h3 className="display">Now</h3>
              <p className={s.laneSub}>Web app, live</p>
              <ul>
                {[
                  "Sticky-note lists with steps",
                  "Calendar and planning",
                  "Teams and shared lists",
                  "Works offline",
                  "Integrations",
                  "Open source, self-hostable",
                ].map((t) => (
                  <li key={t} data-done>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className={s.lane} style={{ "--fill": "var(--butter)" } as React.CSSProperties}>
              <h3 className="display">Next</h3>
              <p className={s.laneSub}>Android and iOS</p>
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
              <Shot shot={SHOTS.mobile} sizes="(max-width: 900px) 100vw, 30vw" className={s.phone} />
            </div>

            <div className={s.lane} style={{ "--fill": "var(--peri)" } as React.CSSProperties}>
              <h3 className="display">Someday</h3>
              <p className={s.laneSub}>Exploring, not promised</p>
              <ul>
                {["Pocket e-ink reader", "Household display", "Desk display", "E-ink calendar", "Smart home"].map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {!FUNDING.done && (
            <div className={s.fund}>
              <div>
                <h3 className="display">Help put todone in the app stores.</h3>
                <p>
                  Publishing needs two developer accounts. ${FUNDING.targetUsd} covers them and nothing else: the apps
                  themselves are built in the open. Every Plus, Team or Founding purchase counts toward it.
                </p>
                <ul className={s.parts}>
                  {FUNDING.parts.map(([what, cost]) => (
                    <li key={what}>
                      <span>{what}</span> <b>{cost}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.meter}>
                <p className="display">
                  ${FUNDING.raisedUsd} <span>of ${FUNDING.targetUsd}</span>
                </p>
                <div
                  className={s.bar}
                  role="progressbar"
                  aria-label="Raised for the developer accounts"
                  aria-valuemin={0}
                  aria-valuemax={FUNDING.targetUsd}
                  aria-valuenow={FUNDING.raisedUsd}
                >
                  <i style={{ width: `${raised * 100}%` }} />
                </div>
                <p className={s.meterNote}>Raised by members so far. This goes away once we get there.</p>
                <Pay>
                  Support with UPI <HeartHandshake size={18} strokeWidth={2.5} aria-hidden />
                </Pay>
              </div>
            </div>
          )}
        </section>

        {/* The hardware vision: concepts, labelled as such. */}
        <section className={s.hardware} aria-labelledby="hw-h">
          <div className={s.hwCopy}>
            <h2 id="hw-h" className="display">
              Your tasks shouldn&apos;t live only in your phone.
            </h2>
            <p>
              We&apos;re exploring calm e-ink screens that show the day without asking for your attention. Nothing here is
              for sale or promised; it&apos;s where we&apos;d like todone to go.
            </p>
          </div>
          <div className={s.devices}>
            <figure className={s.device}>
              <Shot shot={SHOTS.pocket} sizes="(max-width: 900px) 70vw, 24vw" />
              <figcaption>
                <b>Pocket reader.</b> Today&apos;s tasks and priorities. Tick them off, put it back in your pocket.
              </figcaption>
            </figure>
            <figure className={s.device}>
              <Shot shot={SHOTS.household} sizes="(max-width: 900px) 100vw, 40vw" />
              <figcaption>
                <b>Household display.</b> On the fridge or the wall: family lists, the shopping, the week. Anyone can tick
                things off, and it sips power.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Pricing: the deal stated plainly; checkout opens with Razorpay. */}
        <section id="pricing" className={s.pricing} aria-labelledby="price-h">
          <h2 id="price-h" className="display">
            Free to use. Fair to keep running.
          </h2>
          <p className={s.sub}>
            todone is free and open source, and self-hosting is free forever. The hosted cloud is free for everyday use; paid
            plans are for heavy use and teams, and they pay for the servers. Checkout opens soon through Razorpay: UPI, cards
            and netbanking.
          </p>
          <div className={s.plans}>
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={s.plan}
                data-lead={p.lead || undefined}
                style={{ "--fill": p.fill } as React.CSSProperties}
              >
                <h3 className="display">{p.name}</h3>
                <p className={s.price}>
                  <b className="display">{p.inr}</b> <span>/ {p.usd}</span> <small>{p.per}</small>
                </p>
                <p className={s.planNote}>{p.note}</p>
                <ul>
                  {p.points.map((t) => (
                    <li key={t}>
                      <Check size={16} strokeWidth={3} aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
                {p.inr === "₹0" ? (
                  <Link href="/app" className="btn">
                    Start free
                  </Link>
                ) : (
                  <Pay fill={p.lead ? "var(--lime)" : "var(--butter)"}>Choose {p.name}</Pay>
                )}
              </div>
            ))}
          </div>
          <p className={s.provisional}>
            Plan limits and extras are our plan for launch and may change before checkout opens; nothing changes for anyone
            already using todone.
          </p>
          <div className={s.founding}>
            <p>
              <b>{FOUNDING.name}:</b> {FOUNDING.inr} / {FOUNDING.usd} {FOUNDING.per}. Pay once and back the mobile apps.
            </p>
            <Pay fill="var(--butter)">Become a founding member</Pay>
          </div>
          <p className={s.selfhost}>
            Rather run it yourself? <a href={`${REPO}/server`}>Self-host todone</a> with Docker Compose: every feature, no
            limits, no licence key.
          </p>
        </section>

        {/* Community: four ways in. */}
        <section className={s.community} aria-labelledby="comm-h">
          <h2 id="comm-h" className="display">
            Build it with us.
          </h2>
          <div className={s.ways}>
            <a href={REPO} className={s.way} style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              <GitPullRequest size={22} strokeWidth={2.5} aria-hidden />
              <b>Contribute code</b>
              <span>Server, web app and shared code on GitHub, GPL-3.0.</span>
            </a>
            <a href={ISSUES} className={s.way} style={{ "--fill": "var(--pink)" } as React.CSSProperties}>
              <Bug size={22} strokeWidth={2.5} aria-hidden />
              <b>Report a bug</b>
              <span>Or use Send feedback inside the app.</span>
            </a>
            <a href={ISSUES} className={s.way} style={{ "--fill": "var(--cyan)" } as React.CSSProperties}>
              <Lightbulb size={22} strokeWidth={2.5} aria-hidden />
              <b>Suggest an idea</b>
              <span>Tell us what would make todone yours.</span>
            </a>
            <Link href="/changelog" className={s.way} style={{ "--fill": "var(--butter)" } as React.CSSProperties}>
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
          <Link href="/app" className="btn" style={{ "--fill": "var(--butter)" } as React.CSSProperties}>
            Start a list <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
        </section>
      </main>

      <footer className={s.foot}>
        <Logo size={22} />
        <span>Free and open source, GPL-3.0.</span>
        <nav className={s.legal} aria-label="More">
          {[["/docs", "Guide"], ["/changelog", "Changelog"], ["/status", "Status"], ...LEGAL_DOCS].map(([href, name]) => (
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
