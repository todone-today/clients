// How many launch-price spots are left (the server counts real, paid purchases): a line and a bar that empties as
// they go, red for the last few. Shown on the pricing cards and in the app's plan picker.
import s from "./LaunchSpots.module.css";

export type Launch = { left: number; total: number };

export function LaunchSpots({ launch, className = "" }: { launch: Launch; className?: string }) {
  const { left, total } = launch;
  if (!left)
    return (
      <p className={`${s.spots} ${className}`} data-gone>
        All {total} launch spots are taken. Thank you, early backers.
      </p>
    );
  return (
    <p className={`${s.spots} ${className}`} data-low={left <= 10 || undefined}>
      <span>
        {left <= 10 ? "Only " : ""}
        <b>
          {left} of {total}
        </b>{" "}
        launch-price spots left
      </span>
      <span className={s.bar} role="meter" aria-label="Launch-price spots left" aria-valuemin={0} aria-valuemax={total} aria-valuenow={left}>
        <i style={{ transform: `scaleX(${left / total})` }} />
      </span>
    </p>
  );
}
