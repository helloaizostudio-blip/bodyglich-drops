import { config } from "@/utils/config";
import { fetchWithRetry, readJsonOrThrow, sleep } from "@/utils/http";

/**
 * Amazon Creators API client (successor to PA-API 5).
 *
 * Auth: OAuth 2.0 client credentials. Credential version 3.x uses the Login with Amazon
 * token endpoint with a JSON body; 2.x uses a Cognito token endpoint with a form body
 * and a version header on API calls. Endpoint, scope and version are configurable
 * because Amazon assigns them per credential — check your credential page.
 *
 * Operations: POST {base}/catalog/v1/searchItems and /catalog/v1/getItems with
 * `x-marketplace: www.amazon.in`. Parameters are camelCase.
 *
 * Response parsing below is defensive: any field Amazon does not return stays null.
 * Nothing is ever estimated or filled in.
 */

export const DEFAULT_RESOURCES = [
  "itemInfo.title",
  "itemInfo.byLineInfo",
  "itemInfo.features",
  "itemInfo.classifications",
  "images.primary.large",
  "offersV2.listings.price",
  "offersV2.listings.availability",
  "customerReviews.count",
  "customerReviews.starRating",
  "browseNodeInfo.websiteSalesRank",
];

export interface AmazonItem {
  asin: string;
  title: string | null;
  brand: string | null;
  features: string[];
  productGroup: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  availabilityType: string | null;
  availabilityMessage: string | null;
  rating: number | null;
  reviewCount: number | null;
  salesRank: number | null;
  detailPageUrl: string | null;
  imageUrl: string | null;
}

export class AmazonNotConfiguredError extends Error {
  constructor() {
    super("Amazon Creators API credentials are not configured (see Settings → Amazon).");
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let lastCallAt = 0;
const MIN_INTERVAL_MS = 1100; // stay under the default 1 request/second allowance

async function getToken(): Promise<string> {
  const a = config.amazon;
  if (!a.credentialId || !a.credentialSecret) throw new AmazonNotConfiguredError();
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.token;

  const isV2 = a.credentialVersion.startsWith("2");
  const res = isV2
    ? await fetchWithRetry(a.tokenUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(`${a.credentialId}:${a.credentialSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: a.scope }).toString(),
      })
    : await fetchWithRetry(a.tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: a.credentialId,
          client_secret: a.credentialSecret,
          scope: a.scope,
        }),
      });
  const json = await readJsonOrThrow<{ access_token: string; expires_in?: number }>(res, "Amazon token request");
  if (!json.access_token) throw new Error("Amazon token response did not include access_token");
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

async function call<T>(operation: "searchItems" | "getItems", body: Record<string, unknown>): Promise<T> {
  const a = config.amazon;
  if (!a.apiConfigured) throw new AmazonNotConfiguredError();
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();

  const token = await getToken();
  const isV2 = a.credentialVersion.startsWith("2");
  const res = await fetchWithRetry(`${a.apiBase}/catalog/v1/${operation}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: isV2 ? `Bearer ${token}, Version ${a.credentialVersion}` : `Bearer ${token}`,
      "x-marketplace": a.marketplace,
    },
    body: JSON.stringify({ partnerTag: a.partnerTag, partnerType: "Associates", marketplace: a.marketplace, ...body }),
  });
  if (res.status === 401) cachedToken = null;
  return readJsonOrThrow<T>(res, `Amazon ${operation}`);
}

// ─── Response mapping ────────────────────────────────────────────────
type AnyObj = Record<string, unknown>;
const obj = (v: unknown): AnyObj => (v && typeof v === "object" ? (v as AnyObj) : {});
/** Reads a key in camelCase or PascalCase (PA-API style), whichever Amazon returns. */
function pick(o: unknown, key: string): unknown {
  const x = obj(o);
  return x[key] ?? x[key.charAt(0).toUpperCase() + key.slice(1)] ?? x[key.toUpperCase()];
}
function path(o: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((acc, k) => pick(acc, k), o);
}
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

export function mapItem(raw: unknown): AmazonItem | null {
  const asin = str(pick(raw, "asin"));
  if (!asin) return null;
  const listings = path(raw, "offersV2", "listings");
  const listing = Array.isArray(listings) ? listings[0] : undefined;
  const money = path(listing, "price", "money");
  const features = path(raw, "itemInfo", "features", "displayValues");
  const ranks = path(raw, "browseNodeInfo", "websiteSalesRank");
  return {
    asin,
    title: str(path(raw, "itemInfo", "title", "displayValue")),
    brand: str(path(raw, "itemInfo", "byLineInfo", "brand", "displayValue")),
    features: Array.isArray(features) ? features.filter((f): f is string => typeof f === "string").slice(0, 8) : [],
    productGroup: str(path(raw, "itemInfo", "classifications", "productGroup", "displayValue")),
    priceAmount: numOrNull(pick(money, "amount")) ?? numOrNull(path(listing, "price", "amount")),
    priceCurrency: str(pick(money, "currency")) ?? str(path(listing, "price", "currency")),
    availabilityType: str(path(listing, "availability", "type")),
    availabilityMessage: str(path(listing, "availability", "message")),
    rating: numOrNull(path(raw, "customerReviews", "starRating", "value")),
    reviewCount: numOrNull(path(raw, "customerReviews", "count")),
    salesRank: numOrNull(pick(ranks, "salesRank")),
    detailPageUrl: str(pick(raw, "detailPageURL")) ?? str(pick(raw, "detailPageUrl")),
    imageUrl: str(path(raw, "images", "primary", "large", "url")),
  };
}

function itemsFrom(json: unknown, container: "searchResult" | "itemsResult"): AmazonItem[] {
  const items = path(json, container, "items");
  return Array.isArray(items) ? items.map(mapItem).filter((x): x is AmazonItem => x !== null) : [];
}

export async function searchItems(params: {
  keywords: string;
  searchIndex?: string;
  itemCount?: number;
  minReviewsRating?: number;
}): Promise<AmazonItem[]> {
  const json = await call<unknown>("searchItems", {
    keywords: params.keywords,
    searchIndex: params.searchIndex ?? "All",
    itemCount: Math.min(params.itemCount ?? 10, 10),
    resources: DEFAULT_RESOURCES,
    ...(params.minReviewsRating ? { minReviewsRating: params.minReviewsRating } : {}),
  });
  return itemsFrom(json, "searchResult");
}

/** Fetches up to 10 ASINs per call (API limit); larger lists are chunked. */
export async function getItems(asins: string[]): Promise<AmazonItem[]> {
  const out: AmazonItem[] = [];
  for (let i = 0; i < asins.length; i += 10) {
    const json = await call<unknown>("getItems", { itemIds: asins.slice(i, i + 10), resources: DEFAULT_RESOURCES });
    out.push(...itemsFrom(json, "itemsResult"));
  }
  return out;
}

export function availabilityFromType(type: string | null): "in_stock" | "out_of_stock" | "unknown" {
  if (!type) return "unknown";
  const t = type.toLowerCase();
  if (t === "now" || t.includes("in_stock") || t === "instock") return "in_stock";
  if (t.includes("out") || t.includes("unavailable")) return "out_of_stock";
  return "unknown";
}

/** Test-only hook. */
export function __resetAmazonClientForTests() {
  cachedToken = null;
  lastCallAt = 0;
}
