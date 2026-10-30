import { workspaceLists } from "@/lib/access";
import { db } from "@/lib/db";
import { toICS } from "@/lib/integrations";

// A secret-URL calendar feed: subscribe from Google Calendar, Apple Calendar or Outlook.
export async function GET(req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const token = (await ctx.params).token.replace(/\.ics$/, "");
  // A person opening the link in a browser sees the calendar; calendar apps (which don't ask for HTML) get the feed.
  if (req.headers.get("accept")?.startsWith("text/html"))
    return Response.redirect(new URL(`/calendar/${token}`, req.url), 307);
  const { rows } = await db.query<{ id: string }>(`select id from workspace where "icsToken" = $1`, [token]);
  if (!rows[0]) return new Response("Not found", { status: 404 });
  return new Response(toICS("todone", await workspaceLists(rows[0].id)), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" },
  });
}
