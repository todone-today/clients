"use client";

import { useState } from "react";

// A task's steps start folded. Opening them lasts while you're on that list: a refresh or another list folds them
// all again (foldAll), so every list opens tidy.
const opened = new Set<string>();
export const foldAll = () => opened.clear();
export function useFolded(id: string) {
  const [on, set] = useState(() => !opened.has(id));
  const save = (v: boolean) => {
    set(v);
    if (v) opened.delete(id);
    else opened.add(id);
  };
  return [on, save] as const;
}
