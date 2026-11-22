import { ImageResponse } from "next/og";
import { headline, kindLine, shared } from "./data";

// The card a shared goal's link shows in WhatsApp, iMessage or X: whose goal, what it is, how far along, and the
// last 8 weeks as squares. The brand stays small.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A goal shared from todone";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = await shared((await params).slug);
  const ink = "#0b0b0b";
  if (!g)
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#ffe066", fontSize: 72, fontWeight: 900 }}>
        todone
      </div>,
      size,
    );
  const s = g.snapshot;
  const h = headline(s);
  const fill = s.reached ? "#d4f04a" : "#ffe066";
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 64, background: fill, color: ink, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
        {g.owner.name} {s.reached ? "reached this goal" : g.mode === "challenge" ? "is doing this, join in" : "is working on"}
      </div>
      <div style={{ display: "flex", marginTop: 18, fontSize: s.title.length > 40 ? 64 : 86, fontWeight: 900, lineHeight: 1, textTransform: "uppercase", letterSpacing: -1 }}>
        {s.title.length > 70 ? `${s.title.slice(0, 68)}…` : s.title}
      </div>
      <div style={{ display: "flex", marginTop: 14, fontSize: 28, fontWeight: 700, opacity: 0.75 }}>{kindLine(s)}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 128, fontWeight: 900, lineHeight: 1 }}>{h.big}</div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>{h.label}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {s.weeks.map((n, i) => (
            <div key={i} style={{ display: "flex", width: 44, height: 44, border: `5px solid ${ink}`, background: n > 0 ? ink : "#fff8ef" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 26, fontSize: 24, fontWeight: 800 }}>todone.today</div>
    </div>,
    size,
  );
}
