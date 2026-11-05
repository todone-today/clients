import Image from "next/image";
import type { Shot as ShotData } from "@/lib/landing";
import s from "./landing.module.css";

// One image slot from lib/landing.ts: the picture when it has a source, otherwise a labelled placeholder of the
// same shape, so swapping in the real image never moves the layout. Concepts say so on the frame.
export function Shot({ shot, sizes, className = "" }: { shot: ShotData; sizes: string; className?: string }) {
  return (
    <figure
      className={`${s.shot} ${className}`}
      style={{ aspectRatio: shot.ratio }}
      data-concept={shot.concept || undefined}
    >
      {shot.src ? (
        <Image src={shot.src} alt={shot.alt} fill sizes={sizes} unoptimized={/^https?:/.test(shot.src)} />
      ) : (
        <div className={s.placeholder} role="img" aria-label={`${shot.label} (image coming)`}>
          <span>{shot.label}</span>
        </div>
      )}
      {shot.concept && <figcaption className={s.conceptTag}>Concept, not a product</figcaption>}
    </figure>
  );
}
