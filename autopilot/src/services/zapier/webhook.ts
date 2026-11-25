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
  /** Set when the automation answers with the created pin (e.g. a Make "Webhook response"). */
  pinterestPinId?: string | null;
  pinterestUrl?: string | null;
}

/** Zapier Catch Hooks and Make custom webhooks (hook.<region>.make.com). */
export const ALLOWED_HOOK = /^https:\/\/(hooks\.zapier\.com|hook\.[a-z0-9-]+\.make\.com)\//;

export async function sendToZapier(payload: ZapierPinPayload): Promise<ZapierSendResult> {
  const url = config.zapier.webhookUrl;
  if (!url) return { ok: false, status: 0, requestId: null, error: "ZAPIER_WEBHOOK_URL is not configured" };
  if (!ALLOWED_HOOK.test(url)) {
    return { ok: false, status: 0, requestId: null, error: "Webhook URL must be a Zapier (hooks.zapier.com) or Make (hook.<region>.make.com) URL" };
  }
  try {
    // Sent as a GET with every field in the query string. Zapier exposes these as
    // "Querystring Title", "Querystring Link", … — the same fields a browser-sent sample
    // produces — so the Zap mapping is identical however the Zap was set up.
    // (Mixing a JSON body with a query string left the "Querystring" fields empty.)
    const target = new URL(url);
    for (const [k, v] of Object.entries(payload)) {
      if (v !== null && v !== undefined) target.searchParams.set(k, String(v));
    }
    const res = await fetchWithRetry(target.toString(), { method: "GET", retries: 1, timeoutMs: 30_000 });
    const text = await res.text();
    let requestId: string | null = null;
    let pinterestPinId: string | null = null;
    let pinterestUrl: string | null = null;
    try {
      const j = JSON.parse(text) as { request_id?: string; id?: string; pinterest_pin_id?: string | number; pinterest_url?: string };
      requestId = j.request_id ?? (j.pinterest_pin_id ? null : j.id) ?? null;
      const pid = j.pinterest_pin_id?.toString().replace(/[^0-9]/g, "");
      pinterestPinId = pid || null;
      pinterestUrl = j.pinterest_url ?? (pinterestPinId ? `https://www.pinterest.com/pin/${pinterestPinId}/` : null);
    } catch {
      /* non-JSON body (e.g. Make's plain "Accepted") is fine */
    }
    if (res.ok && /make\.com/.test(url) && !pinterestPinId && /error|fail/i.test(text)) {
      return { ok: false, status: res.status, requestId, error: `Make reported: ${text.slice(0, 300)}` };
    }
    return res.ok
      ? { ok: true, status: res.status, requestId, error: null, pinterestPinId, pinterestUrl }
      : { ok: false, status: res.status, requestId, error: `Zapier returned HTTP ${res.status}: ${text.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, status: 0, requestId: null, error: `Could not reach Zapier: ${(err as Error).message}` };
  }
}
