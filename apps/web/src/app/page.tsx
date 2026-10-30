import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { GithubMark } from "@/components/GithubMark";
import { CopyCommand } from "@/components/CopyCommand";
import { HeroDemo } from "@/components/HeroDemo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INSTALL, NAME, REPO } from "@/lib/brand";
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
    line: "Big task, small steps. Subtasks sit under their task and move with it.",
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
    line: "Due dates the way you say them, and a month calendar of what lands when.",
    proof: (
      <div className={s.chips}>
        {["today", "tom", "fri", "+3", "11-02"].map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    ),
  },
  {
    n: 4,
    fill: "var(--pink)",
    title: "Sit with it",
    line: "Start a focus timer on any task. The minutes you spend are written back onto it.",
    proof: (
      <div className={s.timer}>
        <span className="display">24:59</span>
        <span>Write the launch post · ⏱ 2h</span>
      </div>
    ),
  },
  {
    n: 5,
    fill: "var(--cyan)",
    title: "Take it anywhere",
    line: "Every list is a Markdown file. Open it in the terminal, in Obsidian, in any editor.",
    proof: <pre className={s.md}>{"- [x] Book flights\n- [ ] Pack ⏱ 45m 📅 2026-11-02"}</pre>,
  },
];

export default function Home() {
  return (
    <>
      <header className={s.nav}>
        <Link href="/" className={`display ${s.mark}`}>
          {NAME}
        </Link>
        <nav className={s.links} aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#terminal">Terminal</a>
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
              A todo app for the browser and the terminal. Subtasks, due dates, estimates, a calendar and a focus timer, all
              saved as plain Markdown you own.
            </p>
            <div className={s.actions}>
              <Link href="/app" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
                Start a list <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
              <CopyCommand command={INSTALL} />
            </div>
          </div>
          <HeroDemo />
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

        <section id="terminal" className={s.terminal}>
          <div className={s.termCopy}>
            <h2 className={`display ${s.h2}`}>
              Web first.
              <br />
              <span className={s.lime}>Terminal second.</span>
            </h2>
            <p>
              The same lists, in a full-screen terminal app with tabs, a calendar and a focus timer. Each folder gets its own
              list, so the one for this repo is waiting when you open it.
            </p>
            <CopyCommand command={INSTALL} />
            <a className={s.more} href={`${REPO}#readme`}>
              Every key and command <ArrowUpRight size={16} strokeWidth={2.5} />
            </a>
          </div>
          <div className={s.shot}>
            <video
              src="/demo/demo.mp4"
              poster="/demo/list.png"
              width={1280}
              height={760}
              autoPlay
              muted
              loop
              playsInline
              aria-label="The terminal app: a home screen of lists, then a list with subtasks, due dates and estimates"
            />
          </div>
        </section>

        <section id="open" className={s.open}>
          <h2 className={`display ${s.h2}`}>
            Yours, <span className={s.lime}>all the way down.</span>
          </h2>
          <div className={s.deal}>
            <article className={`sticker ${s.term1}`} style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              <h3 className="display">Open source</h3>
              <p>The web app and the terminal app, GPL-3.0. Read every line, change what you want.</p>
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
                Sync across your devices without running a server. Free for everyday use; a paid plan only for unusually heavy
                use. Coming soon.
              </p>
            </article>
          </div>
        </section>

        <section className={s.close}>
          <p className={`display ${s.big}`}>
            Write it down.
            <br />
            <span className={s.lime}>Tick it off.</span>
          </p>
          <Link href="/app" className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
            Open the app <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
        </section>
      </main>

      <footer className={s.foot}>
        <span className="display">{NAME}</span>
        <span>Free and open source, GPL-3.0.</span>
        <a href={REPO}>GitHub</a>
      </footer>
    </>
  );
}
