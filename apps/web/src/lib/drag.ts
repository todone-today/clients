"use client";

// Drag and drop on pointer events, so it works the same with mouse, touch and pen in every browser
// (HTML5 drag won't drag buttons in some browsers and never works on touch).
// Mouse and pen start dragging after a small move; touch after a short hold, so swipes still scroll.
import { useEffect, useRef } from "react";

// A task drag carries every selected task; `id` is the one under the pointer.
export type Payload =
  | { kind: "task"; listId: string; id: string; ids: string[] }
  | { kind: "idea"; id: string }
  | { kind: "sticker"; key: string }
  | { kind: "list"; id: string };
export type At = { x: number; y: number; el: HTMLElement };
type Target = {
  accept: (p: Payload, arg: string) => boolean;
  drop: (p: Payload, arg: string, at: At) => void;
  // Optional: where on the target the drop would land ("before", "after", "inside"); shown as data-over.
  where?: (p: Payload, arg: string, at: At) => string;
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
  const t = targets.get(scope)?.current;
  return t && t.accept(current, arg) ? { el, t, arg } : null;
}

// Props for a draggable element. `label` is what the floating ghost shows.
export function draggable(payload: Payload, label: string) {
  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0 || (e.target as HTMLElement).closest("input, textarea, select")) return;
      const start = { x: e.clientX, y: e.clientY };
      const touch = e.pointerType === "touch";
      let ghost: HTMLDivElement | null = null;
      let over: HTMLElement | null = null;
      let timer = 0;

      const move = (x: number, y: number) => {
        if (!ghost) return;
        ghost.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
        const t = targetAt(x, y);
        const hit = t?.el ?? null;
        if (hit !== over) over?.removeAttribute("data-over");
        hit?.setAttribute("data-over", t!.t.where?.(current!, t!.arg, { x, y, el: hit }) ?? "");
        over = hit;
      };
      const begin = (x: number, y: number) => {
        current = payload;
        ghost = Object.assign(document.createElement("div"), { className: "drag-ghost", textContent: label });
        document.body.append(ghost);
        document.body.classList.add("is-dragging");
        getSelection()?.removeAllRanges();
        move(x, y);
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
      const onUp = (ev: PointerEvent) => {
        if (ghost) {
          const hit = targetAt(ev.clientX, ev.clientY);
          if (hit) hit.t.drop(current!, hit.arg, { x: ev.clientX, y: ev.clientY, el: hit.el });
          // The click the browser sends after a drag isn't a click.
          addEventListener("click", swallow, { capture: true, once: true });
          setTimeout(() => removeEventListener("click", swallow, { capture: true }), 0);
        }
        finish();
      };
      const finish = () => {
        clearTimeout(timer);
        over?.removeAttribute("data-over");
        ghost?.remove();
        document.body.classList.remove("is-dragging");
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
      if (touch) timer = window.setTimeout(() => begin(start.x, start.y), 350);
    },
  };
}
