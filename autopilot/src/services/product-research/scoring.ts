import type { AppSettings, Product, ScoreBreakdown } from "@/database/types";
import { CATEGORIES, type CategoryKey } from "./categories";
import { matchCampaign } from "@/services/trends/seasonal-calendar";
import { checkAffiliateLink } from "@/services/amazon/links";

/**
 * Product scoring out of 100:
 *   Demand signals 25 · Buying intent 20 · Quality signals 20 ·
 *   Commission potential 15 · Seasonal relevance 10 · Competition opportunity 10
 *
 * Only real data is used. When a signal is unknown the component gets a low/neutral
 * score and a note explains why — values are never estimated or invented.
 */

export type ScoringInput = Pick<
  Product,
  | "asin" | "title" | "brand" | "category" | "features" | "price_amount" | "rating" | "review_count" | "sales_rank"
  | "availability" | "affiliate_url"
>;

export interface ScoringContext {
  settings: Pick<AppSettings, "commissionRates" | "discovery">;
  partnerTag?: string;
  now?: Date;
  /** Trending keywords (from Pinterest Trends) with growth %. */
  trendKeywords?: { keyword: string; growth: number | null }[];
  /** Number of pins already created per category (saturation of our own boards). */
  ownPinsByCategory?: Partial<Record<CategoryKey, number>>;
  /** Performance feedback from published pins (see analytics/learning.ts). */
  categoryLearning?: Partial<Record<CategoryKey, { adjust: number; note: string }>>;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

const INTENT_WORDS = [
  "gift", "set", "kit", "organiser", "organizer", "combo", "pack", "for women", "for men", "for her", "for him",
  "essential", "portable", "rechargeable", "waterproof", "storage", "decor", "decoration", "lights",
];
const VAGUE_WORDS = ["generic", "random", "assorted", "misc"];

/** Words that indicate exaggerated or unverifiable claims in a listing. */
export const MISLEADING_CLAIM_PATTERNS: RegExp[] = [
  /\bcures?\b/i,
  /\bmiracle\b/i,
  /\bguarantee[sd]?\s+(results?|weight|growth|fairness)/i,
  /\b100\s*%\s*(results?|effective|cure|guaranteed)/i,
  /\binstant(ly)?\s+(whiten|fair|weight|hair\s*growth)/i,
  /\bpermanent(ly)?\s+(hair\s*removal|whiten)/i,
  /\banti[-\s]?covid\b/i,
  /\bkills?\s+99\.9+\s*%\s*(viruses|covid)/i,
  /\bfairness\b/i,
  /\blose\s+\d+\s*kg\b/i,
];

export function findMisleadingClaims(text: string): string[] {
  return MISLEADING_CLAIM_PATTERNS.filter((re) => re.test(text)).map((re) => text.match(re)?.[0] ?? re.source);
}

export interface QualityAssessment {
  rejectionReasons: string[];
  flags: string[];
}

/** Hard rejection rules. Products failing any of these never reach the approval queue. */
export function assessProduct(p: ScoringInput, partnerTag?: string): QualityAssessment {
  const reasons: string[] = [];
  const flags: string[] = [];

  if (!p.title || p.title.trim().length < 12) reasons.push("Insufficient information: missing or very short title");
  if (p.price_amount === null) flags.push("Price unknown");
  if (p.rating === null && p.review_count === null && p.sales_rank === null) {
    reasons.push("Insufficient information: no rating, review count or sales rank available");
  }

  if (p.availability === "out_of_stock") reasons.push("Unavailable (out of stock)");
  if (p.availability === "unknown") flags.push("Availability unknown — refresh before publishing");

  const link = checkAffiliateLink(p.affiliate_url, partnerTag, p.asin);
  if (!link.valid) reasons.push(`No valid affiliate link: ${link.reason}`);
  else if (link.kind === "short") flags.push("Short link — tracking ID not verifiable offline");

  if (p.rating !== null && p.rating < 3.8) reasons.push(`Poor quality signal: rating ${p.rating} below 3.8`);
  if (p.review_count !== null && p.review_count < 25) flags.push(`Only ${p.review_count} reviews`);

  // Suspicious review patterns (aggregate heuristics — we only see totals, not individual reviews).
  if (p.rating !== null && p.review_count !== null) {
    if (p.rating >= 4.8 && p.review_count < 30) reasons.push("Suspicious review pattern: near-perfect rating from very few reviews");
    if (p.rating >= 4.95 && p.review_count >= 30) reasons.push("Suspicious review pattern: implausibly perfect rating at volume");
  }

  const claims = findMisleadingClaims(`${p.title} ${(p.features ?? []).join(" ")}`);
  if (claims.length) reasons.push(`Misleading or unverifiable claims in listing: ${claims.slice(0, 3).join(", ")}`);
  if (CATEGORIES[p.category]?.sensitiveClaims) flags.push("Health/beauty category — copy must not make effectiveness claims");

  return { rejectionReasons: reasons, flags };
}

export function scoreProduct(p: ScoringInput, ctx: ScoringContext): ScoreBreakdown {
  const notes: string[] = [];
  const now = ctx.now ?? new Date();
  const text = `${p.title} ${(p.features ?? []).join(" ")}`.toLowerCase();

  // ── Demand (25) — review volume (log-scaled), sales rank, Pinterest trend match ──
  let demand = 0;
  if (p.review_count !== null) {
    demand += clamp((Math.log10(Math.max(p.review_count, 1)) / 4) * 15, 0, 15); // 10k reviews → 15
  } else notes.push("Demand: review count unknown");
  if (p.sales_rank !== null) {
    demand += clamp(6 - Math.log10(Math.max(p.sales_rank, 1)), 0, 6); // rank 1 → 6, rank ≥1M → 0
  } else notes.push("Demand: sales rank unavailable");
  const trendHit = (ctx.trendKeywords ?? []).find((t) =>
    t.keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 3).every((w) => text.includes(w)),
  );
  if (trendHit) {
    demand += 4;
    notes.push(`Demand: matches Pinterest trend "${trendHit.keyword}"`);
  }
  const learning = ctx.categoryLearning?.[p.category];
  if (learning) {
    demand += learning.adjust;
    notes.push(learning.note);
  }
  demand = clamp(demand, 0, 25);

  // ── Buying intent (20) — specificity, gift/solution language, affordable price band ──
  let intent = 6;
  const intentHits = INTENT_WORDS.filter((w) => text.includes(w)).length;
  intent += Math.min(intentHits, 3) * 2;
  if (VAGUE_WORDS.some((w) => text.includes(w))) intent -= 3;
  if (p.price_amount !== null) {
    if (p.price_amount >= 199 && p.price_amount <= 2499) intent += 8;
    else if (p.price_amount > 2499 && p.price_amount <= 6999) intent += 5;
    else if (p.price_amount < 199) intent += 2;
    else intent += 2;
  } else notes.push("Intent: price unknown");
  intent = clamp(intent, 0, 20);

  // ── Quality signals (20) — rating and review credibility ──
  let quality = 0;
  if (p.rating !== null) {
    quality += clamp(((p.rating - 3.5) / 1.3) * 14, 0, 14); // 4.8 → 14
    if (p.review_count !== null) quality += clamp(Math.log10(Math.max(p.review_count, 1)) * 2, 0, 6);
  } else {
    notes.push("Quality: rating unknown");
  }
  quality = clamp(quality, 0, 20);

  // ── Commission potential (15) — user-entered category rate × price ──
  let commission: number;
  const rate = ctx.settings.commissionRates[p.category];
  if (rate === undefined || rate === null) {
    commission = 4;
    notes.push("Commission: rate for this category not set in Settings (neutral score)");
  } else if (p.price_amount === null) {
    commission = clamp(rate * 1.2, 0, 8);
    notes.push("Commission: price unknown, scored on rate only");
  } else {
    const perSale = (p.price_amount * rate) / 100;
    commission = clamp((Math.log10(Math.max(perSale, 1)) / Math.log10(500)) * 15, 0, 15); // ₹500/sale → 15
    notes.push(`Commission: ~₹${Math.round(perSale)} per sale at ${rate}% (your entered rate, before returns)`);
  }

  // ── Seasonal relevance (10) ──
  const match = matchCampaign(text, p.category, now, ctx.settings.discovery.lookaheadDays);
  const seasonal = match ? clamp(match.fit * 10, 0, 10) : 0;
  if (match) notes.push(`Seasonal: fits "${match.campaign.label}" (${match.state})`);

  // ── Competition opportunity (10) — saturation of our own boards + niche specificity ──
  const ownPins = ctx.ownPinsByCategory?.[p.category] ?? 0;
  let competition = 10 - Math.min(ownPins, 30) / 5; // many existing pins in this category → less fresh opportunity
  const titleWords = p.title.split(/\s+/).length;
  if (titleWords < 4) competition -= 2; // very generic listing title
  competition = clamp(competition, 0, 10);
  notes.push("Competition: heuristic (own board saturation + listing specificity)");

  const total = r1(demand + intent + quality + commission + seasonal + competition);
  return {
    demand: r1(demand),
    intent: r1(intent),
    quality: r1(quality),
    commission: r1(commission),
    seasonal: r1(seasonal),
    competition: r1(competition),
    total,
    notes,
  };
}
