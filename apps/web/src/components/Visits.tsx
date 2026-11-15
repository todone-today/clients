"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { cleanVisit } from "@/lib/visit";

// Cookieless page counts (Vercel Web Analytics); see lib/visit.ts for what each view reports.
const KEY = "todone:ref";

function beforeSend(e: BeforeSendEvent): BeforeSendEvent {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(KEY);
  } catch {}
  const { url, ref } = cleanVisit(e.url, saved);
  try {
    if (ref) sessionStorage.setItem(KEY, ref);
  } catch {}
  return { ...e, url };
}

export function Visits() {
  return <Analytics beforeSend={beforeSend} />;
}
