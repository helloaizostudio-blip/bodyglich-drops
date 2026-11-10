import "server-only";
import { UserError } from "@/server/action";

/** Small fetch wrapper for provider REST APIs: timeout, and errors turned into user-readable messages. */
export async function providerFetch(vendor: string, url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 180_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new UserError(timedOut ? `${vendor} did not respond in time. Please try again.` : `Could not reach ${vendor}. Check the server's network connection.`);
  }
  if (res.ok) return res;

  let detail = "";
  try {
    const body = (await res.json()) as { error?: { message?: string } | string; detail?: { message?: string } | string; message?: string };
    const e = body.error ?? body.detail ?? body.message;
    detail = typeof e === "string" ? e : (e?.message ?? "");
  } catch {
    /* non-JSON error body */
  }
  const suffix = detail ? `: ${detail.slice(0, 400)}` : "";
  if (res.status === 401) throw new UserError(`${vendor} rejected the API key. Check it in Settings → AI providers.`);
  if (res.status === 403) throw new UserError(`${vendor} denied access${suffix || " — the key may not have access to this model."}`);
  if (res.status === 404) throw new UserError(`${vendor} could not find the requested model or resource${suffix}`);
  if (res.status === 429) throw new UserError(`${vendor} rate limit or quota reached${suffix}`);
  if (res.status >= 500) throw new UserError(`${vendor} is having problems right now (${res.status}). Please try again later.`);
  throw new UserError(`${vendor} rejected the request (${res.status})${suffix}`);
}

export function blobOf(data: Buffer, mimeType: string): Blob {
  return new Blob([new Uint8Array(data)], { type: mimeType });
}
