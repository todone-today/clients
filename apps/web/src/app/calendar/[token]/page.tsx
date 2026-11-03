import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { SharedView } from "@todone/sdk/api";
import { server } from "@/lib/server";
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
  const r = await fetch(`${server()}/api/shared/${encodeURIComponent(token)}`, { cache: "no-store" });
  if (r.status === 404) notFound();
  if (!r.ok) throw new Error(`The server said ${r.status}`);
  const shared: SharedView = await r.json();
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return (
    <main className={s.shared}>
      <p className={s.mark}>
        <Logo size={26} />
      </p>
      <CalendarView
        lists={shared.lists}
        start={shared.start ?? { view: one(q.view), at: one(q.at) }}
        locked={shared.locked}
      />
    </main>
  );
}
