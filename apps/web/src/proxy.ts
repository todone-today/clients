import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check only: the server actions verify the session on every call.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/app/:path*"] };
