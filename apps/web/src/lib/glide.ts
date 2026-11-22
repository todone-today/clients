"use client";

import { useLayoutEffect, useRef } from "react";

// Cards glide to their new spots when the order changes, like icons on a home screen: after each render, any
// child with a data-id whose place changed starts from where it was and slides over. Returns the list's ref.
export function useGlide<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const spots = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, { x: number; y: number }>();
    for (const el of ul.querySelectorAll<HTMLElement>(":scope > [data-id]")) {
      // Offsets ignore transforms, so a card mid-slide still reports where it's heading.
      const at = { x: el.offsetLeft, y: el.offsetTop };
      const was = spots.current.get(el.dataset.id!);
      next.set(el.dataset.id!, at);
      if (was && !still && (was.x !== at.x || was.y !== at.y)) {
        // Moved again mid-slide: carry on from where it is on screen now, not from its old spot (that's a jump).
        const t = getComputedStyle(el).transform;
        const m = new DOMMatrixReadOnly(t === "none" ? undefined : t);
        for (const a of el.getAnimations()) if (a.id === "glide") a.cancel();
        const dx = was.x - at.x + m.m41;
        const dy = was.y - at.y + m.m42;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)
          Object.assign(
            el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
              duration: 220,
              easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            }),
            { id: "glide" },
          );
      }
    }
    spots.current = next;
  });
  return ref;
}
