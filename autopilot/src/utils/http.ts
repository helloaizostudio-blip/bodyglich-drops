/** fetch with timeout and bounded retries on network errors / 429 / 5xx. */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 20_000, retries = 2, ...rest } = init;
  let attempt = 0;
  for (;;) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: ctrl.signal });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
        attempt++;
        continue;
      }
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(1000 * 2 ** attempt);
      attempt++;
    } finally {
      clearTimeout(t);
    }
  }
}

export async function readJsonOrThrow<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new HttpError(`${label} failed with HTTP ${res.status}`, res.status, text.slice(0, 2000));
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(`${label} returned non-JSON response`, res.status, text.slice(0, 2000));
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
