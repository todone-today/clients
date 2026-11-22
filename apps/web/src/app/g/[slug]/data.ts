import { proxyHeaders, server } from "@/lib/server";

// A shared goal's public data (server actions/goalShares.ts view), for the page and its preview image.
export type Snap = {
  title: string;
  kind: "habit" | "outcome" | "target" | "daily";
  unit?: string;
  start?: number;
  target?: number;
  perWeek?: number;
  by?: string;
  current?: number;
  towards: number;
  thisWeek: number;
  weeks: number[];
  done?: number;
  total?: number;
  reached?: boolean;
  reward?: string;
};
export type Shared = {
  mode: "view" | "challenge";
  owner: { name: string; image: string | null };
  snapshot: Snap;
  people: { name: string; image: string | null; snapshot: Partial<Snap> }[];
  spots: number;
};

export async function shared(slug: string): Promise<Shared | null> {
  const r = await fetch(`${server()}/api/g/${encodeURIComponent(slug)}`, { cache: "no-store", headers: proxyHeaders() }).catch(
    () => null,
  );
  return r?.ok ? r.json() : null;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);
// The goal's headline number and what it means, the way its kind counts it.
export function headline(s: Snap): { big: string; label: string; frac: number } {
  const unit = s.unit ? ` ${s.unit}` : "";
  if (s.reached) return { big: "Done", label: "goal reached", frac: 1 };
  if (s.kind === "target")
    return { big: `${Math.round(s.towards * 100)}%`, label: `of the way to ${fmt(s.target ?? 0)}${unit}`, frac: s.towards };
  if (s.kind === "habit")
    return { big: `${s.thisWeek}/${s.perWeek ?? 1}`, label: "times this week", frac: s.thisWeek / (s.perWeek ?? 1) };
  if (s.kind === "daily")
    return { big: `${s.thisWeek}`, label: `day${s.thisWeek === 1 ? "" : "s"} this week at ${fmt(s.target ?? 0)}${unit}`, frac: s.thisWeek / 7 };
  return { big: `${s.done ?? 0}/${s.total ?? 0}`, label: "steps done", frac: s.towards };
}
export const kindLine = (s: Snap) =>
  s.kind === "habit"
    ? `${s.perWeek ?? 1}× a week`
    : s.kind === "daily"
      ? `${fmt(s.target ?? 0)}${s.unit ? ` ${s.unit}` : ""} every day`
      : s.kind === "target"
        ? `${fmt(s.start ?? 0)} → ${fmt(s.target ?? 0)}${s.unit ? ` ${s.unit}` : ""}`
        : "Milestones";
