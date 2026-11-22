import { config } from "@/utils/config";
import { fetchWithRetry, readJsonOrThrow, sleep } from "@/utils/http";

/**
 * Higgsfield Cloud adapter for AI *background scenes*. The scene never depicts the
 * actual product: prompts ask for mood/setting only, and pins using these images are
 * labelled "Illustrative image".
 *
 * Auth: `Authorization: Key <key_id>:<key_secret>`.
 * Flow: POST {base}/{model} → { request_id, status_url } → poll status until completed.
 * Model path and base URL are configurable (HIGGSFIELD_MODEL / HIGGSFIELD_API_BASE)
 * because available models depend on your account.
 */
export class HiggsfieldNotConfiguredError extends Error {
  constructor() {
    super("Higgsfield API key is not configured");
  }
}

type Json = Record<string, unknown>;

function authHeader() {
  return `Key ${config.higgsfield.keyId}:${config.higgsfield.keySecret}`;
}

function findImageUrl(json: Json): string | null {
  const images = (json.images ?? (json.output as Json | undefined)?.images ?? json.result) as unknown;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === "string") return img;
      if (img && typeof img === "object" && typeof (img as Json).url === "string") return (img as Json).url as string;
    }
  }
  for (const k of ["image_url", "url", "output_url"]) if (typeof json[k] === "string") return json[k] as string;
  return null;
}

export const HIGGSFIELD_NEGATIVE =
  "no text, no letters, no logos, no brand names, no watermark, no product packaging, no people's faces";

export async function generateBackground(prompt: string, opts: { timeoutMs?: number } = {}): Promise<Buffer> {
  if (!config.higgsfield.configured) throw new HiggsfieldNotConfiguredError();
  const base = config.higgsfield.apiBase;
  const submit = await fetchWithRetry(`${base}/${config.higgsfield.model}`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ prompt: `${prompt}. ${HIGGSFIELD_NEGATIVE}`, aspect_ratio: "2:3", resolution: "1080p" }),
    retries: 1,
  });
  const job = await readJsonOrThrow<Json>(submit, "Higgsfield submit");
  let result: Json = job;
  const requestId = (job.request_id ?? job.id) as string | undefined;
  const statusUrl = (job.status_url as string | undefined) ?? (requestId ? `${base}/requests/${requestId}/status` : undefined);

  const deadline = Date.now() + (opts.timeoutMs ?? 180_000);
  while (!findImageUrl(result)) {
    const status = String(result.status ?? "").toLowerCase();
    if (["failed", "nsfw", "error", "canceled", "cancelled"].includes(status)) {
      throw new Error(`Higgsfield generation ${status}`);
    }
    if (!statusUrl) throw new Error("Higgsfield response had no image and no status URL");
    if (Date.now() > deadline) throw new Error("Higgsfield generation timed out");
    await sleep(4000);
    const res = await fetchWithRetry(statusUrl, { headers: { authorization: authHeader(), accept: "application/json" } });
    result = await readJsonOrThrow<Json>(res, "Higgsfield status");
  }
  const imageUrl = findImageUrl(result)!;
  const img = await fetchWithRetry(imageUrl, { timeoutMs: 60_000 });
  if (!img.ok) throw new Error(`Downloading Higgsfield image failed (HTTP ${img.status})`);
  return Buffer.from(await img.arrayBuffer());
}
