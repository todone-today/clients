"use client";

// The hardware concepts in 3D, in todone's sticker style (flat colours, thick black outlines). Each one plays a little
// scene: the device spins in mid-air, its home pops in around it (a desk, a fridge, a backpack), and it glides into
// place. Then drag to turn the scene. Built in code with three.js, so the screen is drawn crisply in todone's own type.
// Loaded only when the hardware section is near; still (no motion) for people who ask for reduced motion.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { onHero } from "@/lib/hero-sync";

export type Place = "desk" | "fridge" | "bag";

const C = {
  ink: 0x0b0b0b,
  body: 0x1c1c1c,
  lime: 0xd4f04a,
  butter: 0xf8dc85,
  pink: 0xf2a7c6,
  cyan: 0x45dfea,
  peri: 0x9ba6ff,
  cream: 0xfff8ef,
  orange: 0xff7a3d,
};

// What each device's screen says. Desk and bag follow the homepage's notes once they're in (see hero-sync).
type Line = { t: string; done: boolean; tag?: string; fill?: string };
const SCREENS: Record<Place, { head: string; tasks: Line[]; wide: boolean }> = {
  desk: {
    head: "TODAY",
    wide: true,
    tasks: [
      { t: "Ship the pitch deck", done: false, tag: "2h", fill: "butter" },
      { t: "Standup", done: false, tag: "10:00", fill: "pink" },
      { t: "Reply to Priya", done: true, fill: "cyan" },
      { t: "Stretch", done: false, tag: "15m", fill: "lime" },
    ],
  },
  fridge: {
    head: "HOME",
    wide: false,
    tasks: [
      { t: "Milk and eggs", done: false },
      { t: "Pay electricity bill", done: false, tag: "Fri" },
      { t: "Water the plants", done: true },
      { t: "Book the plumber", done: false },
    ],
  },
  bag: {
    head: "NEXT",
    wide: false,
    tasks: [
      { t: "Pick up charger", done: false },
      { t: "Call Mom 18:30", done: false },
      { t: "Gym", done: true },
    ],
  },
};
// Colour e-ink: the note colours, a touch softer than on screen.
const INK: Record<string, string> = {
  butter: "#f6dc8c",
  pink: "#f2b0cb",
  cyan: "#7fe0ea",
  lime: "#d9ef6a",
  peri: "#b3baff",
  orange: "#ffa36e",
};

// The e-ink screen, drawn on a canvas. The desk's is the full app at a glance: status bar (sync, battery, date),
// TODAY with progress, tasks as coloured notes with their stickers, and what's next with the week. The fridge and
// the bag show a plainer list.
function screenTexture(place: Place) {
  const { head, wide } = SCREENS[place];
  const W = wide ? 1024 : 640;
  const H = wide ? 768 : 860;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const check = (x: number, y: number, s: number, done: boolean) => {
    g.lineWidth = s * 0.13;
    g.strokeStyle = "#111";
    g.fillStyle = "#fffdf6";
    g.fillRect(x, y, s, s);
    g.strokeRect(x, y, s, s);
    if (!done) return;
    g.lineWidth = s * 0.17;
    g.beginPath();
    g.moveTo(x + s * 0.18, y + s * 0.52);
    g.lineTo(x + s * 0.42, y + s * 0.78);
    g.lineTo(x + s * 0.9, y + s * 0.14);
    g.stroke();
  };
  const pill = (x: number, y: number, text: string, size: number, sans: string) => {
    g.font = `700 ${size}px ${sans}`;
    const w = g.measureText(text).width + size * 0.9;
    g.fillStyle = "#fffdf6";
    g.lineWidth = size * 0.12;
    g.beginPath();
    g.roundRect(x, y - size * 0.95, w, size * 1.35, size * 0.35);
    g.fill();
    g.stroke();
    g.fillStyle = "#111";
    g.fillText(text, x + size * 0.45, y);
    return w;
  };

  const draw = (tasks: Line[]) => {
    const css = getComputedStyle(document.body);
    const display = css.getPropertyValue("--font-display").trim() || "Impact";
    const sans = css.getPropertyValue("--font-sans").trim() || "Helvetica";
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#f6f2e6";
    g.fillRect(0, 0, W, H);
    const pad = W * 0.06;
    const lb = W * (wide ? 0.04 : 0.055);
    // Logo.
    check(pad, pad, lb, true);
    g.fillStyle = "#111";
    g.font = `800 ${lb * 1.05}px ${sans}`;
    g.fillText("todone", pad + lb * 1.35, pad + lb * 0.88);
    // Status, right: synced, battery, date.
    const day = new Date()
      .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
      .replace(",", "");
    g.font = `700 ${lb * 0.78}px ${sans}`;
    g.textAlign = "right";
    let rx = W - pad;
    g.fillText(day, rx, pad + lb * 0.85);
    rx -= g.measureText(day).width + lb * 0.7;
    if (wide) {
      // Battery.
      const bw = lb * 1.3;
      g.lineWidth = lb * 0.1;
      g.strokeRect(rx - bw, pad + lb * 0.2, bw, lb * 0.65);
      g.fillRect(rx - bw + lb * 0.12, pad + lb * 0.32, bw * 0.62, lb * 0.41);
      g.fillRect(rx + lb * 0.02, pad + lb * 0.38, lb * 0.1, lb * 0.3);
      rx -= bw + lb * 0.7;
      // Synced.
      g.fillText("Synced", rx, pad + lb * 0.85);
      const sw = g.measureText("Synced").width;
      g.beginPath();
      g.fillStyle = "#3aa65a";
      g.arc(rx - sw - lb * 0.4, pad + lb * 0.55, lb * 0.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
    }
    g.textAlign = "left";
    // Heading, with progress beside it on the desk.
    const hs = W * (wide ? 0.1 : 0.15);
    const hy = pad + lb + hs * 1.05;
    g.font = `900 ${hs}px ${display}`;
    g.fillText(head, pad, hy);
    const done = tasks.filter((x) => x.done).length;
    if (wide) {
      const px = pad + g.measureText(head).width + lb * 1.2;
      g.font = `700 ${lb * 0.85}px ${sans}`;
      g.fillText(`${done} of ${tasks.length} done`, px, hy - hs * 0.42);
      const bw = W * 0.2;
      g.lineWidth = lb * 0.1;
      g.strokeRect(px, hy - hs * 0.28, bw, lb * 0.38);
      g.fillRect(px, hy - hs * 0.28, (bw * done) / Math.max(tasks.length, 1), lb * 0.38);
    }
    // Tasks.
    const ts = W * (wide ? 0.038 : 0.06);
    const rowH = wide ? ts * 2.15 : ts * 2;
    const top = hy + ts * (wide ? 0.9 : 1.3);
    const shown = tasks.slice(0, wide ? 4 : 4);
    shown.forEach((x, i) => {
      const y = top + i * (rowH + (wide ? ts * 0.35 : 0));
      const b = ts * 1.05;
      if (wide) {
        // A coloured note strip, like the board.
        g.fillStyle = INK[x.fill ?? ["butter", "pink", "cyan", "lime"][i % 4]] ?? INK.butter;
        g.lineWidth = ts * 0.11;
        g.beginPath();
        g.roundRect(pad, y, W - pad * 2, rowH, ts * 0.15);
        g.fill();
        g.stroke();
      }
      const cy = wide ? y + (rowH - b) / 2 : y;
      check(pad + (wide ? ts * 0.55 : 0), cy, b, x.done);
      g.fillStyle = "#111";
      g.font = `700 ${ts}px ${sans}`;
      const tx = pad + b + (wide ? ts * 1.15 : ts * 0.6);
      const by = cy + b * 0.82;
      g.fillText(x.t, tx, by);
      const w = g.measureText(x.t).width;
      if (x.done) g.fillRect(tx, by - ts * 0.33, w, ts * 0.1);
      if (x.tag) pill(tx + w + ts * 0.6, by, x.tag, ts * 0.72, sans);
    });
    // Desk footer: what's next, and the week.
    if (wide) {
      const fy = H - pad * 0.95;
      const next = tasks.find((x) => !x.done && x.tag && /\d:\d/.test(x.tag)) ?? tasks.find((x) => !x.done);
      g.font = `700 ${lb * 0.85}px ${sans}`;
      g.fillStyle = "#111";
      if (next) g.fillText(`Next: ${next.t}${next.tag && /\d:\d/.test(next.tag) ? ` at ${next.tag}` : ""}`, pad, fy);
      const days = ["M", "T", "W", "T", "F", "S", "S"];
      const today = (new Date().getDay() + 6) % 7;
      const ds = lb * 0.95;
      days.forEach((d, i) => {
        const x = W - pad - (7 - i) * ds * 1.25 + ds * 0.25;
        if (i === today) {
          g.fillRect(x - ds * 0.1, fy - ds * 0.82, ds, ds);
          g.fillStyle = "#f6f2e6";
        }
        g.font = `800 ${lb * 0.7}px ${sans}`;
        g.fillText(d, x + ds * 0.2, fy - ds * 0.12);
        g.fillStyle = "#111";
      });
    }
    tex.needsUpdate = true;
  };
  draw(SCREENS[place].tasks);
  return { tex, aspect: W / H, draw };
}

// Cel-shaded colour with a thick black outline (an inverted hull), like todone's stickers.
const ramp = (() => {
  let t: THREE.DataTexture | null = null;
  return () => {
    if (t) return t;
    t = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 220, 220, 220, 255, 255, 255, 255, 255]), 3, 1);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  };
})();
const outlineMat = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
function part(geo: THREE.BufferGeometry, color: number, outline = 0.025) {
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, gradientMap: ramp() }));
  if (outline) {
    geo.computeBoundingBox();
    const s = new THREE.Vector3();
    geo.boundingBox!.getSize(s);
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.set(
      1 + (2 * outline) / Math.max(s.x, 0.01),
      1 + (2 * outline) / Math.max(s.y, 0.01),
      1 + (2 * outline) / Math.max(s.z, 0.01),
    );
    m.add(o);
  }
  return m;
}
const box = (w: number, h: number, d: number, r = 0.04, color: number = C.cream, outline = 0.025) =>
  part(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), color, outline);
const at = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
};

// The device: a matte black slab with the screen on its face, a lime detail, and what holds it (stand, magnets, clip).
function device(place: Place) {
  const g = new THREE.Group();
  const { tex, aspect, draw } = screenTexture(place);
  const h = place === "desk" ? 1.25 : place === "fridge" ? 0.82 : 0.4;
  const w = h * aspect;
  const t = place === "bag" ? 0.09 : place === "fridge" ? 0.035 : 0.07;
  const bezel = place === "bag" ? 0.045 : place === "desk" ? 0.085 : 0.035;
  const slab = box(w + bezel * 2, h + bezel * 2, t, place === "bag" ? 0.07 : place === "desk" ? 0.1 : 0.035, C.body, 0.02);
  g.add(slab);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.z = t / 2 + 0.002;
  g.add(screen);
  if (place === "desk") {
    // A lime tab on the left edge, and an origami folio stand folded into a triangle behind.
    g.add(at(box(0.06, 0.26, t * 1.15, 0.02, C.lime, 0.014), -(w / 2 + bezel + 0.02), 0.12, 0));
    const fold = new THREE.Shape();
    const H2 = h / 2 + bezel;
    fold.moveTo(0, -H2);
    fold.lineTo(-0.55, -H2);
    fold.lineTo(0, 0.05);
    fold.closePath();
    const stand = part(new THREE.ExtrudeGeometry(fold, { depth: w * 0.8, bevelEnabled: false }), 0x2b2b2b, 0.015);
    stand.rotation.y = -Math.PI / 2;
    stand.position.set(w * 0.4, 0, -t / 2);
    g.add(stand);
  } else if (place === "fridge") {
    g.add(at(box(0.03, h * 0.7, t * 1.3, 0.012, C.lime, 0.012), w / 2 + bezel + 0.012, 0, 0));
  } else {
    // A lime carabiner above the case.
    const ring = part(new THREE.TorusGeometry(0.075, 0.017, 10, 28), C.lime, 0.01);
    ring.scale.set(1, 1.5, 1);
    g.add(at(ring, 0, h / 2 + bezel + 0.1, 0));
    g.add(at(box(0.08, 0.04, t * 0.8, 0.015, C.body, 0.01), 0, h / 2 + bezel + 0.005, 0));
  }
  return { group: g, draw };
}

// Each device's home, and where the device lands in it.
function home(place: Place) {
  const g = new THREE.Group();
  const pieces: THREE.Object3D[] = [];
  const add = (o: THREE.Object3D) => (g.add(o), pieces.push(o), o);
  let land: { pos: THREE.Vector3; rot: THREE.Euler };
  if (place === "desk") {
    const DESK = 0xf7b8d2;
    const PAD = 0x9fd3f2;
    add(at(box(16, 0.12, 11, 0.04, DESK, 0), 0, -0.06, -1.5));
    add(at(box(3.6, 0.03, 1.9, 0.1, PAD, 0.015), 1.1, 0.015, 0.75));
    // A pastel mechanical keyboard on the pad.
    const kb = new THREE.Group();
    kb.add(at(box(2.1, 0.09, 0.78, 0.07, 0xe6defa, 0.018), 0, 0.045, 0));
    const KEYS = [0xfff4f8, 0xf6c6dd, 0xc8d4ff, 0xbdeedd, 0xffe49e, 0xffb7a8, 0xd9c8ff];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 14; c++) {
        if (r === 4 && c > 3 && c < 10) continue;
        const key = box(0.118, 0.06, 0.112, 0.025, KEYS[(r * 5 + c * 3) % KEYS.length], 0.008);
        kb.add(at(key, -0.9 + c * 0.138, 0.12, -0.27 + r * 0.135));
      }
    kb.add(at(box(0.8, 0.06, 0.112, 0.025, 0xffe066, 0.008), 0.0, 0.12, -0.27 + 4 * 0.135));
    add(at(kb, 1.25, 0.03, 0.95, -0.28));
    // A pastel laptop, open, back left.
    const lap = new THREE.Group();
    lap.add(at(box(1.5, 0.05, 1.0, 0.05, 0xcfeaf6, 0.018), 0, 0.025, 0));
    lap.add(at(box(1.5, 1.0, 0.04, 0.05, 0xd9d0f7, 0.018), 0, 0.5, -0.5, 0, -0.32));
    add(at(lap, -1.85, 0, -0.75, 0.5));
    // A takeaway cup with a lid, front left.
    add(at(part(new THREE.CylinderGeometry(0.23, 0.17, 0.66, 28), 0xf3a3bf), -1.95, 0.33, 1.05));
    add(at(part(new THREE.CylinderGeometry(0.255, 0.245, 0.08, 28), 0xf9c7d8), -1.95, 0.7, 1.05));
    add(at(part(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20), 0xf3a3bf, 0.01), -1.95, 0.75, 1.05));
    // A spiky plant in a terracotta pot, back right.
    const plant = new THREE.Group();
    plant.add(at(part(new THREE.CylinderGeometry(0.3, 0.23, 0.42, 24), 0xe07b4c), 0, 0.21, 0));
    plant.add(at(part(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 24), 0xea9064), 0, 0.42, 0));
    for (let i = 0; i < 8; i++) {
      const a2 = (i / 8) * Math.PI * 2;
      const leaf = part(new THREE.ConeGeometry(0.06, 0.75, 6), i % 2 ? 0x56b86a : 0x3f9e57, 0.012);
      leaf.position.set(Math.cos(a2) * 0.1, 0.78, Math.sin(a2) * 0.1);
      leaf.rotation.set(Math.sin(a2) * 0.55, 0, -Math.cos(a2) * 0.55);
      plant.add(leaf);
    }
    plant.add(at(part(new THREE.ConeGeometry(0.06, 0.85, 6), 0x56b86a, 0.012), 0, 0.85, 0));
    add(at(plant, 2.4, 0, -1.2));
    // An earbuds case.
    add(at(box(0.44, 0.22, 0.34, 0.1, 0xffffff, 0.015), 2.75, 0.11, 0.0, -0.3));
    land = { pos: new THREE.Vector3(0.05, 0.82, -0.55), rot: new THREE.Euler(-0.18, -0.2, 0) };
  } else if (place === "fridge") {
    add(at(box(1.35, 2.9, 1.0, 0.08, C.cyan), 0, -0.25, -0.5));
    add(at(box(1.3, 0.03, 0.02, 0.01, C.ink, 0), 0, 0.55, 0.005));
    add(at(box(0.07, 0.6, 0.08, 0.03, C.cream), 0.55, 0.9, 0.05));
    add(at(box(0.07, 0.9, 0.08, 0.03, C.cream), 0.55, -0.1, 0.05));
    // A few magnets.
    add(at(box(0.12, 0.12, 0.04, 0.03, C.pink), -0.45, -0.25, 0.02, 0, 0, 0.3));
    add(at(box(0.14, 0.1, 0.04, 0.03, C.butter), -0.2, -0.45, 0.02, 0, 0, -0.2));
    add(at(box(0.1, 0.1, 0.04, 0.05, C.lime), 0.2, -0.3, 0.02));
    land = { pos: new THREE.Vector3(-0.1, 0.05, 0.04), rot: new THREE.Euler(0, 0, 0) };
  } else {
    // A backpack: body, front pocket, top handle, a shoulder strap with a loop.
    add(at(box(1.15, 1.45, 0.55, 0.22, C.pink), 0, 0, -0.3));
    add(at(box(0.85, 0.55, 0.22, 0.14, C.orange), 0, -0.35, 0.02));
    add(at(box(0.7, 0.03, 0.03, 0.01, C.ink, 0), 0, -0.13, 0.14));
    const handle = part(new THREE.TorusGeometry(0.16, 0.035, 10, 24, Math.PI), C.ink, 0.01);
    add(at(handle, 0, 0.72, -0.3));
    add(at(box(0.16, 1.2, 0.05, 0.03, C.ink, 0.012), -0.38, 0.05, 0.0, 0, 0, 0.06));
    add(at(box(0.2, 0.06, 0.06, 0.02, C.lime, 0.01), -0.4, 0.35, 0.03));
    land = { pos: new THREE.Vector3(-0.4, 0.02, 0.1), rot: new THREE.Euler(0, 0.15, 0.08) };
  }
  return { group: g, pieces, land };
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const back = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

// `scroll`: when set (0–1 through this device's part of the section), scrolling drives the scene instead of the
// clock: the first half spins it in and lands it, the second half turns the scene.
export default function Device3D({
  place,
  label,
  scroll,
}: {
  place: Place;
  label: string;
  scroll?: { current: number | null };
}) {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL: the frame stays empty but labelled
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(2, 4, 3);
    scene.add(sun);

    const world = new THREE.Group();
    scene.add(world);
    const { group, pieces, land } = home(place);
    world.add(group);
    const { group: dev, draw } = device(place);
    world.add(dev);
    // Framing per scene.
    const view = {
      desk: { cam: [0.6, 3.3, 4.7], look: [0.25, 0.35, -0.2] },
      fridge: { cam: [1.6, 0.6, 7.4], look: [0, -0.25, 0] },
      bag: { cam: [1.1, 0.6, 4.6], look: [-0.1, 0, 0] },
    }[place];
    camera.position.set(...(view.cam as [number, number, number]));
    camera.lookAt(...(view.look as [number, number, number]));

    // The scene: 0–1.3s the device spins in mid-air; 1.1–1.9s its home pops in; 1.7–2.7s it glides into place.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = new THREE.Vector3(...(view.look as [number, number, number])).add(new THREE.Vector3(0, 0.25, 0.9));
    let t0 = -1;
    let drag = 0;
    let dragging = false;
    let lastX = 0;
    let visible = false;
    let raf = 0;

    const pose = (t: number) => {
      const spin = clamp(t / 1.3);
      const pop = clamp((t - 1.1) / 0.8);
      const fly = clamp((t - 1.7) / 1.0);
      pieces.forEach((p, i) => p.scale.setScalar(Math.max(0.001, back(clamp(pop * 1.4 - i * 0.06)))));
      const f = ease(fly);
      dev.position.lerpVectors(start, land.pos, f);
      dev.scale.setScalar(THREE.MathUtils.lerp(1.25, 1, f) * (fly > 0 && fly < 1 ? 1 : 1));
      dev.rotation.set(
        THREE.MathUtils.lerp(0.15, land.rot.x, f),
        THREE.MathUtils.lerp(-Math.PI * 2 * (1 - ease(spin)) + 0.4, land.rot.y, f),
        THREE.MathUtils.lerp(0, land.rot.z, f),
      );
      // A small settle once it lands.
      if (fly >= 1)
        dev.position.y =
          land.pos.y + Math.sin(Math.min(t - 2.7, 0.6) * Math.PI * 3.3) * 0.02 * Math.max(0, 1 - (t - 2.7) / 0.6);
      return fly >= 1 && t > 3.3;
    };

    const frame = (now: number) => {
      raf = 0;
      if (t0 < 0) t0 = now;
      const s = scroll?.current;
      const scrolled = typeof s === "number" && !still;
      const t = still ? 10 : scrolled ? Math.min(s / 0.55, 1) * 3.3 : (now - t0) / 1000;
      const done = pose(t);
      // After landing: scrolling on turns the scene; without scroll, a gentle sway. Dragging adds to either.
      const turn = scrolled
        ? THREE.MathUtils.lerp(-0.45, 0.45, Math.min(Math.max((s - 0.55) / 0.45, 0), 1))
        : done && !dragging && !still
          ? Math.sin((now - t0) / 2600) * 0.12
          : 0;
      world.rotation.y += (drag + turn - world.rotation.y) * 0.12;
      renderer.render(scene, camera);
      if (visible && (scrolled || !(still && !dragging && Math.abs(drag - world.rotation.y) < 0.001)))
        raf = requestAnimationFrame(frame);
    };
    const go = () => !raf && (raf = requestAnimationFrame(frame));

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      go();
    };
    // Desk and bag show the homepage's notes, live: tick one up top and the screen follows. (The fridge keeps its
    // household list.)
    const unsync =
      place === "fridge"
        ? () => {}
        : onHero((ts) => {
            const list = ts.map((x): Line => ({ t: x.title, done: x.done, tag: x.tag, fill: x.fill }));
            draw(place === "bag" ? [...list.filter((x) => !x.done), ...list.filter((x) => x.done)].slice(0, 3) : list);
            go();
          });
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) go();
    });
    io.observe(el);

    // Drag sideways to turn the scene (vertical swipes still scroll the page).
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      drag = THREE.MathUtils.clamp(drag + (e.clientX - lastX) * 0.008, -1.2, 1.2);
      lastX = e.clientX;
      go();
    };
    const up = () => void (dragging = false);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    return () => {
      cancelAnimationFrame(raf);
      unsync();
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.Material & { map?: THREE.Texture };
          m.map?.dispose();
          if (m !== outlineMat) m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [place, scroll]);

  return <div ref={wrap} className="device3d" role="img" aria-label={label} />;
}
