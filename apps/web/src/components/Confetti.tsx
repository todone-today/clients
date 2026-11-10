"use client";

import { useState } from "react";
import s from "./Confetti.module.css";

// Paper confetti in the sticker colours, falling once. Inside a dialog it shows above the backdrop.
const CONFETTI = [
  "var(--lime)",
  "var(--pink)",
  "var(--cyan)",
  "var(--butter)",
  "var(--peri)",
  "var(--orange)",
];
export function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 48 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      fall: 1.6 + Math.random() * 1.2,
      spin: (Math.random() * 2 - 1) * 720,
      drift: (Math.random() * 2 - 1) * 90,
      w: 10 + Math.random() * 9,
      fill: CONFETTI[i % CONFETTI.length],
    })),
  );
  return (
    <div className={s.confetti} aria-hidden>
      {bits.map((b, i) => (
        <i
          key={i}
          style={
            {
              left: `${b.left}%`,
              width: b.w,
              height: b.w * 0.6,
              background: b.fill,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.fall}s`,
              "--spin": `${b.spin}deg`,
              "--drift": `${b.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
