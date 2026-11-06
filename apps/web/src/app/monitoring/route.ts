// Sentry tunnel: the browser posts error reports here (same site, so ad blockers don't drop them) and this passes
// them to Sentry. Only to our own project: anything addressed elsewhere is refused, so this can't relay for others.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN) : null;

export async function POST(req: Request) {
  if (!dsn) return new Response(null, { status: 404 });
  const body = await req.text();
  if (body.length > 1_000_000) return new Response(null, { status: 413 });
  let to: URL;
  try {
    to = new URL(JSON.parse(body.slice(0, body.indexOf("\n"))).dsn);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (to.host !== dsn.host || to.pathname !== dsn.pathname) return new Response(null, { status: 400 });
  const r = await fetch(`https://${dsn.host}/api${dsn.pathname}/envelope/`, {
    method: "POST",
    headers: { "content-type": "application/x-sentry-envelope" },
    body,
  });
  return new Response(null, { status: r.status });
}
