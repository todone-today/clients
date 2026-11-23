import { NextResponse, type NextRequest } from "next/server";
import { proxyHeaders } from "@/lib/server";

export function proxy(request: NextRequest) {
  // /api is forwarded to the server (next.config rewrites); add the header that proves it came through here.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const headers = new Headers(request.headers);
    for (const [k, v] of Object.entries(proxyHeaders())) headers.set(k, v);
    return NextResponse.next({ request: { headers } });
  }
  // PostHog (/ingest, next.config rewrites) is another company: the session cookie and the rest never go there.
  if (request.nextUrl.pathname.startsWith("/ingest")) {
    const headers = new Headers(request.headers);
    headers.delete("cookie");
    headers.delete("authorization");
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

// The website only (the app is static, at app.todone.today; signing in happens there).
export const config = { matcher: ["/api/:path*", "/ingest/:path*"] };
