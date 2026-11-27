"use client";
import { useEffect } from "react";

// Every open modal <dialog> closes when you press and let go on its backdrop, like Esc does: a dialog whose
// onCancel calls preventDefault (sign-in while locked, an import in progress) stays open.
export function OutsideCloses() {
  useEffect(() => {
    let down: EventTarget | null = null;
    const press = (e: PointerEvent) => (down = e.target);
    const click = (e: MouseEvent) => {
      const d = e.target;
      // Its own handler may already have closed it (React runs before this document listener).
      if (!(d instanceof HTMLDialogElement) || !d.open || down !== d) return;
      const r = d.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) return; // the dialog's own padding, not the backdrop
      if (d.dispatchEvent(new Event("cancel", { cancelable: true }))) d.close();
    };
    document.addEventListener("pointerdown", press, true);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("pointerdown", press, true);
      document.removeEventListener("click", click);
    };
  }, []);
  return null;
}
