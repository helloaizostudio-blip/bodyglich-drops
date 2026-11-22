import { getSettings } from "@/database/settings";
import { getProductByAsin, listProducts, listPins, updateProductFields } from "@/database/repositories";
import type { AppSettings, Product } from "@/database/types";
import { config } from "@/utils/config";
import { audit } from "@/utils/audit";
import { nowIso } from "@/utils/ids";
import { activeCampaigns } from "@/services/trends/seasonal-calendar";
import { getTrendKeywords } from "@/services/trends/pinterest-trends";
import { availabilityFromType, getItems, searchItems, type AmazonItem } from "@/services/amazon/creators-client";
import { CATEGORIES, isCategoryKey, type CategoryKey } from "./categories";
import { evaluateAndStore } from "./evaluate";
import { generatePinsForProduct } from "@/services/content-generation/pipeline";

export interface SearchPlanItem {
  keyword: string;
  category: CategoryKey;
  campaign: string | null;
  reason: string;
}

function guessCategory(keyword: string, enabled: CategoryKey[]): CategoryKey {
  const k = keyword.toLowerCase();
  for (const c of enabled) {
    if (CATEGORIES[c].seedKeywords.some((s) => s.split(" ").some((w) => w.length > 3 && k.includes(w)))) return c;
  }
  return enabled.includes("gifts") ? "gifts" : enabled[0] ?? "seasonal";
}

/**
 * Builds the list of searches for one discovery run: active/upcoming seasonal campaigns first,
 * then Pinterest trend keywords, custom keywords, and rotating category seeds.
 */
export function buildSearchPlan(
  settings: AppSettings,
  trendKeywords: string[],
  now = new Date(),
): SearchPlanItem[] {
  const enabled = settings.discovery.categories;
  const plan: SearchPlanItem[] = [];
  const seen = new Set<string>();
  const add = (item: SearchPlanItem) => {
    const k = item.keyword.toLowerCase().trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    plan.push(item);
  };
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  const rotate = <T,>(arr: T[]) => (arr.length ? arr.map((_, i) => arr[(i + dayIndex) % arr.length]) : arr);

  const seasonal: SearchPlanItem[] = [];
  for (const r of activeCampaigns(now, settings.discovery.lookaheadDays)) {
    const cat = r.campaign.categories.find((c) => enabled.includes(c));
    if (!cat) continue;
    for (const kw of rotate(r.campaign.keywords)) {
      seasonal.push({
        keyword: kw,
        category: guessCategory(kw, r.campaign.categories.filter((c) => enabled.includes(c))),
        campaign: r.campaign.key,
        reason: `${r.campaign.label} (${r.state})`,
      });
    }
  }
  const trends = trendKeywords.slice(0, 10).map((kw) => ({ keyword: kw, category: guessCategory(kw, enabled), campaign: null, reason: "Pinterest trend" }));
  const custom = settings.discovery.customKeywords.map((line) => {
    const [kw, cat] = line.split("|").map((s) => s.trim());
    return { keyword: kw, category: isCategoryKey(cat) ? cat : guessCategory(kw, enabled), campaign: null, reason: "Custom keyword" };
  });
  const seeds = rotate(enabled.flatMap((c) => CATEGORIES[c].seedKeywords.map((kw) => ({ keyword: kw, category: c, campaign: null, reason: `${CATEGORIES[c].label} seed` }))));

  // Interleave so one source cannot use the whole budget; seasonal campaigns get double weight.
  const max = settings.discovery.maxSearchesPerRun;
  const sources: [SearchPlanItem[], number][] = [
    [seasonal, 2],
    [trends, 1],
    [custom, 1],
    [seeds, 1],
  ];
  const idx = sources.map(() => 0);
  while (plan.length < max && sources.some(([s], i) => idx[i] < s.length)) {
    sources.forEach(([s, weight], i) => {
      for (let k = 0; k < weight && idx[i] < s.length && plan.length < max; k++) add(s[idx[i]++]);
    });
  }
  return plan;
}

export function itemToProductInput(item: AmazonItem, ctx: { category: CategoryKey; campaign: string | null; keyword: string | null }) {
  return {
    asin: item.asin,
    marketplace: config.amazon.marketplace,
    source: "creators_api" as const,
    title: item.title ?? "",
    brand: item.brand,
    category: ctx.category,
    search_index: CATEGORIES[ctx.category].searchIndex,
    features: item.features,
    price_amount: item.priceAmount,
    price_currency: item.priceCurrency ?? (item.priceAmount !== null ? "INR" : null),
    rating: item.rating,
    review_count: item.reviewCount,
    sales_rank: item.salesRank,
    availability: availabilityFromType(item.availabilityType),
    availability_message: item.availabilityMessage,
    detail_page_url: item.detailPageUrl,
    // detailPageURL from the Creators API already contains your partner tag.
    affiliate_url: item.detailPageUrl,
    link_status: "unchecked" as const,
    image_url: item.imageUrl,
    campaign: ctx.campaign,
    source_keyword: ctx.keyword,
    notes: null,
    data_fetched_at: nowIso(),
  };
}

export async function runDiscovery(opts: { actor?: "user" | "worker"; maxSearches?: number } = {}) {
  const actor = opts.actor ?? "worker";
  const settings = await getSettings();
  if (!config.amazon.apiConfigured) {
    return { summary: "skipped: Amazon Creators API not configured — use manual import", discovered: 0, shortlisted: 0 };
  }
  const trendKeywords = (await getTrendKeywords()).map((t) => t.keyword);
  const plan = buildSearchPlan(
    { ...settings, discovery: { ...settings.discovery, maxSearchesPerRun: opts.maxSearches ?? settings.discovery.maxSearchesPerRun } },
    trendKeywords,
  );

  let discovered = 0;
  let newShortlisted = 0;
  const errors: string[] = [];
  for (const item of plan) {
    try {
      const results = await searchItems({ keywords: item.keyword, searchIndex: CATEGORIES[item.category].searchIndex, itemCount: 10 });
      for (const r of results) {
        const existing = await getProductByAsin(r.asin);
        if (existing && (existing.status === "archived" || existing.status === "rejected") && existing.source === "manual") continue;
        const stored = await evaluateAndStore(itemToProductInput(r, { category: item.category, campaign: item.campaign, keyword: item.keyword }));
        discovered++;
        if (stored.status === "shortlisted" && existing?.status !== "shortlisted") newShortlisted++;
      }
      await audit("info", actor, "discovery.search", `"${item.keyword}" → ${results.length} items`, { details: item });
    } catch (err) {
      errors.push(`${item.keyword}: ${(err as Error).message}`);
      await audit("error", actor, "discovery.search", `Search "${item.keyword}" failed: ${(err as Error).message}`);
    }
  }

  const generated = await autoGenerateForTopProducts(settings, actor);
  return {
    summary: `${plan.length} searches, ${discovered} products evaluated, ${newShortlisted} newly shortlisted, ${generated} products sent to content generation${errors.length ? `, ${errors.length} errors` : ""}`,
    discovered,
    shortlisted: newShortlisted,
  };
}

/** Generates pin drafts for the best shortlisted products that do not have pins yet. */
export async function autoGenerateForTopProducts(settings: AppSettings, actor: "user" | "worker") {
  const n = settings.discovery.autoGenerateTopN;
  if (n <= 0) return 0;
  const shortlisted = await listProducts({ status: "shortlisted", limit: 100 });
  let count = 0;
  for (const p of shortlisted) {
    if (count >= n) break;
    const pins = await listPins({ productId: p.id, limit: 1 });
    if (pins.length) continue;
    try {
      await generatePinsForProduct(p.id, { actor });
      count++;
    } catch (err) {
      await audit("error", actor, "content.generate", `Generation failed for ${p.asin}: ${(err as Error).message}`, {
        entityType: "product",
        entityId: p.id,
      });
    }
  }
  return count;
}

/**
 * Refreshes price/availability for products that are shortlisted or have pins waiting to publish.
 * Amazon data older than 24h is treated as stale.
 */
export async function refreshProductData(opts: { actor?: "user" | "worker" } = {}) {
  const actor = opts.actor ?? "worker";
  if (!config.amazon.apiConfigured) return { summary: "skipped: Amazon Creators API not configured" };
  const products = (await listProducts({ status: "shortlisted", limit: 200 })).filter((p) => p.source === "creators_api");
  const byAsin = new Map<string, Product>(products.map((p) => [p.asin, p]));
  if (!byAsin.size) return { summary: "no API-sourced products to refresh" };
  const items = await getItems([...byAsin.keys()]);
  let unavailable = 0;
  const returned = new Set(items.map((i) => i.asin));
  for (const item of items) {
    const p = byAsin.get(item.asin)!;
    const stored = await evaluateAndStore({
      ...itemToProductInput(item, { category: p.category, campaign: p.campaign, keyword: p.source_keyword }),
      notes: p.notes,
    });
    if (stored.availability !== "in_stock") unavailable++;
  }
  for (const [asin, p] of byAsin) {
    if (!returned.has(asin)) {
      await updateProductFields(p.id, {
        status: "rejected",
        availability: "unknown",
        rejection_reasons: [...p.rejection_reasons, "Amazon no longer returns this item"],
      });
      unavailable++;
    }
  }
  await audit("info", actor, "products.refresh", `Refreshed ${items.length} products, ${unavailable} unavailable/removed`);
  return { summary: `refreshed ${items.length} products; ${unavailable} unavailable or removed` };
}
