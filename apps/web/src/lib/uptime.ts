import { cacheLife } from "next/cache";

// Uptime history from UptimeRobot for the status page, read server-side with a read-only key
// (UPTIMEROBOT_API_KEY) and cached for 5 minutes. Only monitors named "todone: …" are shown; the account may hold
// other sites' monitors.
export type Day = { at: number; pct: number | null };
export type Monitor = { name: string; up: boolean; d30: number; d90: number; days: Day[] };
export type Incident = { name: string; at: number; seconds: number; reason: string };

const DAY = 86_400;

export async function uptime(): Promise<{ monitors: Monitor[]; incidents: Incident[] } | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key) return null;

  const today = Math.floor(Date.now() / 1000 / DAY) * DAY;
  const starts = Array.from({ length: 30 }, (_, i) => today - (29 - i) * DAY);
  const ranges = starts.map((s) => `${s}_${Math.min(s + DAY, Math.floor(Date.now() / 1000))}`).join("-");
  const r = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      api_key: key,
      format: "json",
      custom_uptime_ratios: "30-90",
      custom_uptime_ranges: ranges,
      logs: "1",
      logs_limit: "20",
    }),
  }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  if (j?.stat !== "ok") return null;

  type Raw = {
    friendly_name: string;
    status: number;
    create_datetime: number;
    custom_uptime_ratio: string;
    custom_uptime_ranges: string;
    logs?: { type: number; datetime: number; duration: number; reason?: { detail?: string } }[];
  };
  const ours = (j.monitors as Raw[]).filter((m) => m.friendly_name.startsWith("todone:"));
  const label = (n: string) => n.replace(/^todone:\s*/, "").replace(/^./, (c) => c.toUpperCase());

  return {
    monitors: ours.map((m) => {
      const [d30, d90] = m.custom_uptime_ratio.split("-").map(Number);
      const pcts = m.custom_uptime_ranges.split("-").map(Number);
      return {
        name: label(m.friendly_name),
        up: m.status === 2,
        d30,
        d90,
        // Days before the monitor existed have no data, not 100%.
        days: starts.map((at, i) => ({ at, pct: at + DAY <= m.create_datetime ? null : pcts[i] })),
      };
    }),
    incidents: ours
      .flatMap((m) =>
        (m.logs ?? [])
          .filter((l) => l.type === 1)
          .map((l) => ({ name: label(m.friendly_name), at: l.datetime, seconds: l.duration, reason: l.reason?.detail ?? "" })),
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, 10),
  };
}
