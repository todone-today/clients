import { ImageResponse } from "next/og";

// The picture a link to todone.today shows in WhatsApp, iMessage, X or Slack (and any website page without its own):
// the promise, big, with three sticky notes. Made once, when the site is built.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "todone: to-do lists, a calendar and goals. Todos. Done right.";

const ink = "#0b0b0b";
const NOTES: [string, string, number][] = [
  ["Call Rahul at 5", "#ff8fb1", -3],
  ["Gym, 4 times a week", "#d4f04a", 2],
  ["Movie night: my reward", "#8fe3e0", -1.5],
];

// The brand's display font (Big Shoulders, as on the site), fetched from Google Fonts when the image is made; the
// default font if that fails.
async function display(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@900")).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const font = await display();
  const heading = font ? "Display" : "sans-serif";
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 64, background: "#ffe066", color: ink, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 48, fontWeight: 900, fontFamily: heading }}>
          <div style={{ display: "flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", background: "#d4f04a", border: `5px solid ${ink}` }}>
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="square" />
            </svg>
          </div>
          todone
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 60, fontSize: 128, fontWeight: 900, lineHeight: 0.9, whiteSpace: "nowrap", textTransform: "uppercase", fontFamily: heading }}>
          <span>Todos.</span>
          <span>Done right.</span>
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 30, fontWeight: 700 }}>
          Lists, a calendar and goals. Private, and it works offline.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 26, width: 380 }}>
        {NOTES.map(([text, fill, turn]) => (
          <div
            key={text}
            style={{ display: "flex", padding: "26px 28px", background: fill, border: `5px solid ${ink}`, boxShadow: `10px 10px 0 ${ink}`, transform: `rotate(${turn}deg)`, fontSize: 30, fontWeight: 800 }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>,
    { ...size, fonts: font ? [{ name: "Display", data: font, weight: 900, style: "normal" }] : [] },
  );
}
