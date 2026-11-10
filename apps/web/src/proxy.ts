import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { proxyHeaders } from "@/lib/server";

export function proxy(request: NextRequest) {
  // /api is forwarded to the server (next.config rewrites); add the header that proves it came through here.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const headers = new Headers(request.headers);
    for (const [k, v] of Object.entries(proxyHeaders())) headers.set(k, v);
    return NextResponse.next({ request: { headers } });
  }
  // Optimistic check only: the server verifies the session on every call.
  if (getSessionCookie(request)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search); // e.g. /app?plan=plus-year
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/app/:path*", "/api/:path*"] };
