import { NAME } from "@/lib/brand";
import s from "./Logo.module.css";

// The mark: a ticked box as a sticker, lime with a hard shadow. The shadow follows the theme.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className={s.mark} width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="6" y="6" width="24" height="24" style={{ fill: "var(--shadow)" }} />
      <rect x="2" y="2" width="24" height="24" fill="#d4f04a" stroke="#0b0b0b" strokeWidth="2.5" />
      <path d="M7.5 14.5l4.5 4.5 8.5-9.5" fill="none" stroke="#0b0b0b" strokeWidth="3.4" strokeLinecap="square" />
    </svg>
  );
}

// Mark and wordmark together, for headers.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className={s.logo}>
      <Mark size={size} />
      <span className="display">{NAME}</span>
    </span>
  );
}
