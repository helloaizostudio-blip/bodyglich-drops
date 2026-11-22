import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/utils/session";

/**
 * Protects the dashboard. Public routes: login, pin images (Zapier must fetch them),
 * the Zapier callback (verified by its own HMAC token) and the health check.
 */
const PUBLIC = [/^\/login$/, /^\/api\/auth\/login$/, /^\/api\/media\//, /^\/api\/zapier\/callback$/, /^\/api\/health$/];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const password = process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) {
    // No password configured: only allow access from this machine.
    const host = req.nextUrl.hostname;
    if (LOCAL_HOSTS.has(host)) return NextResponse.next();
    return new NextResponse("Set DASHBOARD_PASSWORD before exposing the dashboard to the internet.", { status: 403 });
  }

  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
