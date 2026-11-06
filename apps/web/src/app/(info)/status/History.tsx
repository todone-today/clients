import { uptime } from "@/lib/uptime";
import s from "../../(legal)/legal.module.css";

const date = (t: number) => new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const pct = (n: number) => `${n >= 99.995 ? "100" : n.toFixed(2)}%`;
const long = (sec: number) =>
  sec < 60 ? `${sec} s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${(sec / 3600).toFixed(1)} h`;

// The last 30 days, from outside: UptimeRobot checks the site and the API every 5 minutes.
export async function History() {
  const u = await uptime();
  if (!u || !u.monitors.length) return null;
  return (
    <section aria-labelledby="history">
      <h2 id="history">The last 30 days</h2>
      {u.monitors.map((m) => (
        <div key={m.name} className={s.uptime}>
          <p>
            <b>{m.name}</b> {pct(m.d30)} up over 30 days · {pct(m.d90)} over 90
          </p>
          <ol className={s.days} aria-label={`${m.name}, day by day`}>
            {m.days.map((d) => (
              <li
                key={d.at}
                data-level={d.pct === null ? "none" : d.pct >= 99.95 ? "up" : d.pct >= 95 ? "dip" : "down"}
                title={`${date(d.at)}: ${d.pct === null ? "not monitored yet" : pct(d.pct)}`}
              />
            ))}
          </ol>
        </div>
      ))}
      <h3>Recent incidents</h3>
      {u.incidents.length ? (
        <ul>
          {u.incidents.map((i) => (
            <li key={`${i.name}${i.at}`}>
              {date(i.at)}: {i.name} down for {long(i.seconds)}
              {i.reason && ` (${i.reason})`}
            </li>
          ))}
        </ul>
      ) : (
        <p>None recorded.</p>
      )}
      <p className={s.updated}>Checked from outside every 5 minutes by UptimeRobot; this section updates every 5 minutes.</p>
    </section>
  );
}
