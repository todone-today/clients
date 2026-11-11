// The video's small toolkit: sound cues, scene captions, the cursor, a scaled "app window" for the real components,
// and measuring where a real element sits so the cursor can go to it and drag a copy of it.
import { useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---- Sound -------------------------------------------------------------------------------------------------------
// One sound effect at a frame. The files in public/sfx/ are placeholders made by make_sfx.py; to use real ones, drop
// recordings (e.g. from Pixabay or Mixkit) into public/sfx/ under the same names: pop, whoosh, ding, thud, chime, click.
export type SfxName = "pop" | "whoosh" | "ding" | "thud" | "chime" | "click";
export const Sfx = ({ at, name, volume = 0.6 }: { at: number; name: SfxName; volume?: number }) => (
  <Sequence from={at} durationInFrames={45} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// ---- Caption -----------------------------------------------------------------------------------------------------
// The scene's caption, a small sticker at the top, popping in and fading out with the scene.
export const Caption = ({ text, duration }: { text: string; duration: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 14, stiffness: 160 } });
  const out = interpolate(f, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      className="sticker"
      style={{
        position: "absolute",
        top: 18,
        left: "50%",
        zIndex: 50,
        padding: "8px 18px",
        font: "800 20px/1.2 var(--sans)",
        whiteSpace: "nowrap",
        ["--fill" as string]: "var(--lime)",
        opacity: out,
        transform: `translateX(-50%) translateY(${(1 - pop) * -24}px) scale(${0.9 + pop * 0.1}) rotate(-1deg)`,
      }}
    >
      {text}
    </div>
  );
};

// ---- Pop-in ------------------------------------------------------------------------------------------------------
export const usePop = (from = 0, damping = 12) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - from, fps, config: { damping, stiffness: 180 } });
};

// ---- The app window ----------------------------------------------------------------------------------------------
// The real components laid out at a desktop size (1600x900 by default) and scaled into the frame, under the caption.
export const Stage = ({ children, scale = 0.8, top = 70 }: { children: React.ReactNode; scale?: number; top?: number }) => (
  <AbsoluteFill style={{ background: "var(--ground)", color: "var(--ink)" }}>
    <div
      data-stage
      style={{
        position: "absolute",
        left: 0,
        top,
        width: 1280 / scale,
        height: (720 - top) / scale,
        padding: "8px 40px",
        overflow: "hidden",
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

// ---- Where things are --------------------------------------------------------------------------------------------
export type Rect = { x: number; y: number; w: number; h: number; html: string };
type Targets<K extends string> = Partial<Record<K, Rect>>;
// Measures the elements each selector (or finder) picks, in video pixels, after every render and once the fonts are
// in. `html` is the element's real markup, for a dragged copy.
export function useTargets<K extends string>(find: Record<K, string | (() => Element | null | undefined)>): {
  ref: React.RefObject<HTMLDivElement | null>;
  at: Targets<K>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Targets<K>>({});
  const [fontsHandle] = useState(() => delayRender("fonts for measuring"));
  const measure = () => {
    const root = ref.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const k = box.width / 1280; // the Studio preview scales the whole frame
    const next: Targets<K> = {};
    for (const key of Object.keys(find) as K[]) {
      const q = find[key];
      // Only inside the app window, never the cursor's carried copy.
      const el = typeof q === "string" ? (root.querySelector("[data-stage]") ?? root).querySelector(q) : q();
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[key] = { x: (r.left - box.left) / k, y: (r.top - box.top) / k, w: r.width / k, h: r.height / k, html: el.outerHTML };
    }
    // Compared by position only (rounded): markup can differ render to render without anything having moved.
    const key = (t: Targets<K>) =>
      Object.entries(t)
        .map(([k, r]) => { const v = r as Rect; return `${k}:${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.w)},${Math.round(v.h)}`; })
        .join("|");
    if (key(next) !== key(at)) setAt(next);
  };
  useLayoutEffect(measure);
  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      measure();
      continueRender(fontsHandle);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { ref, at };
}
export const mid = (r?: Rect) => (r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : { x: 640, y: 360 });

// ---- The cursor --------------------------------------------------------------------------------------------------
// Moves through keyframes ({frame, x, y, down}); eased between them. "down" presses it (a drag or a click).
export type Key = { f: number; x: number; y: number; down?: boolean };
export function cursorAt(keys: Key[], frame: number) {
  if (!keys.length) return { x: 640, y: 360, down: false };
  let i = keys.findIndex((k) => k.f > frame);
  if (i === -1) return keys[keys.length - 1];
  if (i === 0) return keys[0];
  const a = keys[i - 1];
  const b = keys[i];
  const t = interpolate(frame, [a.f, b.f], [0, 1], { easing: Easing.inOut(Easing.cubic) });
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, down: !!a.down };
}
export const Cursor = ({ keys }: { keys: Key[] }) => {
  const f = useCurrentFrame();
  const c = cursorAt(keys, f);
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: c.x - 4,
        top: c.y - 3,
        zIndex: 60,
        transform: `scale(${c.down ? 0.85 : 1})`,
        transformOrigin: "4px 3px",
        filter: "drop-shadow(2px 2px 0 rgba(0,0,0,.45))",
      }}
    >
      <path d="M4 3l14 8.5-6 1.6-3 6z" fill="#fff8ef" stroke="#0b0b0b" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};

// ---- A dragged copy ----------------------------------------------------------------------------------------------
// The real element's markup, lifted (tilted, a little bigger, a deeper shadow) and carried by the cursor, the way the
// app's own drag (lib/drag.ts) carries a card.
export const Carried = ({ item, x, y, scale = 0.8 }: { item?: Rect; x: number; y: number; scale?: number }) => {
  if (!item) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - item.w / 2,
        top: y - item.h / 2,
        width: item.w / scale,
        zIndex: 55,
        listStyle: "none",
        pointerEvents: "none",
        transform: `scale(${scale * 1.05}) rotate(2.5deg)`,
        transformOrigin: "0 0",
        filter: "drop-shadow(8px 10px 0 rgba(0,0,0,.35))",
      }}
      dangerouslySetInnerHTML={{ __html: item.html }}
    />
  );
};

// Every element in the app window matching a selector (finders use this, so they never pick the carried copy).
export const inStage = (sel: string) => [...(document.querySelector("[data-stage]")?.querySelectorAll<HTMLElement>(sel) ?? [])];

// ---- Scene touches ----------------------------------------------------------------------------------------------
// A short fade to the ground colour at a scene's end, so cuts feel soft.
export const Fade = ({ f, dur }: { f: number; dur: number }) => (
  <AbsoluteFill
    style={{ background: "var(--ground)", opacity: interpolate(f, [dur - 8, dur], [0, 1], { extrapolateLeft: "clamp" }), pointerEvents: "none", zIndex: 70 }}
  />
);

// A lime ring that spreads from where something landed.
export const Ring = ({ x, y, f }: { x: number; y: number; f: number }) => {
  if (f > 18) return null;
  const r = 20 + f * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        border: "4px solid var(--lime)",
        borderRadius: "50%",
        opacity: 1 - f / 18,
        zIndex: 58,
        pointerEvents: "none",
      }}
    />
  );
};
