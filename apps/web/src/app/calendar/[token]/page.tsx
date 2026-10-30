import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { workspaceLists } from "@/lib/access";
import { type CalView, rangeOf } from "@/lib/calendar";
import { db } from "@/lib/db";
import { CalendarView } from "../../app/CalendarView";
import s from "../../app/app.module.css";

export const metadata: Metadata = { title: "Calendar", robots: { index: false } };

// The calendar link opened in a browser: a read-only view of the workspace's dated tasks.
export default function SharedCalendar({ params, searchParams }: PageProps<"/calendar/[token]">) {
  return (
    <Suspense>
      <Shared params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// A shared view (one day, week, month or year, locked) or, for the calendar feed's own link, the whole calendar.
async function Shared({ params, searchParams }: PageProps<"/calendar/[token]">) {
  await connection();
  const { token } = await params;
  const share = (
    await db.query<{ workspace: string; view: CalView; at: string }>(
      `select workspace, view, at from calendar_share where token = $1`,
      [token],
    )
  ).rows[0];
  if (share) {
    // Only tasks inside the shared period reach the page.
    const [from, to] = rangeOf(share.view, share.at);
    const lists = (await workspaceLists(share.workspace)).map((l) => ({
      ...l,
      tasks: l.tasks
        .flatMap((t) => [t, ...t.sub])
        .filter((t) => t.due && t.due >= from && t.due <= to)
        .map((t) => ({ ...t, sub: [] })),
    }));
    return (
      <main className={s.shared}>
        <p className={s.mark}>
          <Logo size={26} />
        </p>
        <CalendarView lists={lists} start={{ view: share.view, at: share.at }} locked />
      </main>
    );
  }
  const { rows } = await db.query<{ id: string }>(`select id from workspace where "icsToken" = $1`, [token]);
  if (!rows[0]) notFound();
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const lists = await workspaceLists(rows[0].id);
  return (
    <main className={s.shared}>
      <p className={s.mark}>
        <Logo size={26} />
      </p>
      <CalendarView lists={lists} start={{ view: one(q.view), at: one(q.at) }} />
    </main>
  );
}
