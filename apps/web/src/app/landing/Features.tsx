"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "./landing.module.css";

// What todone does, one feature at a time. Wide screens, the way Apple's product pages do it: the section stays put
// while you scroll, the words change on the left and the live demo swaps in on the right, with the feature names to
// jump between. Phones (and the first paint) stack them: a big headline, one line, then the demo.
export type Feature = { tag: string; title: string; line?: ReactNode; fill: string; wide?: boolean; demo: ReactNode };

export function Features({ items }: { items: Feature[] }) {
  const [pinned, setPinned] = useState(false);
  const [at, setAt] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mq = matchMedia("(min-width: 1000px)");
    const set = () => setPinned(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  // Which feature is showing: how far through the tall track the page has scrolled, in equal shares.
  useEffect(() => {
    if (!pinned) return;
    const on = () => {
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = el.offsetHeight - innerHeight;
      const p = Math.min(0.999, Math.max(0, -r.top / Math.max(1, span)));
      setAt(Math.floor(p * items.length));
    };
    on();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, [pinned, items.length]);
  const jump = (i: number) => {
    const el = track.current!;
    const top = el.getBoundingClientRect().top + scrollY;
    const span = el.offsetHeight - innerHeight;
    scrollTo({ top: top + ((i + 0.5) / items.length) * span, behavior: "smooth" });
  };

  if (!pinned)
    return (
      <>
        {items.map((f) => (
          <article key={f.tag} className={s.chapter} data-reveal style={{ "--fill": f.fill } as React.CSSProperties} aria-label={f.tag}>
            <h2 className="display">{f.title}</h2>
            {f.line && <p>{f.line}</p>}
            <div className={s.stage} data-wide={f.wide || undefined}>
              {f.demo}
            </div>
          </article>
        ))}
      </>
    );

  const f = items[at];
  return (
    <div ref={track} className={s.track} style={{ "--n": items.length } as React.CSSProperties}>
      <div className={s.pin} style={{ "--fill": f.fill } as React.CSSProperties}>
        <div className={s.pinCopy}>
          <div key={at} className={s.pinWords} aria-live="polite">
            <h2 className="display">{f.title}</h2>
            {f.line && <p>{f.line}</p>}
          </div>
          <ol className={s.pinTabs} aria-label="Features">
            {items.map((x, i) => (
              <li key={x.tag}>
                <button
                  type="button"
                  aria-current={i === at ? "step" : undefined}
                  style={{ "--fill": x.fill } as React.CSSProperties}
                  onClick={() => jump(i)}
                >
                  {x.tag}
                </button>
              </li>
            ))}
          </ol>
        </div>
        {/* Only the showing demo is mounted: it plays its own short demo each time it comes in. */}
        <div key={at} className={s.stage} data-pinned aria-label={f.tag}>
          {f.demo}
        </div>
      </div>
    </div>
  );
}
