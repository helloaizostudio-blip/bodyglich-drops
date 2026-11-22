import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { config } from "@/utils/config";
import { pinterestAuthorizeUrl } from "@/services/pinterest/api";

export async function GET(req: Request) {
  if (!config.pinterest.oauthConfigured || !config.appSecret) {
    return NextResponse.redirect(new URL("/settings?err=Set PINTEREST_APP_ID, PINTEREST_APP_SECRET and APP_SECRET first", req.url));
  }
  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(pinterestAuthorizeUrl(state));
  res.cookies.set("pinterest_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: config.publicBaseUrl.startsWith("https"), maxAge: 600, path: "/" });
  return res;
}
