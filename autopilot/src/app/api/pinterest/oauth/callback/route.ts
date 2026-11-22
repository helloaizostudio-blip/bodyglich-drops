import { NextResponse, type NextRequest } from "next/server";
import { exchangePinterestCode } from "@/services/pinterest/api";
import { audit } from "@/utils/audit";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("pinterest_oauth_state")?.value;
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/settings?${q}`, req.url));
    res.cookies.delete("pinterest_oauth_state");
    return res;
  };
  if (!code || !state || !expected || state !== expected) return back("err=Pinterest authorisation failed (state mismatch)");
  try {
    await exchangePinterestCode(code);
    await audit("info", "user", "pinterest.connect", "Connected Pinterest account (read-only scopes)");
    return back("msg=Pinterest connected");
  } catch (err) {
    await audit("error", "user", "pinterest.connect", `Pinterest token exchange failed: ${(err as Error).message}`);
    return back(`err=${encodeURIComponent("Pinterest connection failed: " + (err as Error).message)}`);
  }
}
