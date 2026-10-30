import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { workspaceLists } from "@/lib/access";
import { db } from "@/lib/db";
import { NAME } from "@/lib/brand";
import { CalendarView } from "../../app/CalendarView";
import s from "../../app/app.module.css";

export const metadata: Metadata = { title: "Calendar", robots: { index: false } };

// The calendar link opened in a browser: a read-only view of the workspace's dated tasks.
export default function SharedCalendar({ params }: PageProps<"/calendar/[token]">) {
  return (
    <Suspense>
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: { params: PageProps<"/calendar/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const { rows } = await db.query<{ id: string }>(`select id from workspace where "icsToken" = $1`, [token]);
  if (!rows[0]) notFound();
  const lists = await workspaceLists(rows[0].id);
  return (
    <main className={s.shared}>
      <p className={`display ${s.mark}`}>{NAME}</p>
      <CalendarView lists={lists} />
    </main>
  );
}
