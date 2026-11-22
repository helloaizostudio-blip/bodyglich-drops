import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSessionToken, passwordMatches } from "@/utils/session";
import { audit } from "@/utils/audit";

// Simple in-memory throttle against password guessing.
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return new NextResponse("Too many attempts. Try again in a few minutes.", { status: 429 });

  if (!passwordMatches(String(form.get("password") ?? ""))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    await audit("warn", "user", "auth.login_failed", "Failed dashboard login");
    return NextResponse.redirect(new URL(`/login?err=1&next=${encodeURIComponent(next)}`, req.url), 303);
  }
  attempts.delete(ip);
  const { token, maxAge } = await createSessionToken();
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge,
  });
  await audit("info", "user", "auth.login", "Signed in to dashboard");
  return res;
}
