// What a page view reports to the cookieless analytics: links that carry a secret in the path (shared tasks,
// calendars, invites, receipts) lose it, query strings and #fragments are dropped, and only a launch tag like
// ?ref=email is kept, for the whole visit, so the app page also shows which link someone came from.
const SECRET = /^\/(t|calendar|invite|app\/receipt)\/[^/]+/;
const REF = /^[a-z0-9-]{1,24}$/;

export function cleanVisit(href: string, saved: string | null): { url: string; ref: string | null } {
  const u = new URL(href);
  const fresh = u.searchParams.get("ref")?.toLowerCase() ?? null;
  const ref = fresh && REF.test(fresh) ? fresh : saved && REF.test(saved) ? saved : null;
  const path = u.pathname.replace(SECRET, "/$1/[id]");
  // ponytail: the ref goes in the path, because the free Vercel plan doesn't show query strings or UTM tags.
  return { url: u.origin + (ref ? `${path.replace(/\/$/, "")}/ref/${ref}` : path), ref };
}
