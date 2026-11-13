// Ask todone, first: someone types their day in Hinglish, and the real results board (AskBoard) fills with stickers,
// already sorted into lists, Goals and Rewards, each with its priority, timing and the reason for it.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
import { parsePlan } from "@todone/sdk/plan";
import type { List } from "@todone/sdk/tasks";
import { fromPlan } from "@/lib/askBoard";
import { AskBoard } from "@/app/app/AskBoard";
import app from "@/app/app/app.module.css";
import { Caption, Fade, usePop } from "../kit";
import { day } from "../seed";

const SAID = "Kal tak report finish karni hai, doodh lena hai, aur gym 4 din week mein. Weekend pe movie as reward.";
const LISTS = [
  { id: "work0001", name: "Work", tasks: [] },
  { id: "groc0001", name: "Groceries", tasks: [] },
] as unknown as List[];
const PLAN = `## Work
- [ ] Finish the report ⏫ ⏱ 2h 💪 l 📅 ${day(1)}
  > Due tomorrow, so it comes first.
  - [ ] Pull this week's numbers ⏱ 30m
  - [ ] Write the summary ⏱ 1h
## Groceries
- [ ] Buy milk 🔼 ⏱ 15m 💪 xs 📅 ${day(0)}
  > On the way home today.
## Goals
- Go to the gym | habit | 4 a week
## Rewards
- Weekend movie | 150 XP
`;
let n = 0;
const DRAFTS = fromPlan(parsePlan(PLAN, () => `draft${String(++n).padStart(4, "0")}`, 0), LISTS);

export const TYPE_FROM = 18;
export const TYPE_DUR = 105;
export const BOARD_AT = TYPE_FROM + TYPE_DUR + 30; // a beat of "thinking" after Enter

export const AskScene = ({ dur }: { dur: number }) => {
  const f = useCurrentFrame();
  const bar = usePop(4, 14);
  const chars = Math.round(interpolate(f, [TYPE_FROM, TYPE_FROM + TYPE_DUR], [0, SAID.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const thinking = f >= TYPE_FROM + TYPE_DUR && f < BOARD_AT;
  const sheet = usePop(BOARD_AT, 15);
  return (
    <AbsoluteFill style={{ background: "var(--ground)", padding: "56px 70px", gap: 22 }}>
      {/* Stickers land one after another, timed by frame (the app's own CSS pop isn't frame-locked). */}
      <style>{`.${app.askLanes}{grid-template-columns:repeat(4,minmax(0,1fr))!important}.${app.askNote}{animation:none!important}${DRAFTS.map((d, i) => {
        const at = BOARD_AT + 10 + i * 14;
        const p = Math.max(0, Math.min(1, (f - at) / 10));
        return `[data-id='${d.id}']{opacity:${p};transform:translateY(${(1 - p) * 18}px) scale(${0.85 + p * 0.15}) rotate(${(1 - p) * -5}deg)}`;
      }).join("")}`}</style>
      <form className={app.askBar} data-inline onSubmit={(e) => e.preventDefault()} style={{ margin: 0, opacity: bar, transform: `translateY(${(1 - bar) * 30}px)`, fontSize: 22 }}>
        <Sparkles size={22} strokeWidth={2.5} aria-hidden className={app.askSpark} style={thinking ? { transform: `rotate(${f * 12}deg)` } : undefined} />
        <input readOnly value={SAID.slice(0, chars)} placeholder="Tell todone what you need to do…" style={{ fontSize: 20 }} />
        <span className={app.askMic}>
          <Mic size={18} strokeWidth={2.5} />
        </span>
        <span className={app.askGo}>
          <ArrowUp size={18} strokeWidth={3} />
        </span>
      </form>
      {thinking && <p style={{ font: "700 18px var(--sans)", color: "var(--ink-2)", margin: 0 }}>Making your lists…</p>}
      {f >= BOARD_AT && (
        <div style={{ opacity: sheet, transform: `translateY(${(1 - sheet) * 24}px)`, zoom: 1.28 }}>
          <AskBoard drafts={DRAFTS} onChange={() => {}} lists={LISTS} made={[]} onMake={() => {}} today={day(0)} />
        </div>
      )}
      <Caption text={f < BOARD_AT ? "Just say your day, in Hindi or English" : "Ask todone turns it into to-dos, goals and rewards"} duration={dur} />
      <Fade f={f} dur={dur} />
    </AbsoluteFill>
  );
};
