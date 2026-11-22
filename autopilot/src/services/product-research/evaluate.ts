import { getDb } from "@/database/client";
import { getSettings } from "@/database/settings";
import { getProduct, updateProductFields, upsertProduct, type ProductInput } from "@/database/repositories";
import type { Product } from "@/database/types";
import { config } from "@/utils/config";
import { assessProduct, scoreProduct } from "./scoring";
import { matchCampaign } from "@/services/trends/seasonal-calendar";
import { getTrendKeywords } from "@/services/trends/pinterest-trends";
import { checkAffiliateLink } from "@/services/amazon/links";
import type { CategoryKey } from "./categories";
import { getCategoryLearning } from "@/services/analytics/learning";

const SEASONAL_CATEGORIES = new Set<CategoryKey>(["christmas", "festive", "seasonal"]);

async function ownPinsByCategory(): Promise<Partial<Record<CategoryKey, number>>> {
  const db = await getDb();
  const rows = await db.all<{ category: CategoryKey; n: number }>(
    `SELECT p.category AS category, COUNT(*) AS n FROM pins x JOIN products p ON p.id = x.product_id
     WHERE x.status IN ('scheduled','sending','sent','published') GROUP BY p.category`,
  );
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
}

/**
 * Scores a product, applies rejection rules and decides its status.
 * Products the user manually rejected or archived keep that status.
 */
export async function evaluateAndStore(input: ProductInput): Promise<Product> {
  const settings = await getSettings();
  const [trends, ownPins, learning] = await Promise.all([getTrendKeywords(), ownPinsByCategory(), getCategoryLearning()]);
  const partnerTag = config.amazon.partnerTag;

  const assessment = assessProduct(input, partnerTag);
  const breakdown = scoreProduct(input, {
    settings,
    partnerTag,
    trendKeywords: trends.map((t) => ({ keyword: t.keyword, growth: t.growth_wow })),
    ownPinsByCategory: ownPins,
    categoryLearning: learning,
  });
  const match = matchCampaign(`${input.title} ${input.features.join(" ")}`, input.category, new Date(), settings.discovery.lookaheadDays);
  // Tag a campaign only when the product itself is seasonal (keyword match or a seasonal category);
  // a category-only fit still earns seasonal points but doesn't move the product to a seasonal board.
  const campaign = match && (match.keywordMatch || SEASONAL_CATEGORIES.has(input.category)) ? match : undefined;
  const link = checkAffiliateLink(input.affiliate_url, partnerTag, input.asin);

  let status: Product["status"];
  if (assessment.rejectionReasons.length) status = "rejected";
  else if (breakdown.total >= settings.discovery.minScoreToShortlist) status = "shortlisted";
  else status = "candidate";

  const existing = await upsertProduct({
    ...input,
    link_status: link.valid ? "valid" : "invalid",
    campaign: input.campaign ?? campaign?.campaign.key ?? null,
    score: breakdown.total,
    score_breakdown: breakdown,
    flags: assessment.flags,
    rejection_reasons: assessment.rejectionReasons,
    status,
  });
  return existing;
}

/** Re-scores an existing product (e.g. after settings change or a data refresh). Archived products stay archived. */
export async function rescoreProduct(id: string): Promise<Product | undefined> {
  const p = await getProduct(id);
  if (!p) return undefined;
  const updated = await evaluateAndStore(p);
  if (p.status === "archived") {
    await updateProductFields(id, { status: "archived" });
    return getProduct(id);
  }
  return updated;
}
