// A week (or month) of someone's wins, summed up for a shareable recap, with an identity that fits how they actually
// worked ("The 6 AM Finisher"). Pure: it reads the XP log, and the time zone of the device it runs on.
import type { Win } from "@todone/sdk/goals";

export type Recap = {
  days: number; // the period's length
  done: number; // tasks and check-ins finished
  xp: number; // earned (claims don't count against it)
  activeDays: number; // days with at least one thing done
  best: { day: string; n: number } | null; // the busiest day, by weekday name
  claimed: number; // rewards claimed
  perDay: number[]; // things done each day, oldest first (for the grid)
  badge: { name: string; line: string };
};

const DAY = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The badge: the first that fits, most distinctive first. Each needs enough done to mean something.
function badgeFor(earned: Win[], activeDays: number, days: number) {
  const n = earned.length;
  const share = (f: (d: Date) => boolean) => (n ? earned.filter((w) => f(new Date(w.at))).length / n : 0);
  if (n >= 5 && share((d) => d.getHours() < 9) >= 0.4) return { name: "The 6 AM Finisher", line: "Most of it done before 9." };
  if (n >= 5 && share((d) => d.getHours() >= 21) >= 0.4) return { name: "The Night Owl", line: "Most of it done after 9 at night." };
  if (n >= 5 && share((d) => d.getDay() === 0 || d.getDay() === 6) >= 0.5) return { name: "Weekend Warrior", line: "The weekend is when it happens." };
  if (activeDays >= Math.min(days, 7) && days >= 7) return { name: "Unbreakable", line: "Something done every single day." };
  if (n >= 20) return { name: "The Closer", line: `${n} things finished.` };
  if (activeDays >= Math.ceil(days * 0.7)) return { name: "Steady Hand", line: `Showed up ${activeDays} of ${days} days.` };
  if (n >= 1) return { name: "Off the Mark", line: "Started. That's the hard part." };
  return { name: "Fresh Page", line: "A new week to fill." };
}

// The `days` days up to and including `now`'s day.
export function recap(wins: Win[], now: Date, days = 7): Recap {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const start = end.getTime() - days * DAY;
  const inside = wins.filter((w) => w.at >= start && w.at < end.getTime());
  const earned = inside.filter((w) => !w.spend && w.xp > 0);
  const perDay = Array.from({ length: days }, (_, i) =>
    earned.filter((w) => w.at >= start + i * DAY && w.at < start + (i + 1) * DAY).length,
  );
  const activeDays = perDay.filter((n) => n > 0).length;
  const top = perDay.reduce((b, n, i) => (n > perDay[b] ? i : b), 0);
  return {
    days,
    done: earned.length,
    xp: earned.reduce((n, w) => n + w.xp, 0),
    activeDays,
    best: perDay[top] ? { day: WEEKDAYS[new Date(start + top * DAY + DAY / 2).getDay()], n: perDay[top] } : null,
    claimed: inside.filter((w) => w.spend).length,
    perDay,
    badge: badgeFor(earned, activeDays, days),
  };
}
