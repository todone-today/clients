"use client";

import { useState } from "react";

// Which tasks have their steps folded away, remembered on this device (a view choice, not part of the list).
const FOLD_KEY = "todone:folded";
export function useFolded(id: string) {
  const [on, set] = useState(() => {
    try {
      return (JSON.parse(localStorage.getItem(FOLD_KEY) ?? "[]") as string[]).includes(id);
    } catch {
      return false;
    }
  });
  const save = (v: boolean) => {
    set(v);
    try {
      const all = new Set(JSON.parse(localStorage.getItem(FOLD_KEY) ?? "[]") as string[]);
      if (v) all.add(id);
      else all.delete(id);
      localStorage.setItem(FOLD_KEY, JSON.stringify([...all].slice(-500)));
    } catch {}
  };
  return [on, save] as const;
}
