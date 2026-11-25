"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import s from "./landing.module.css";
import { APP } from "@/lib/urls";

// The onboarding video (apps/video renders it), as a sticker-framed player. Nothing downloads until Play; the
// chapters jump straight to a part, the one playing fills up as it goes, and the end offers the next step.
// Starts come from the video's scene order (apps/video/src/Onboarding.tsx ORDER, at 30fps).
// Ask todone isn't in the video: it has its own section higher up the page.
const CHAPTERS = [
  [1.5, "Tasks & stickers", "var(--butter)"],
  [12.2, "Steps & ideas", "var(--pink)"],
  [20.8, "Sort", "var(--orange)"],
  [27.5, "Calendar", "var(--cyan)"],
  [33.2, "Goals & rewards", "var(--lime)"],
  [42.5, "Share & teams", "var(--peri)"],
] as const;
const LENGTH = 55.4;
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Tour() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [now, setNow] = useState(0);
  const at = CHAPTERS.findLastIndex(([t]) => now >= t);
  const row = useRef<HTMLOListElement>(null);
  // On phones the chapters scroll sideways: keep the one playing in view (the row only, never the page).
  useEffect(() => {
    const ol = row.current;
    const li = ol?.children[at] as HTMLElement | undefined;
    if (!started || !ol || !li || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollTo({ left: li.offsetLeft - ol.offsetLeft - 16, behavior: "smooth" });
  }, [at, started]);

  const play = (from?: number) => {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    setEnded(false);
    if (from !== undefined) v.currentTime = from;
    void v.play().catch(() => {}); // a blocked play leaves the native controls to start it
  };

  return (
    <div className={s.tour}>
      <div className={s.tourScreen}>
        <video
          ref={video}
          src="/onboarding.mp4"
          poster="/onboarding.jpg"
          preload="none"
          playsInline
          controls={started}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          onEnded={() => setEnded(true)}
          aria-label="todone in under a minute: the tour"
        />
        {!started && (
          <button type="button" className={s.tourPlay} onClick={() => play()} aria-label="Play the one-minute tour, with sound">
            <span className={s.tourDisc} aria-hidden>
              <Play size={34} strokeWidth={2.75} fill="currentColor" />
            </span>
            <span className={s.tourLen}>{clock(LENGTH)} · sound on</span>
          </button>
        )}
        {ended && (
          <div className={s.tourEnd}>
            <p className="display">Your turn.</p>
            <div>
              <Link href={`${APP}/?new=1`} className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
                Start a list <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
              </Link>
              <button type="button" className="btn" onClick={() => play(0)}>
                <RotateCcw size={16} strokeWidth={2.75} aria-hidden /> Watch again
              </button>
            </div>
          </div>
        )}
      </div>
      <ol ref={row} className={s.tourChapters} aria-label="Chapters">
        {CHAPTERS.map(([t, name, fill], i) => {
          const end = CHAPTERS[i + 1]?.[0] ?? LENGTH;
          const on = started && i === at;
          return (
            <li key={name}>
              <button
                type="button"
                style={
                  {
                    "--fill": fill,
                    "--done": on ? Math.min(1, (now - t) / (end - t)) : 0,
                  } as React.CSSProperties
                }
                aria-current={on ? "step" : undefined}
                onClick={() => play(t)}
              >
                <b>{name}</b>
                <small>{clock(t)}</small>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
