import { getDb } from "@/database/client";
import { config } from "@/utils/config";
import { decrypt, encrypt } from "@/utils/crypto";
import { fetchWithRetry, readJsonOrThrow } from "@/utils/http";
import { nowIso } from "@/utils/ids";

/**
 * Pinterest API v5 — used READ-ONLY (boards, pin analytics, trends) via OAuth.
 * Publishing goes through Zapier, not this client.
 */
const API = "https://api.pinterest.com/v5";
export const PINTEREST_SCOPES = ["boards:read", "pins:read", "user_accounts:read"];

export function pinterestAuthorizeUrl(state: string): string {
  const u = new URL("https://www.pinterest.com/oauth/");
  u.searchParams.set("client_id", config.pinterest.appId ?? "");
  u.searchParams.set("redirect_uri", config.pinterest.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", PINTEREST_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

function basicAuth() {
  return `Basic ${Buffer.from(`${config.pinterest.appId}:${config.pinterest.appSecret}`).toString("base64")}`;
}

async function storeTokens(t: TokenResponse, previousRefresh?: string | null) {
  const db = await getDb();
  const refresh = t.refresh_token ?? previousRefresh ?? null;
  await db.run(
    `INSERT INTO oauth_tokens (provider, access_token_enc, refresh_token_enc, expires_at, scope, updated_at)
     VALUES ('pinterest', ?, ?, ?, ?, ?)
     ON CONFLICT (provider) DO UPDATE SET access_token_enc = excluded.access_token_enc,
       refresh_token_enc = excluded.refresh_token_enc, expires_at = excluded.expires_at,
       scope = excluded.scope, updated_at = excluded.updated_at`,
    [
      encrypt(t.access_token),
      refresh ? encrypt(refresh) : null,
      t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
      t.scope ?? null,
      nowIso(),
    ],
  );
}

export async function exchangePinterestCode(code: string): Promise<void> {
  const res = await fetchWithRetry(`${API}/oauth/token`, {
    method: "POST",
    headers: { authorization: basicAuth(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.pinterest.redirectUri }).toString(),
  });
  await storeTokens(await readJsonOrThrow<TokenResponse>(res, "Pinterest token exchange"));
}

export async function disconnectPinterest() {
  const db = await getDb();
  await db.run(`DELETE FROM oauth_tokens WHERE provider = 'pinterest'`);
}

export async function pinterestConnection(): Promise<{ connected: boolean; expiresAt: string | null; scope: string | null }> {
  const db = await getDb();
  const row = await db.get<{ expires_at: string | null; scope: string | null }>(
    `SELECT expires_at, scope FROM oauth_tokens WHERE provider = 'pinterest'`,
  );
  return { connected: Boolean(row), expiresAt: row?.expires_at ?? null, scope: row?.scope ?? null };
}

/** Returns a valid access token, refreshing it when it is about to expire. Null if not connected. */
export async function getPinterestAccessToken(): Promise<string | null> {
  if (!config.appSecret) return null;
  const db = await getDb();
  const row = await db.get<{ access_token_enc: string; refresh_token_enc: string | null; expires_at: string | null }>(
    `SELECT access_token_enc, refresh_token_enc, expires_at FROM oauth_tokens WHERE provider = 'pinterest'`,
  );
  if (!row) return null;
  const expiring = row.expires_at && new Date(row.expires_at).getTime() - Date.now() < 5 * 60_000;
  if (expiring && row.refresh_token_enc && config.pinterest.oauthConfigured) {
    const refresh = decrypt(row.refresh_token_enc);
    const res = await fetchWithRetry(`${API}/oauth/token`, {
      method: "POST",
      headers: { authorization: basicAuth(), "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }).toString(),
    });
    const t = await readJsonOrThrow<TokenResponse>(res, "Pinterest token refresh");
    await storeTokens(t, refresh);
    return t.access_token;
  }
  return decrypt(row.access_token_enc);
}

export async function pinterestGet<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const token = await getPinterestAccessToken();
  if (!token) throw new Error("Pinterest account is not connected");
  const u = new URL(API + path);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  const res = await fetchWithRetry(u.toString(), { headers: { authorization: `Bearer ${token}` } });
  return readJsonOrThrow<T>(res, `Pinterest GET ${path}`);
}

export interface PinterestBoard {
  id: string;
  name: string;
  privacy?: string;
}

export async function listPinterestBoards(): Promise<PinterestBoard[]> {
  const out: PinterestBoard[] = [];
  let bookmark: string | undefined;
  for (let page = 0; page < 10; page++) {
    const json = await pinterestGet<{ items: PinterestBoard[]; bookmark?: string | null }>(
      "/boards",
      bookmark ? { page_size: "100", bookmark } : { page_size: "100" },
    );
    out.push(...(json.items ?? []));
    if (!json.bookmark) break;
    bookmark = json.bookmark;
  }
  return out;
}

export interface DailyPinMetrics {
  date: string;
  impressions: number | null;
  outboundClicks: number | null;
  pinClicks: number | null;
  saves: number | null;
}

/** Daily analytics for one pin. Pinterest only returns data for pins owned by the connected account. */
export async function getPinAnalytics(pinId: string, startDate: string, endDate: string): Promise<DailyPinMetrics[]> {
  const json = await pinterestGet<Record<string, { daily_metrics?: { date: string; data_status?: string; metrics?: Record<string, number> }[] }>>(
    `/pins/${encodeURIComponent(pinId)}/analytics`,
    { start_date: startDate, end_date: endDate, metric_types: "IMPRESSION,OUTBOUND_CLICK,PIN_CLICK,SAVE" },
  );
  const bucket = json.all ?? Object.values(json)[0];
  return (bucket?.daily_metrics ?? [])
    .filter((d) => !d.data_status || d.data_status === "READY")
    .map((d) => ({
      date: d.date,
      impressions: d.metrics?.IMPRESSION ?? null,
      outboundClicks: d.metrics?.OUTBOUND_CLICK ?? null,
      pinClicks: d.metrics?.PIN_CLICK ?? null,
      saves: d.metrics?.SAVE ?? null,
    }));
}
