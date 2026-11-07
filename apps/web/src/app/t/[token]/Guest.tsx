"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, LockOpen } from "lucide-react";
import { type Task, fmtMinutes } from "@todone/sdk/tasks";
import { Logo } from "@/components/Logo";
import { Media } from "@/components/Media";
import { Note } from "@/components/Note";
import { type Comment, Thread } from "@/components/Thread";
import { sharedUrl } from "@/lib/files";
import s from "./guest.module.css";

const PRI = { 1: "High", 2: "Medium", 3: "Low" } as const;

// Each browser is one anonymous guest ("Guest 2"), by a random key kept here.
function guestKey() {
  try {
    let k = localStorage.getItem("todone:guest");
    if (!k) {
      k = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem("todone:guest", k);
    }
    return k;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

export function Guest({ token }: { token: string }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [data, setData] = useState<{ task: Task; comments: Comment[] } | null>(null);
  const [gone, setGone] = useState("");
  const base = `/s/${encodeURIComponent(token)}`;
  useEffect(() => {
    Promise.resolve().then(() => setHeaders({ "x-guest": guestKey() }));
  }, []);
  const load = useCallback(async () => {
    const r = await fetch(`/api${base}`, { headers: headers ?? {} });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      setGone(r.status === 429 ? "Too many requests. Wait a moment and reload." : "This link doesn't work any more. Ask whoever shared it to share it again.");
      throw new Error("gone");
    }
    setData(j);
    return j.comments as Comment[];
  }, [base, headers]);
  useEffect(() => {
    if (headers)
      Promise.resolve()
        .then(load)
        .catch(() => {});
  }, [headers, load]);

  return (
    <main className={s.page}>
      <header className={s.top}>
        <Link href="/" aria-label="todone">
          <Logo size={28} />
        </Link>
        <span className={s.badge}>
          <LockOpen size={13} strokeWidth={2.5} aria-hidden /> Shared by link · not end-to-end encrypted
        </span>
      </header>
      {gone ? (
        <section className={`sticker ${s.card}`}>
          <h1 className="display">Link not available</h1>
          <p>{gone}</p>
        </section>
      ) : !data || !headers ? (
        <p className={s.hint}>Loading…</p>
      ) : (
        <>
          <section className={`sticker ${s.card}`}>
            <h1 className="display" data-done={data.task.done || undefined}>
              {data.task.title}
            </h1>
            <p className={s.chips}>
              {data.task.done && (
                <span>
                  <Check size={12} strokeWidth={3} aria-hidden /> Done
                </span>
              )}
              {data.task.due && (
                <span>
                  {new Date(`${data.task.due}T12:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                  {data.task.at ? ` · ${data.task.at}` : ""}
                </span>
              )}
              {data.task.est ? <span>{fmtMinutes(data.task.est)}</span> : null}
              {data.task.pri ? <span>{PRI[data.task.pri]}</span> : null}
              {data.task.rep ? <span>{data.task.rep}</span> : null}
            </p>
            {data.task.note && <Note text={data.task.note} className={s.note} />}
            {data.task.sub.length > 0 && (
              <ul className={s.steps}>
                {data.task.sub.map((x) => (
                  <li key={x.id} data-done={x.done || undefined}>
                    <span aria-hidden>{x.done ? "☑" : "☐"}</span> {x.title}
                  </li>
                ))}
              </ul>
            )}
            {data.task.files?.length ? (
              <div className={s.files}>
                {data.task.files.map((f) => (
                  <Media key={f.id} file={f} load={() => sharedUrl(base, f.id, headers)} />
                ))}
              </div>
            ) : null}
          </section>
          <section className={s.thread}>
            <h2>Conversation</h2>
            <p className={s.hint}>
              You&apos;re a guest: no account needed. Anything you write or upload here can be seen by the task&apos;s owner,
              their team, and anyone with this link.
            </p>
            <Thread base={base} headers={headers} initial={data.comments} load={load} />
          </section>
        </>
      )}
      <footer className={s.foot}>
        Made with <Link href="/">todone</Link>: Todos. Done right.
      </footer>
    </main>
  );
}
