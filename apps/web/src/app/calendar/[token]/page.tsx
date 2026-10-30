import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { workspaceLists } from "@/lib/access";
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

// ?view=day|week|month|year&at=YYYY-MM-DD: the view and date the link was shared from (checked by CalendarView).
async function Shared({ params, searchParams }: PageProps<"/calendar/[token]">) {
  await connection();
  const { token } = await params;
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const { rows } = await db.query<{ id: string }>(`select id from workspace where "icsToken" = $1`, [token]);
  if (!rows[0]) notFound();
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
