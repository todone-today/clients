"use client";

import { useEffect, useState } from "react";
import s from "../../(legal)/legal.module.css";

type Health = { api: boolean; db: boolean; ms: number } | null;

// Checked from your browser every 30 seconds, through the same /api the app uses.
export function Status() {
  const [health, setHealth] = useState<Health | "down">(null);
  const [at, setAt] = useState("");

  useEffect(() => {
    const check = async () => {
      const r = await fetch("/api/health", { cache: "no-store" }).catch(() => null);
      setHealth(r ? ((await r.json().catch(() => null)) ?? "down") : "down");
      setAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);

  const h = health === "down" ? { api: false, db: false, ms: 0 } : health;
  const rows: [string, boolean | undefined, string][] = [
    ["Website", true, "todone.today"],
    ["API", h?.api, "Sign-in, lists, integrations"],
    ["Database", h?.db, h?.db ? `answered in ${h.ms} ms` : "Where your lists are stored"],
  ];
  const all = h && h.api && h.db;

  return (
    <>
      <h1 className="display">Status</h1>
      <p className={s.lead} role="status">
        {!h ? "Checking…" : all ? "Everything is working." : "Something isn't working. We're on it."}
      </p>
      <ul className={s.status}>
        {rows.map(([name, ok, note]) => (
          <li key={name} data-ok={ok === undefined ? undefined : ok}>
            <b>{name}</b>
            <span>{ok === undefined ? "Checking…" : ok ? "Working" : "Down"}</span>
            <small>{note}</small>
          </li>
        ))}
      </ul>
      {at && <p className={s.updated}>Last checked at {at}. This page checks again every 30 seconds.</p>}
    </>
  );
}
