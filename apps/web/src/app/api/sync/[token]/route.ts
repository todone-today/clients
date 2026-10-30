import { workspaceLists } from "@/lib/access";
import { db } from "@/lib/db";
import { serialize } from "@/lib/tasks";

// Two-way Markdown sync for Obsidian and the terminal app: every list in the workspace, as Markdown.
export async function GET(_: Request, ctx: RouteContext<"/api/sync/[token]">) {
  const { rows } = await db.query<{ id: string }>(`select id from workspace where "syncToken" = $1`, [
    (await ctx.params).token,
  ]);
  if (!rows[0]) return Response.json({ error: "Unknown sync link" }, { status: 404 });
  const lists = await workspaceLists(rows[0].id);
  return Response.json({
    lists: lists.map((l) => ({ name: l.name, version: l.version, markdown: serialize(l.tasks) })),
  });
}
