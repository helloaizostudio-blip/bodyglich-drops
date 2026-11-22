import { createHmac } from "node:crypto";
import { config } from "@/utils/config";
import { fetchWithRetry } from "@/utils/http";
import { safeEqual } from "@/utils/crypto";
import { mediaUrl } from "@/services/image-generation/renderer";
import type { BoardConfig, Pin } from "@/database/types";

/**
 * Publishing goes through Zapier's official Pinterest integration:
 *
 *   This app ──POST JSON──▶ Zap trigger "Webhooks by Zapier → Catch Hook"
 *                           ▶ Action "Pinterest → Create Pin" (fields mapped from the payload)
 *                           ▶ (optional) "Webhooks by Zapier → POST" back to `callback_url`
 *
 * The callback lets the app record the real Pinterest pin ID/URL and mark the pin "published".
 * Without it, pins stay in "sent" (delivered to Zapier) — the app never claims a pin is live
 * unless Zapier confirms it.
 */

export interface ZapierPinPayload {
  event: "create_pin";
  pin_id: string;
  board_name: string;
  board_id: string | null;
  title: string;
  description: string;
  link: string;
  image_url: string;
  alt_text: string;
  keywords: string;
  callback_url: string;
  callback_token: string;
  sent_at: string;
}

function callbackSecret(): string {
  const s = config.zapier.callbackSecret ?? config.appSecret;
  if (!s) throw new Error("Set ZAPIER_CALLBACK_SECRET or APP_SECRET so Zapier callbacks can be verified");
  return s;
}

export function callbackTokenFor(pinId: string): string {
  return createHmac("sha256", callbackSecret()).update(`pin:${pinId}`).digest("base64url");
}

export function verifyCallbackToken(pinId: string, token: string): boolean {
  try {
    return safeEqual(callbackTokenFor(pinId), token);
  } catch {
    return false;
  }
}

export function buildPayload(pin: Pin, board: BoardConfig | undefined): ZapierPinPayload {
  const image = mediaUrl(pin.image_file);
  if (!image) throw new Error("Pin has no image");
  return {
    event: "create_pin",
    pin_id: pin.id,
    board_name: pin.board,
    board_id: board?.pinterestBoardId ?? null,
    title: pin.title,
    description: pin.description,
    link: pin.link,
    image_url: image,
    alt_text: pin.alt_text,
    keywords: pin.keywords.join(", "),
    callback_url: `${config.publicBaseUrl}/api/zapier/callback`,
    callback_token: callbackTokenFor(pin.id),
    sent_at: new Date().toISOString(),
  };
}

export interface ZapierSendResult {
  ok: boolean;
  status: number;
  requestId: string | null;
  error: string | null;
}

export async function sendToZapier(payload: ZapierPinPayload): Promise<ZapierSendResult> {
  const url = config.zapier.webhookUrl;
  if (!url) return { ok: false, status: 0, requestId: null, error: "ZAPIER_WEBHOOK_URL is not configured" };
  if (!/^https:\/\/hooks\.zapier\.com\//.test(url)) {
    return { ok: false, status: 0, requestId: null, error: "ZAPIER_WEBHOOK_URL must be a https://hooks.zapier.com/ Catch Hook URL" };
  }
  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      retries: 1,
      timeoutMs: 30_000,
    });
    const text = await res.text();
    let requestId: string | null = null;
    try {
      const j = JSON.parse(text) as { request_id?: string; id?: string; status?: string };
      requestId = j.request_id ?? j.id ?? null;
    } catch {
      /* non-JSON body is fine */
    }
    return res.ok
      ? { ok: true, status: res.status, requestId, error: null }
      : { ok: false, status: res.status, requestId, error: `Zapier returned HTTP ${res.status}: ${text.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, status: 0, requestId: null, error: `Could not reach Zapier: ${(err as Error).message}` };
  }
}
