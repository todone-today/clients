"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { type Task, fmtMinutes, tick, todayISO } from "@todone/sdk/tasks";
import { Confetti } from "@/components/Confetti";
import { authClient } from "@/lib/auth-client";
import s from "./app.module.css";

// Focus: one task across the whole tab, with a running clock (and a soft tick-tock, if you like). The minutes go onto the
// task's "spent" time (⏳ on its card) when you finish or step out, so you learn how long things really take.
const SOUND = "todone:focus-sound";
const clock = (ms: number) => {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const mm = String(Math.floor(t / 60) % 60).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
// Whole minutes worth keeping: a quick look (under 15 seconds) adds nothing.
export const focusMinutes = (ms: number) => Math.round(ms / 60_000) || (ms >= 15_000 ? 1 : 0);

let audio: AudioContext | null = null;
// One tick (or tock, a little lower) of a mechanical clock: a short filtered click, made on the fly.
function tickSound(tock: boolean) {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const t = audio.currentTime;
    const len = 0.035;
    const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * len), audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    const src = audio.createBufferSource();
    src.buffer = buf;
    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = tock ? 1900 : 2600;
    band.Q.value = 6;
    const gain = audio.createGain();
    gain.gain.value = 0.9;
    src.connect(band).connect(gain).connect(audio.destination);
    src.start(t);
  } catch {
    // No audio here: the clock still runs, silently.
  }
}

export function Focus({
  task,
  fill,
  edit,
  onTick,
  onExit,
}: {
  task: Task;
  fill?: string;
  edit: (f: (t: Task) => Task | null) => void;
  onTick: () => void;
  onExit: () => void;
}) {
  const me = authClient.useSession().data?.user.id;
  // Elapsed time is banked time plus the current run, so a throttled background tab still counts right.
  const [banked, setBanked] = useState(0);
  const [since, setSince] = useState<number | null>(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem(SOUND) !== "0";
    } catch {
      return true;
    }
  });
  const [finished, setFinished] = useState<number | null>(null);
  const running = banked + (since === null ? 0 : now - since);
  const elapsed = finished ?? running; // frozen once finished
  const goal = task.est ? task.est * 60_000 : 0;

  // The clock, and the tick-tock on each new second while it runs.
  const last = useRef(-1);
  useEffect(() => {
    if (since === null || finished !== null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [since, finished]);
  const second = Math.floor(elapsed / 1000);
  useEffect(() => {
    if (since === null || finished !== null || second === last.current) return;
    last.current = second;
    if (sound && second > 0) tickSound(second % 2 === 1);
  }, [second, since, sound, finished]);

  // It fills the tab only (other tabs and windows stay free); the screen is kept awake, and the clock is in the title.
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock?.request("screen").then((l) => (lock = l), () => {});
    const title = document.title;
    return () => {
      lock?.release().catch(() => {});
      document.title = title;
    };
  }, []);
  useEffect(() => {
    document.title = `${clock(elapsed)} · ${task.title}`;
  }, [elapsed, task.title]);

  const toggle = () => {
    if (finished !== null) return;
    if (since === null) setSince(Date.now());
    else {
      setBanked((b) => b + Date.now() - since);
      setSince(null);
    }
    setNow(Date.now());
  };
  const keep = () => {
    const m = focusMinutes(elapsed);
    if (m) edit((t) => ({ ...t, spent: (t.spent ?? 0) + m }));
  };
  const leave = () => {
    if (finished !== null) return; // already counted; it closes by itself
    keep();
    onExit();
  };
  const finish = () => {
    if (finished !== null) return;
    setFinished(elapsed);
    setSince(null);
    keep();
    if (!task.done) onTick();
    setTimeout(onExit, 2200);
  };

  // Space pauses, Esc steps out (keeping the time), Enter finishes.
  const keys = useRef({ toggle, leave, finish });
  useEffect(() => {
    keys.current = { toggle, leave, finish };
  });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === " ") keys.current.toggle();
      else if (e.key === "Escape") keys.current.leave();
      else if (e.key === "Enter") keys.current.finish();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation(); // the task panel underneath mustn't close on this Esc
    };
    addEventListener("keydown", key, true);
    return () => removeEventListener("keydown", key, true);
  }, []);

  const step = (id: string) => edit((t) => tick([t], id, todayISO(), me)[0] ?? t);

  return createPortal(
    <div className={s.focus} role="dialog" aria-modal="true" aria-label={`Focus: ${task.title}`}>
      {finished !== null && <Confetti />}
      <div className={s.focusCard} style={{ "--fill": fill ?? "var(--butter)" } as React.CSSProperties}>
        <p className={s.focusKicker}>{finished !== null ? "Done" : since === null ? "Paused" : "Focusing on"}</p>
        <h1 className="display">{task.title}</h1>

        <p className={s.focusClock} role="timer" aria-live="off" data-paused={(since === null && finished === null) || undefined}>
          {clock(elapsed)}
        </p>
        {goal > 0 && finished === null && (
          <div className={s.focusGoal}>
            <span className={s.focusBar} aria-hidden>
              <i style={{ transform: `scaleX(${Math.min(1, elapsed / goal)})` }} />
            </span>
            <small>
              {elapsed <= goal
                ? `${clock(goal - elapsed)} left of ${fmtMinutes(task.est!)}`
                : `${clock(elapsed - goal)} past the ${fmtMinutes(task.est!)} you planned. That's fine.`}
            </small>
          </div>
        )}
        {finished !== null ? (
          <p className={s.focusSaved} role="status">
            {/* By now the session's minutes are on the task, so this is the whole time. */}
            Ticked off.{task.spent ? ` ⏳ ${fmtMinutes(task.spent)} on this in all.` : ""}
          </p>
        ) : (
          task.spent ? <p className={s.focusSaved}>⏳ {fmtMinutes(task.spent)} before this session</p> : null
        )}

        {task.sub.length > 0 && (
          <ul className={s.focusSteps}>
            {task.sub.map((x) => (
              <li key={x.id}>
                <button role="checkbox" aria-checked={x.done} onClick={() => step(x.id)} disabled={finished !== null}>
                  <span className={s.check}>{x.done && <Check size={14} strokeWidth={3.5} />}</span>
                  <span data-done={x.done || undefined}>{x.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {finished === null && (
          <div className={s.focusTools}>
            <button
              className={s.focusIcon}
              onClick={() => {
                setSound(!sound);
                try {
                  localStorage.setItem(SOUND, sound ? "0" : "1");
                } catch {}
              }}
              aria-pressed={sound}
              aria-label={sound ? "Tick-tock on" : "Tick-tock off"}
              data-tip={sound ? "Tick-tock on" : "Tick-tock off"}
            >
              {sound ? <Volume2 size={20} strokeWidth={2.5} aria-hidden /> : <VolumeX size={20} strokeWidth={2.5} aria-hidden />}
            </button>
            <button className="btn" onClick={toggle} style={{ "--fill": "var(--butter)" } as React.CSSProperties}>
              {since === null ? <Play size={18} strokeWidth={2.75} aria-hidden /> : <Pause size={18} strokeWidth={2.75} aria-hidden />}
              {since === null ? "Resume" : "Pause"}
            </button>
            <button className="btn" onClick={finish} style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
              <Check size={18} strokeWidth={3} aria-hidden /> {task.done ? "Finish" : "Done"}
            </button>
          </div>
        )}
      </div>
      {finished === null && (
        <button className={s.focusExit} onClick={leave} aria-label="Step out (keeps the time)" data-tip="Step out, time kept">
          <X size={22} strokeWidth={2.75} aria-hidden />
        </button>
      )}
    </div>,
    document.body,
  );
}
