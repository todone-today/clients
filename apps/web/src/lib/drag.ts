"use client";

// Drag and drop on pointer events, so it works the same with mouse, touch and pen in every browser
// (HTML5 drag won't drag buttons in some browsers and never works on touch).
// Mouse and pen start dragging after a small move; touch after a short hold, so swipes still scroll.
import { useEffect, useRef } from "react";

// A task drag carries every selected task; `id` is the one under the pointer.
export type Payload =
  | { kind: "task"; listId: string; id: string; ids: string[] }
  | { kind: "idea"; id: string; ids: string[] }
  | { kind: "sticker"; key: string }
  | { kind: "list"; id: string }
  // Goals and rewards, reordered by dragging.
  | { kind: "goal"; id: string }
  | { kind: "reward"; id: string }
  // A suggestion on Ask todone's results board, before it's added.
  | { kind: "draft"; id: string }
  // The landing page's demo pieces (e.g. a block on the week strip).
  | { kind: "demo"; id: string };
export type At = { x: number; y: number; el: HTMLElement };
type Target = {
  accept: (p: Payload, arg: string) => boolean;
  drop: (p: Payload, arg: string, at: At) => void;
  // Optional: where on the target the drop would land ("before", "after", "inside"); shown as data-over.
  where?: (p: Payload, arg: string, at: At) => string;
  // Optional: the pointer left the target (or the drag ended), e.g. to hide a preview.
  leave?: () => void;
};

// Which part of an element the pointer is on: the first or last quarter along an axis, or the middle.
export function placeOn(at: At, axis: "x" | "y", middle = true): "before" | "after" | "inside" {
  const r = at.el.getBoundingClientRect();
  const f = axis === "x" ? (at.x - r.left) / r.width : (at.y - r.top) / r.height;
  if (!middle) return f < 0.5 ? "before" : "after";
  return f < 0.25 ? "before" : f > 0.75 ? "after" : "inside";
}

const targets = new Map<string, { current: Target }>();
let current: Payload | null = null;

// Registers a family of drop targets; returns props to spread on each, keyed by `arg`.
export function useDrop(scope: string, target: Target) {
  const ref = useRef(target);
  useEffect(() => {
    ref.current = target;
  });
  useEffect(() => {
    targets.set(scope, ref);
    return () => void targets.delete(scope);
  }, [scope]);
  return (arg: string) => ({ "data-drop": `${scope}|${arg}` });
}

function targetAt(x: number, y: number) {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
  if (!el || !current) return null;
  const [scope, arg] = el.dataset.drop!.split("|");
  const box = targets.get(scope);
  const t = box?.current;
  // `box` is stable for a target's lifetime; `t` is replaced on every render of its component.
  return box && t && t.accept(current, arg) ? { el, t, arg, box } : null;
}

// The page (or a scrolling box under the pointer) scrolls while a drag is held near its edge.
const EDGE = 64;
function scroller(x: number, y: number): HTMLElement | null {
  for (let el = document.elementFromPoint(x, y) as HTMLElement | null; el; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}
function edgeScroll(x: number, y: number) {
  const speed = (d: number) => Math.ceil(((EDGE - d) / EDGE) * 18);
  const box = scroller(x, y);
  if (box) {
    const r = box.getBoundingClientRect();
    if (y - r.top < EDGE && box.scrollTop > 0) return void (box.scrollTop -= speed(y - r.top));
    if (r.bottom - y < EDGE && box.scrollTop + box.clientHeight < box.scrollHeight)
      return void (box.scrollTop += speed(r.bottom - y));
  }
  if (y < EDGE) scrollBy(0, -speed(y));
  else if (innerHeight - y < EDGE) scrollBy(0, speed(innerHeight - y));
}

// The card itself, lifted: a copy of what was grabbed, held where the pointer took it. It sits beside the original
// so the page's styles still apply to it; `fixed` keeps it with the pointer.
function lift(src: HTMLElement, count: number, x: number, y: number) {
  const r = src.getBoundingClientRect();
  const g = src.cloneNode(true) as HTMLElement;
  for (const el of [g, ...g.querySelectorAll<HTMLElement>("[data-id],[data-drop],[data-tour],[id],[data-dragged]")]) {
    el.removeAttribute("data-id");
    el.removeAttribute("data-drop");
    el.removeAttribute("data-tour");
    el.removeAttribute("id");
    el.removeAttribute("data-dragged");
  }
  g.classList.add("drag-card");
  // Something drawn without a fill of its own (a sidebar row) gets one, so it reads as a card in the air.
  if (getComputedStyle(src).backgroundColor === "rgba(0, 0, 0, 0)") g.dataset.bare = "";
  g.setAttribute("aria-hidden", "true");
  Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  if (count > 1) g.dataset.count = String(count);
  src.after(g);
  // A transformed ancestor would move a `fixed` box; measure once and correct for it.
  const at = g.getBoundingClientRect();
  g.style.left = `${r.left * 2 - at.left}px`;
  g.style.top = `${r.top * 2 - at.top}px`;
  return { g, dx: x - r.left, dy: y - r.top, home: r };
}

// Props for a draggable element. `label` names what's moving (it's the fallback ghost when nothing can be lifted).
export function draggable(payload: Payload, label: string) {
  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0 || (e.target as HTMLElement).closest("input, textarea, select, [data-nodrag]")) return;
      const start = { x: e.clientX, y: e.clientY };
      const src = e.currentTarget.closest<HTMLElement>("[data-card]") ?? e.currentTarget;
      const touch = e.pointerType === "touch";
      let ghost: ReturnType<typeof lift> | null = null;
      let over: HTMLElement | null = null;
      let overT: { current: Target } | null = null;
      let timer = 0;
      let raf = 0;
      let last = start;
      // Bins where they sit on the page, so scrolling mid-drag can float or settle them again.
      let bins: { el: HTMLElement; top: number; bottom: number }[] = [];
      // A bin stays put while at least half of it is on screen; otherwise it floats into the corner.
      const placeBins = () => {
        for (const b of bins) {
          const shown = Math.min(b.bottom - scrollY, innerHeight) - Math.max(b.top - scrollY, 0);
          b.el.toggleAttribute("data-float", shown < (b.bottom - b.top) / 2);
        }
      };

      const move = (x: number, y: number) => {
        if (!ghost) return;
        last = { x, y };
        ghost.g.style.transform = `translate(${x - ghost.dx - ghost.home.left}px, ${y - ghost.dy - ghost.home.top}px)`;
        const t = targetAt(x, y);
        const hit = t?.el ?? null;
        if (hit !== over) {
          over?.removeAttribute("data-over");
          if (overT && overT !== t?.box) overT.current.leave?.();
        }
        overT = t?.box ?? null;
        hit?.setAttribute("data-over", t!.t.where?.(current!, t!.arg, { x, y, el: hit }) ?? "");
        over = hit;
      };
      // While held: scroll near edges, and look again even if the pointer rests (a target may answer differently
      // after a pause, e.g. a note that takes a step only once you hover its middle a moment).
      const loop = () => {
        edgeScroll(last.x, last.y);
        move(last.x, last.y);
        raf = requestAnimationFrame(loop);
      };
      const begin = (x: number, y: number) => {
        current = payload;
        const count = "ids" in payload ? payload.ids.length : 1;
        ghost = lift(src, count, x, y);
        // What's being moved stays behind as a faint outline of where it was (a sticker is a palette: it stays).
        if (payload.kind !== "sticker") src.dataset.dragging = "";
        if (!ghost.home.width) Object.assign(ghost.g, { className: "drag-ghost", textContent: label });
        document.body.classList.add("is-dragging");
        document.body.dataset.drag = payload.kind;
        bins = [...document.querySelectorAll<HTMLElement>("[data-bin]")].map((el) => {
          const r = el.getBoundingClientRect();
          return { el, top: r.top + scrollY, bottom: r.bottom + scrollY };
        });
        placeBins();
        addEventListener("scroll", placeBins, { passive: true });
        addEventListener("keydown", onKey, true);
        getSelection()?.removeAllRanges();
        if (touch) navigator.vibrate?.(8); // picked up
        move(x, y);
        raf = requestAnimationFrame(loop);
      };
      const onMove = (ev: PointerEvent) => {
        const far = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (!ghost && touch && far > 8) return finish(); // a swipe: let the page scroll
        if (!ghost && !touch && far > 4) begin(ev.clientX, ev.clientY);
        move(ev.clientX, ev.clientY);
      };
      const noScroll = (ev: TouchEvent) => void (ghost && ev.preventDefault());
      const swallow = (c: MouseEvent) => {
        c.stopPropagation();
        c.preventDefault();
      };
      // Esc puts it back: the card glides home and nothing changes.
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key !== "Escape" || !ghost) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        settle(ghost, () => ghost!.home);
        ghost = null;
        finish();
      };
      const onUp = (ev: PointerEvent) => {
        if (ghost) {
          const hit = targetAt(ev.clientX, ev.clientY);
          if (hit) hit.t.drop(current!, hit.arg, { x: ev.clientX, y: ev.clientY, el: hit.el });
          // The card glides into wherever it landed (found by its id once the page has updated), else back home.
          const g = ghost;
          const id = "id" in payload ? payload.id : "";
          settle(g, () => {
            const el = id ? document.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`) : null;
            return el?.getBoundingClientRect() ?? (hit ? null : g.home);
          });
          ghost = null;
          // The click the browser sends after a drag isn't a click.
          addEventListener("click", swallow, { capture: true, once: true });
          setTimeout(() => removeEventListener("click", swallow, { capture: true }), 0);
        }
        finish();
      };
      const finish = () => {
        clearTimeout(timer);
        cancelAnimationFrame(raf);
        over?.removeAttribute("data-over");
        overT?.current.leave?.();
        ghost?.g.remove();
        document.body.classList.remove("is-dragging");
        delete src.dataset.dragging;
        delete document.body.dataset.drag;
        removeEventListener("scroll", placeBins);
        removeEventListener("keydown", onKey, true);
        bins.forEach((b) => b.el.removeAttribute("data-float"));
        current = null;
        ghost = null;
        removeEventListener("pointermove", onMove);
        removeEventListener("pointerup", onUp);
        removeEventListener("pointercancel", finish);
        removeEventListener("touchmove", noScroll);
      };

      addEventListener("pointermove", onMove);
      addEventListener("pointerup", onUp);
      addEventListener("pointercancel", finish);
      addEventListener("touchmove", noScroll, { passive: false });
      if (touch)
        timer = window.setTimeout(() => {
          src.dataset.lifting = ""; // a quick "picked up" pulse before it comes loose
          setTimeout(() => delete src.dataset.lifting, 200);
          begin(start.x, start.y);
        }, 350);
    },
  };
}

// The lifted card flies to where it belongs (`to`, read after the page updates), then goes. No target: it just fades.
function settle(g: ReturnType<typeof lift>, to: () => DOMRect | null) {
  const { g: el, home } = g;
  el.dataset.settling = "";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const r = to();
      if (!r || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: r ? 0 : 140 }).finished.then(() => el.remove(), () => el.remove());
        return;
      }
      el.animate(
        [
          { transform: el.style.transform },
          { transform: `translate(${r.left - home.left}px, ${r.top - home.top}px)`, rotate: "0deg", scale: "1", boxShadow: "none" },
        ],
        { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" },
      ).finished.then(() => el.remove(), () => el.remove());
    }),
  );
}
