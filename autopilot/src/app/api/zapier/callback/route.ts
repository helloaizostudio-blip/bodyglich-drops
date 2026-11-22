import { NextResponse } from "next/server";
import { handleZapierCallback, type ZapierCallback } from "@/services/scheduler/publisher";

/**
 * Called by the last step of the Zap (Webhooks by Zapier → POST) after Pinterest "Create Pin".
 * Authenticated by the per-pin HMAC `callback_token` included in the original payload.
 * Accepts JSON or form-encoded bodies (Zapier supports both).
 */
export async function POST(req: Request) {
  let body: ZapierCallback;
  const type = req.headers.get("content-type") ?? "";
  try {
    body = type.includes("application/json")
      ? ((await req.json()) as ZapierCallback)
      : (Object.fromEntries((await req.formData()).entries()) as unknown as ZapierCallback);
  } catch {
    return NextResponse.json({ ok: false, message: "invalid body" }, { status: 400 });
  }
  const r = await handleZapierCallback(body);
  return NextResponse.json({ ok: r.ok, message: r.message }, { status: r.httpStatus });
}
