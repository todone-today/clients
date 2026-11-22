// Share cards, drawn on this device (nothing is sent anywhere): a win (a goal reached, a reward claimed), progress
// (big numbers, optionally see-through to lay over a photo in a Story), and a week's recap with its identity badge.
// Bold and editorial, in todone's sticker colours, with the brand small at the foot. 3× resolution PNGs.
import type { Recap } from "@/lib/recap";

export type CardFormat = "story" | "square";
export type CardSpec =
  | { kind: "win"; eyebrow: string; title: string; line: string; grid: number[]; fill: string; overlay?: boolean }
  | {
      kind: "progress";
      title: string;
      big: string;
      label: string;
      frac: number;
      sub: string;
      fill: string;
      overlay: boolean;
      eyebrow?: string; // the moment: "Halfway there"; otherwise "In progress"
      weeks?: number[]; // the last 8 weeks, a square each
    }
  | { kind: "recap"; r: Recap; who?: string; fill?: string };

const W = 360;
const H: Record<CardFormat, number> = { story: 640, square: 360 };
export const SCALE = 3;
const INK = "#0b0b0b";
const CREAM = "#fff8ef";

// The page's own fonts (next/font gives them hashed names, kept in CSS variables).
function fonts() {
  const css = getComputedStyle(document.documentElement);
  return {
    display: css.getPropertyValue("--font-display").trim() || "Impact, sans-serif",
    sans: css.getPropertyValue("--font-sans").trim() || "system-ui, sans-serif",
  };
}
// The colour behind a CSS variable like "var(--lime)", as the canvas needs a real colour.
export const colour = (v: string) =>
  v.startsWith("var(") ? getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim() || v : v;

// Words broken into lines that fit `max` wide, at most `rows` (the last one ends with … if it ran over).
function lines(ctx: CanvasRenderingContext2D, text: string, max: number, rows: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= max || !cur) cur = next;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length > rows) {
    out.length = rows;
    out[rows - 1] = `${out[rows - 1].replace(/\s+\S*$/, "")}…`;
  }
  return out;
}

// A sticker: a filled box with a black edge and a hard shadow down-right.
function sticker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, shadow = 6) {
  ctx.fillStyle = INK;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x, y, w, h);
}

// The brand, small: a tick in a box and todone.today.
function brand(ctx: CanvasRenderingContext2D, f: ReturnType<typeof fonts>, x: number, y: number, light = false) {
  ctx.fillStyle = light ? CREAM : INK;
  ctx.strokeStyle = light ? CREAM : INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y - 11, 12, 12);
  ctx.beginPath();
  ctx.moveTo(x + 2.5, y - 5);
  ctx.lineTo(x + 5, y - 2.5);
  ctx.lineTo(x + 10, y - 9);
  ctx.stroke();
  ctx.font = `800 12px ${f.sans}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("todone.today", x + 18, y);
}

// Squares, filled for days (or weeks) with something done: the Wordle-style grid.
function grid(ctx: CanvasRenderingContext2D, cells: number[], x: number, y: number, size: number, perRow = 7, fill = INK) {
  cells.forEach((n, i) => {
    const cx = x + (i % perRow) * (size + 6);
    const cy = y + Math.floor(i / perRow) * (size + 6);
    ctx.fillStyle = n > 0 ? fill : CREAM;
    ctx.fillRect(cx, cy, size, size);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.strokeRect(cx, cy, size, size);
  });
}

export async function drawCard(canvas: HTMLCanvasElement, spec: CardSpec, format: CardFormat) {
  await document.fonts?.ready;
  const f = fonts();
  const h = H[format];
  canvas.width = W * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, W, h);
  ctx.textBaseline = "alphabetic";
  const pad = 28;
  const story = format === "story";

  if (spec.kind === "win" && spec.overlay) {
    // See-through, to lay over a photo: a sticker low on the card with the win on it, and the brand on a tab.
    const bw = W - pad * 2;
    ctx.font = `900 30px ${f.display}`;
    const rows = lines(ctx, spec.title.toUpperCase(), bw - 36, 3);
    const bh = 150 + rows.length * 32 + (spec.grid.length ? 40 : 0);
    const bx = pad;
    const by = h - bh - 90;
    sticker(ctx, bx, by, bw, bh, colour(spec.fill));
    ctx.fillStyle = INK;
    ctx.font = `800 12px ${f.sans}`;
    ctx.fillText(spec.eyebrow.toUpperCase(), bx + 18, by + 30);
    ctx.font = `900 72px ${f.display}`;
    ctx.fillText("DONE.", bx + 16, by + 98);
    ctx.font = `900 30px ${f.display}`;
    let y = by + 104;
    for (const l of rows) {
      y += 32;
      ctx.fillText(l, bx + 18, y);
    }
    if (spec.grid.length) grid(ctx, spec.grid, bx + 18, y + 16, 22, 8);
    ctx.fillStyle = CREAM;
    ctx.fillRect(bx, by + bh + 16, 118, 24);
    brand(ctx, f, bx + 6, by + bh + 33);
  }

  if (spec.kind === "win" && !spec.overlay) {
    ctx.fillStyle = colour(spec.fill);
    ctx.fillRect(0, 0, W, h);
    let y = story ? 120 : 64;
    ctx.fillStyle = INK;
    ctx.font = `800 13px ${f.sans}`;
    ctx.fillText(spec.eyebrow.toUpperCase(), pad, y);
    y += story ? 76 : 50;
    ctx.font = `900 ${story ? 84 : 58}px ${f.display}`;
    ctx.fillText("DONE.", pad, y);
    y += story ? 22 : 14;
    ctx.font = `900 ${story ? 38 : 28}px ${f.display}`;
    for (const l of lines(ctx, spec.title.toUpperCase(), W - pad * 2, story ? 4 : 2)) {
      y += story ? 40 : 30;
      ctx.fillText(l, pad, y);
    }
    if (spec.grid.length) {
      y += story ? 40 : 22;
      const size = story ? 34 : 22;
      grid(ctx, spec.grid, pad, y, size);
      y += Math.ceil(spec.grid.length / 7) * (size + 6);
    }
    ctx.font = `700 ${story ? 16 : 13}px ${f.sans}`;
    y += story ? 34 : 22;
    for (const l of lines(ctx, spec.line, W - pad * 2, 2)) {
      ctx.fillText(l, pad, y);
      y += 20;
    }
    brand(ctx, f, pad, h - 26);
  }

  if (spec.kind === "progress" && !spec.overlay) {
    // The whole card in the goal's colour: the moment, the goal, the number, the bar, the weeks, the brand.
    ctx.fillStyle = colour(spec.fill);
    ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = INK;
    const inner = W - pad * 2;
    let y = story ? 64 : 44;
    ctx.font = `800 13px ${f.sans}`;
    ctx.fillText((spec.eyebrow ?? "In progress").toUpperCase(), pad, y);
    ctx.font = `900 ${story ? 44 : 30}px ${f.display}`;
    for (const l of lines(ctx, spec.title.toUpperCase(), inner, story ? 3 : 2)) {
      y += story ? 44 : 30;
      ctx.fillText(l, pad, y);
    }
    // The number block sits low in a Story, right under the title in a square.
    const weeks = spec.weeks?.length ? spec.weeks : [];
    const cell = story ? (inner - 7 * 6) / 8 : 22;
    const foot = (story ? 44 : 36) + (weeks.length ? cell + (story ? 26 : 14) : 0); // brand and the weeks, from the bottom
    let by = h - foot - (story ? 210 : 100);
    ctx.font = `900 ${story ? 128 : 64}px ${f.display}`;
    ctx.fillText(spec.big, pad - 3, by);
    if (story) {
      by += 44; // clear of the big number's slash, which dips below the line
      ctx.font = `900 26px ${f.display}`;
      ctx.fillText(spec.label.toUpperCase(), pad, by);
    } else {
      const bigW = ctx.measureText(spec.big).width;
      ctx.font = `900 20px ${f.display}`;
      for (const [i, l] of lines(ctx, spec.label.toUpperCase(), inner - bigW - 14, 2).entries()) ctx.fillText(l, pad + bigW + 12, by - 24 + i * 20);
    }
    by += story ? 22 : 14;
    ctx.fillStyle = CREAM;
    ctx.fillRect(pad, by, inner, story ? 18 : 14);
    ctx.fillStyle = INK;
    ctx.fillRect(pad, by, inner * Math.max(0, Math.min(1, spec.frac)), story ? 18 : 14);
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, by, inner, story ? 18 : 14);
    by += story ? 44 : 32;
    ctx.font = `700 ${story ? 15 : 12}px ${f.sans}`;
    ctx.fillText(lines(ctx, spec.sub, inner, 1)[0] ?? "", pad, by);
    if (weeks.length) grid(ctx, weeks, pad, h - foot, cell, 8);
    brand(ctx, f, pad, h - (story ? 24 : 16));
  }

  if (spec.kind === "progress" && spec.overlay) {
    // See-through, to lay over a photo: only a sticker at the bottom, and the brand on its own small cream tab.
    const bw = W - pad * 2;
    const bh = story ? 230 : 210;
    const bx = pad;
    const by = story ? h - bh - 90 : (h - bh) / 2 - 14;
    sticker(ctx, bx, by, bw, bh, colour(spec.fill));
    ctx.fillStyle = INK;
    ctx.font = `800 12px ${f.sans}`;
    let y = by + 30;
    for (const l of lines(ctx, spec.title.toUpperCase(), bw - 36, 2)) {
      ctx.fillText(l, bx + 18, y);
      y += 16;
    }
    ctx.font = `900 84px ${f.display}`;
    ctx.fillText(spec.big, bx + 16, y + 68);
    ctx.font = `900 22px ${f.display}`;
    ctx.fillText(spec.label.toUpperCase(), bx + 18, y + 106); // clear of the big number's slash
    const barY = by + bh - 34;
    ctx.fillStyle = CREAM;
    ctx.fillRect(bx + 18, barY, bw - 36, 14);
    ctx.fillStyle = INK;
    ctx.fillRect(bx + 18, barY, (bw - 36) * Math.max(0, Math.min(1, spec.frac)), 14);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx + 18, barY, bw - 36, 14);
    ctx.fillStyle = CREAM;
    ctx.fillRect(bx, by + bh + 16, 118, 24);
    brand(ctx, f, bx + 6, by + bh + 33);
  }

  if (spec.kind === "recap") {
    const r = spec.r;
    ctx.fillStyle = colour(spec.fill ?? "var(--peri)");
    ctx.fillRect(0, 0, W, h);
    let y = story ? 96 : 50;
    ctx.fillStyle = INK;
    ctx.font = `800 13px ${f.sans}`;
    ctx.fillText(`${spec.who ? `${spec.who.toUpperCase()}'S ` : "MY "}${r.days === 7 ? "WEEK" : `${r.days} DAYS`} IN TODONE`, pad, y);
    y += story ? 18 : 10;
    ctx.font = `900 ${story ? 56 : 42}px ${f.display}`;
    for (const l of lines(ctx, r.badge.name.toUpperCase(), W - pad * 2, 2)) {
      y += story ? 56 : 42;
      ctx.fillText(l, pad, y);
    }
    ctx.font = `700 ${story ? 16 : 13}px ${f.sans}`;
    y += story ? 28 : 20;
    ctx.fillText(r.badge.line, pad, y);
    // Four numbers, two by two.
    const stats: [string, string][] = [
      [String(r.done), "done"],
      [String(r.xp), "XP earned"],
      [`${r.activeDays}/${r.days}`, "days active"],
      [r.best ? r.best.day.slice(0, 3).toUpperCase() : "—", "best day"],
    ];
    const tw = (W - pad * 2 - 12) / 2;
    const th = story ? 86 : 58;
    y += story ? 30 : 16;
    stats.forEach(([n, label], i) => {
      const x = pad + (i % 2) * (tw + 12);
      const ty = y + Math.floor(i / 2) * (th + 12);
      sticker(ctx, x, ty, tw, th, CREAM, 4);
      ctx.fillStyle = INK;
      ctx.font = `900 ${story ? 40 : 28}px ${f.display}`;
      ctx.fillText(n, x + 12, ty + (story ? 48 : 32));
      ctx.font = `700 ${story ? 12 : 10}px ${f.sans}`;
      ctx.fillText(label, x + 12, ty + th - 10);
    });
    if (story) {
      y += 2 * (th + 12) + 26;
      grid(ctx, r.perDay, pad, y, 36);
    }
    brand(ctx, f, pad, h - 26);
  }
}

export const cardBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((ok) => canvas.toBlob((b) => ok(b), "image/png"));
