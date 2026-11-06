"use client";

// The hardware concepts in 3D, in todone's sticker style (flat colours, thick black outlines). Each one plays a little
// scene: the device spins in mid-air, its home pops in around it (a desk, a fridge, a backpack), and it glides into
// place. Then drag to turn the scene. Built in code with three.js, so the screen is drawn crisply in todone's own type.
// Loaded only when the hardware section is near; still (no motion) for people who ask for reduced motion.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

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

// What each device's screen says.
const SCREENS: Record<Place, { head: string; tasks: [string, boolean][]; wide: boolean }> = {
  desk: {
    head: "TODAY",
    wide: true,
    tasks: [
      ["Ship the pitch deck", false],
      ["Standup 10:00", false],
      ["Reply to Priya", true],
    ],
  },
  fridge: {
    head: "HOME",
    wide: false,
    tasks: [
      ["Milk and eggs", false],
      ["Pay electricity bill", false],
      ["Water the plants", true],
      ["Book the plumber", false],
    ],
  },
  bag: {
    head: "NEXT",
    wide: false,
    tasks: [
      ["Pick up charger", false],
      ["Call Mom 18:30", false],
      ["Gym", true],
    ],
  },
};

// The e-ink screen, drawn on a canvas: paper white, the checked-box logo, a condensed heading, square checkboxes.
function screenTexture(place: Place) {
  const { head, tasks, wide } = SCREENS[place];
  const W = wide ? 1024 : 640;
  const H = wide ? 640 : 860;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  const css = getComputedStyle(document.body);
  const display = css.getPropertyValue("--font-display").trim() || "Impact";
  const sans = css.getPropertyValue("--font-sans").trim() || "Helvetica";
  g.fillStyle = "#f4f1ea";
  g.fillRect(0, 0, W, H);
  const pad = W * 0.08;
  // Logo: a checked box and "todone".
  const lb = W * 0.055;
  g.lineWidth = lb * 0.18;
  g.strokeStyle = "#111";
  g.strokeRect(pad, pad, lb, lb);
  g.beginPath();
  g.moveTo(pad + lb * 0.2, pad + lb * 0.52);
  g.lineTo(pad + lb * 0.42, pad + lb * 0.74);
  g.lineTo(pad + lb * 0.82, pad + lb * 0.24);
  g.stroke();
  g.fillStyle = "#111";
  g.font = `900 ${lb * 1.05}px ${display}`;
  g.textBaseline = "middle";
  g.fillText("TODONE", pad + lb * 1.45, pad + lb * 0.55);
  // Heading.
  const hs = W * (wide ? 0.13 : 0.16);
  g.font = `900 ${hs}px ${display}`;
  g.textBaseline = "alphabetic";
  const hy = pad + lb + hs * 1.15;
  g.fillText(head, pad, hy);
  // Tasks.
  const ts = W * (wide ? 0.05 : 0.068);
  const gap = ts * 2.05;
  g.font = `700 ${ts}px ${sans}`;
  tasks.forEach(([t, done], i) => {
    const y = hy + gap * (i + 1.05);
    const b = ts * 0.95;
    g.lineWidth = ts * 0.13;
    if (done) g.fillRect(pad, y - b, b, b);
    else g.strokeRect(pad, y - b, b, b);
    g.fillStyle = done ? "#777" : "#111";
    g.fillText(t, pad + b * 1.6, y - b * 0.08);
    if (done) {
      const w = g.measureText(t).width;
      g.fillRect(pad + b * 1.6, y - b * 0.42, w, ts * 0.09);
    }
    g.fillStyle = "#111";
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: W / H };
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
    o.scale.set(1 + (2 * outline) / Math.max(s.x, 0.01), 1 + (2 * outline) / Math.max(s.y, 0.01), 1 + (2 * outline) / Math.max(s.z, 0.01));
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
  const { tex, aspect } = screenTexture(place);
  const h = place === "desk" ? 0.62 : place === "fridge" ? 0.82 : 0.4;
  const w = h * aspect;
  const t = place === "bag" ? 0.09 : place === "fridge" ? 0.035 : 0.06;
  const bezel = place === "bag" ? 0.045 : 0.035;
  const slab = box(w + bezel * 2, h + bezel * 2, t, place === "bag" ? 0.07 : 0.035, C.body, 0.018);
  g.add(slab);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.z = t / 2 + 0.002;
  g.add(screen);
  if (place === "desk") {
    // A lime tab on top and a slim stand behind.
    g.add(at(box(0.16, 0.025, 0.03, 0.01, C.lime, 0.012), w / 2 - 0.05, h / 2 + bezel + 0.012, 0));
    g.add(at(box(0.36, 0.55, 0.035, 0.015, C.body, 0.015), 0, -0.12, -0.17, 0, 0.55));
  } else if (place === "fridge") {
    g.add(at(box(0.03, h * 0.7, t * 1.3, 0.012, C.lime, 0.012), w / 2 + bezel + 0.012, 0, 0));
  } else {
    // A lime carabiner above the case.
    const ring = part(new THREE.TorusGeometry(0.075, 0.017, 10, 28), C.lime, 0.01);
    ring.scale.set(1, 1.5, 1);
    g.add(at(ring, 0, h / 2 + bezel + 0.1, 0));
    g.add(at(box(0.08, 0.04, t * 0.8, 0.015, C.body, 0.01), 0, h / 2 + bezel + 0.005, 0));
  }
  return g;
}

// Each device's home, and where the device lands in it.
function home(place: Place) {
  const g = new THREE.Group();
  const pieces: THREE.Object3D[] = [];
  const add = (o: THREE.Object3D) => (g.add(o), pieces.push(o), o);
  let land: { pos: THREE.Vector3; rot: THREE.Euler };
  if (place === "desk") {
    add(at(box(3.2, 0.12, 1.5, 0.04, C.butter), 0, -0.06, 0));
    for (const [x, z] of [
      [-1.45, -0.6],
      [1.45, -0.6],
      [-1.45, 0.6],
      [1.45, 0.6],
    ])
      add(at(box(0.09, 1.3, 0.09, 0.03, C.butter), x, -0.77, z));
    // Laptop, open.
    const lap = new THREE.Group();
    lap.add(at(box(1.0, 0.04, 0.68, 0.03, C.peri), 0, 0.02, 0));
    lap.add(at(box(1.0, 0.66, 0.035, 0.03, C.peri), 0, 0.33, -0.33, 0, -0.18));
    add(at(lap, -0.85, 0, -0.05, 0.25));
    // Mug and a plant.
    add(at(part(new THREE.CylinderGeometry(0.12, 0.11, 0.24, 24), C.cyan), 1.2, 0.12, 0.35));
    add(at(part(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 20), C.pink), 1.25, 0.1, -0.45));
    add(at(part(new THREE.SphereGeometry(0.2, 16, 12), C.lime), 1.25, 0.36, -0.45));
    land = { pos: new THREE.Vector3(0.35, 0.42, -0.05), rot: new THREE.Euler(-0.12, -0.3, 0) };
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

export default function Device3D({ place, label }: { place: Place; label: string }) {
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
    const dev = device(place);
    world.add(dev);
    // Framing per scene.
    const view = {
      desk: { cam: [0.4, 1.5, 6.0], look: [0, -0.2, 0] },
      fridge: { cam: [1.4, 0.5, 6.6], look: [0, -0.25, 0] },
      bag: { cam: [0.9, 0.5, 3.9], look: [-0.1, 0, 0] },
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
      if (fly >= 1) dev.position.y = land.pos.y + Math.sin(Math.min(t - 2.7, 0.6) * Math.PI * 3.3) * 0.02 * Math.max(0, 1 - (t - 2.7) / 0.6);
      return fly >= 1 && t > 3.3;
    };

    const frame = (now: number) => {
      raf = 0;
      if (t0 < 0) t0 = now;
      const t = still ? 10 : (now - t0) / 1000;
      const done = pose(t);
      // After landing: a gentle sway, unless someone is dragging.
      const sway = done && !dragging && !still ? Math.sin((now - t0) / 2600) * 0.12 : 0;
      world.rotation.y += (drag + sway - world.rotation.y) * 0.12;
      renderer.render(scene, camera);
      if (visible && !(still && !dragging && Math.abs(drag - world.rotation.y) < 0.001)) raf = requestAnimationFrame(frame);
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
  }, [place]);

  return <div ref={wrap} className="device3d" role="img" aria-label={label} />;
}
