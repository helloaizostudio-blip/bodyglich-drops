import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: sends visitors without a session cookie to the sign-in screen.
 * Real authorization happens on the server for every page, action and file request.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/setup")) return NextResponse.next();
  if (!request.cookies.has("ff_session")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Signed out" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|favicon.ico).*)"],
};
