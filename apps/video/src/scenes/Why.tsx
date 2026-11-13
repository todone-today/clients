// A short card before goals and before rewards: why they're there, in three plain lines that land one at a time, so
// there's time to read each.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Footprints, Gift, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import { Fade, usePop } from "../kit";

type Line = { icon: React.ReactNode; text: string };
const Card = ({ title, fill, lines, dur }: { title: string; fill: string; lines: Line[]; dur: number }) => {
  const f = useCurrentFrame();
  const card = usePop(2, 13);
  const pops = [usePop(26, 13), usePop(66, 13), usePop(106, 13)];
  return (
    <AbsoluteFill style={{ background: "var(--ground)", alignItems: "center", justifyContent: "center" }}>
      <div
        className="sticker"
        style={{
          ["--fill" as string]: fill,
          width: 860,
          padding: "40px 48px",
          color: "var(--black)",
          transform: `scale(${0.85 + card * 0.15}) rotate(${-1.5 + (1 - card) * -6}deg)`,
          opacity: card,
        }}
      >
        <p style={{ font: "800 16px var(--sans)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
          Built around how motivation works
        </p>
        <h2 className="display" style={{ fontSize: 76, lineHeight: 0.95, margin: "10px 0 26px" }}>
          {title}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
          {lines.map((l, i) => (
            <li
              key={l.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                font: "700 27px/1.25 var(--sans)",
                opacity: pops[i],
                transform: `translateX(${(1 - pops[i]) * -30}px)`,
              }}
            >
              <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, flex: "none", background: "#fff8ef", border: "2.5px solid var(--black)" }}>
                {l.icon}
              </span>
              {l.text}
            </li>
          ))}
        </ul>
      </div>
      <Fade f={f} dur={dur} />
    </AbsoluteFill>
  );
};

const I = { size: 24, strokeWidth: 2.75 } as const;
export const WhyGoals = ({ dur }: { dur: number }) => (
  <Card
    dur={dur}
    title="Why goals?"
    fill="var(--lime)"
    lines={[
      { icon: <Target {...I} />, text: "One clear target beats a vague wish." },
      { icon: <Footprints {...I} />, text: "Tiny steps, logged often, keep you going." },
      { icon: <TrendingUp {...I} />, text: "Seeing progress makes you want more of it." },
    ]}
  />
);
export const WhyRewards = ({ dur }: { dur: number }) => (
  <Card
    dur={dur}
    title="Why rewards?"
    fill="var(--pink)"
    lines={[
      { icon: <Zap {...I} />, text: "Every task you finish earns XP." },
      { icon: <Gift {...I} />, text: "You pick the treats, so they're worth it." },
      { icon: <Sparkles {...I} />, text: "Effort now, a reward you feel this week." },
    ]}
  />
);
