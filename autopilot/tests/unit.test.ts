import { describe, expect, it } from "vitest";
import { checkAffiliateLink, extractAsin } from "@/services/amazon/links";
import { mapItem, availabilityFromType } from "@/services/amazon/creators-client";
import { assessProduct, scoreProduct, type ScoringInput } from "@/services/product-research/scoring";
import { applyCompliance, validateForPublishing, ASSOCIATES_STATEMENT, DESCRIPTION_MAX } from "@/services/content-generation/compliance";
import { assignSlots } from "@/services/scheduler/slots";
import { activeCampaigns, campaignRelevance, CAMPAIGNS, matchCampaign } from "@/services/trends/seasonal-calendar";
import { recommendBoard } from "@/services/pinterest/boards";
import { DEFAULT_SETTINGS } from "@/database/settings";
import { buildSearchPlan } from "@/services/product-research/discovery";
import { wrapText } from "@/services/image-generation/templates";
import { zonedDateKey, zonedTimeToUtc } from "@/utils/time";
import { toPgPlaceholders } from "@/database/client";

const TAG = "mytag-21";

describe("affiliate links", () => {
  it("accepts amazon.in links with the right tag", () => {
    const r = checkAffiliateLink("https://www.amazon.in/dp/B0ABCDEFGH?tag=mytag-21", TAG, "B0ABCDEFGH");
    expect(r.valid).toBe(true);
    expect(r.asin).toBe("B0ABCDEFGH");
  });
  it("rejects wrong tag, missing tag, other marketplaces and http", () => {
    expect(checkAffiliateLink("https://www.amazon.in/dp/B0ABCDEFGH?tag=other-21", TAG).valid).toBe(false);
    expect(checkAffiliateLink("https://www.amazon.in/dp/B0ABCDEFGH", TAG).valid).toBe(false);
    expect(checkAffiliateLink("https://www.amazon.com/dp/B0ABCDEFGH?tag=mytag-21", TAG).valid).toBe(false);
    expect(checkAffiliateLink("http://www.amazon.in/dp/B0ABCDEFGH?tag=mytag-21", TAG).valid).toBe(false);
    expect(checkAffiliateLink("https://evil.example/amazon.in?tag=mytag-21", TAG).valid).toBe(false);
    expect(checkAffiliateLink(null, TAG).valid).toBe(false);
  });
  it("rejects a link to a different ASIN", () => {
    expect(checkAffiliateLink("https://www.amazon.in/dp/B0ZZZZZZZZ?tag=mytag-21", TAG, "B0ABCDEFGH").valid).toBe(false);
  });
  it("accepts the newer link.amazon short links", () => {
    expect(checkAffiliateLink("https://link.amazon/B04R8u9lQ", TAG).kind).toBe("short");
  });
  it("accepts SiteStripe short links but flags them", () => {
    const r = checkAffiliateLink("https://amzn.to/3abcDEF", TAG);
    expect(r.valid).toBe(true);
    expect(r.kind).toBe("short");
  });
  it("extracts ASINs from common URL shapes", () => {
    expect(extractAsin("/Some-Product/dp/B0ABCDEFGH/ref=sr_1_1")).toBe("B0ABCDEFGH");
    expect(extractAsin("/gp/product/B0ABCDEFGH?psc=1")).toBe("B0ABCDEFGH");
  });
});

describe("Creators API response mapping", () => {
  it("maps camelCase fields and leaves missing data null", () => {
    const item = mapItem({
      asin: "B0ABCDEFGH",
      detailPageURL: "https://www.amazon.in/dp/B0ABCDEFGH?tag=mytag-21",
      itemInfo: { title: { displayValue: "Ceramic Vase Set" }, features: { displayValues: ["Handmade", "Set of 3"] } },
      offersV2: { listings: [{ price: { money: { amount: 899, currency: "INR" } }, availability: { type: "IN_STOCK" } }] },
    })!;
    expect(item.title).toBe("Ceramic Vase Set");
    expect(item.priceAmount).toBe(899);
    expect(item.features).toEqual(["Handmade", "Set of 3"]);
    expect(item.rating).toBeNull();
    expect(item.reviewCount).toBeNull();
    expect(availabilityFromType(item.availabilityType)).toBe("in_stock");
  });
  it("also reads PA-API style PascalCase", () => {
    const item = mapItem({ ASIN: "B0ABCDEFGH", ItemInfo: { Title: { DisplayValue: "X" } }, CustomerReviews: { Count: 120, StarRating: { Value: 4.3 } } })!;
    expect(item.asin).toBe("B0ABCDEFGH");
    expect(item.reviewCount).toBe(120);
    expect(item.rating).toBe(4.3);
  });
});

const base: ScoringInput = {
  asin: "B0ABCDEFGH",
  title: "Warm LED Fairy Lights for Christmas Tree Decoration, 10 m",
  brand: "Brand",
  category: "christmas",
  features: ["Warm white", "USB powered"],
  price_amount: 499,
  rating: 4.3,
  review_count: 5400,
  sales_rank: 1200,
  availability: "in_stock",
  affiliate_url: "https://www.amazon.in/dp/B0ABCDEFGH?tag=mytag-21",
};
const ctx = { settings: { ...DEFAULT_SETTINGS, commissionRates: { christmas: 6 } }, partnerTag: TAG, now: new Date("2026-12-01T06:00:00Z") };

describe("product scoring", () => {
  it("scores a strong seasonal product well and stays within 100", () => {
    const s = scoreProduct(base, ctx);
    expect(s.total).toBeGreaterThan(60);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(s.seasonal).toBeGreaterThan(5);
    expect(s.demand).toBeLessThanOrEqual(25);
  });
  it("never invents data: unknown signals score low with an explanation", () => {
    const s = scoreProduct({ ...base, rating: null, review_count: null, sales_rank: null }, { ...ctx, settings: DEFAULT_SETTINGS });
    expect(s.demand).toBe(0);
    expect(s.quality).toBe(0);
    expect(s.notes.join(" ")).toMatch(/review count unknown/);
    expect(s.notes.join(" ")).toMatch(/rate for this category not set/);
  });
  it("applies learning adjustments", () => {
    const up = scoreProduct(base, { ...ctx, categoryLearning: { christmas: { adjust: 3, note: "Learning: good" } } });
    const plain = scoreProduct(base, ctx);
    expect(up.demand).toBeGreaterThanOrEqual(plain.demand);
  });
});

describe("rejection rules", () => {
  it("passes a healthy product", () => {
    expect(assessProduct(base, TAG).rejectionReasons).toEqual([]);
  });
  it.each([
    [{ availability: "out_of_stock" as const }, /Unavailable/],
    [{ affiliate_url: null }, /No valid affiliate link/],
    [{ rating: 3.2 }, /Poor quality/],
    [{ rating: 4.9, review_count: 12 }, /Suspicious review pattern/],
    [{ rating: null, review_count: null, sales_rank: null }, /Insufficient information/],
    [{ title: "Miracle cream that cures acne in 3 days" }, /Misleading/],
  ])("rejects %o", (patch, re) => {
    expect(assessProduct({ ...base, ...patch }, TAG).rejectionReasons.join(" ")).toMatch(re);
  });
});

describe("compliance", () => {
  it("adds disclosures, strips prices and enforces limits", () => {
    const r = applyCompliance({
      title: "Best fairy lights only ₹499 #ad",
      description: "Gorgeous lights for ₹499. ".repeat(40),
      headline: "Glow up for Rs. 499",
      subheadline: null,
      altText: "Lights",
      sensitiveCategory: false,
    });
    expect(r.title).not.toMatch(/₹|499/);
    expect(r.headline).not.toMatch(/499/);
    expect(r.description.startsWith("#ad ")).toBe(true);
    expect(r.description.endsWith(ASSOCIATES_STATEMENT)).toBe(true);
    expect(r.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(r.flags.join(" ")).toMatch(/price/i);
    expect(validateForPublishing({ title: r.title, description: r.description, link: "x", board: "b" })).toEqual([]);
  });
  it("flags skincare effectiveness claims", () => {
    const r = applyCompliance({ title: "Serum that removes acne", description: "Clinically proven anti-ageing", headline: "h", altText: "a", sensitiveCategory: true });
    expect(r.flags.join(" ")).toMatch(/Health\/beauty claim/);
  });
  it("blocks publishing without disclosure", () => {
    expect(validateForPublishing({ title: "t", description: "no disclosure", link: "l", board: "b" }).length).toBeGreaterThan(0);
  });
});

describe("posting slots", () => {
  const schedule = { paused: false, pinsPerDay: 2, postingTimes: ["11:00", "20:30"], minGapMinutes: 180, productCooldownDays: 7 };
  const now = new Date("2026-11-22T00:00:00Z"); // 05:30 IST
  it("respects daily limit, posting times and product cooldown", () => {
    const pins = [
      { id: "a1", productId: "A", style: "editorial" },
      { id: "a2", productId: "A", style: "minimal" },
      { id: "b1", productId: "B", style: "editorial" },
      { id: "c1", productId: "C", style: "magazine" },
    ];
    const out = assignSlots(pins, [], schedule, now, "Asia/Kolkata");
    expect(out).toHaveLength(4);
    const byDay = new Map<string, number>();
    for (const a of out) byDay.set(zonedDateKey(a.at, "Asia/Kolkata"), (byDay.get(zonedDateKey(a.at, "Asia/Kolkata")) ?? 0) + 1);
    expect(Math.max(...byDay.values())).toBeLessThanOrEqual(2);
    const a1 = out.find((x) => x.pinId === "a1")!.at.getTime();
    const a2 = out.find((x) => x.pinId === "a2")!.at.getTime();
    expect(Math.abs(a2 - a1)).toBeGreaterThanOrEqual(7 * 86_400_000);
    // First slot is today 11:00 IST = 05:30 UTC
    expect(out[0].at.toISOString()).toBe("2026-11-22T05:30:00.000Z");
  });
  it("alternates styles when possible", () => {
    const pins = [
      { id: "x", productId: "X", style: "editorial" },
      { id: "y", productId: "Y", style: "editorial" },
      { id: "z", productId: "Z", style: "minimal" },
    ];
    const out = assignSlots(pins, [], schedule, now, "Asia/Kolkata");
    expect(out.map((o) => o.pinId)).toEqual(["x", "z", "y"]);
  });
  it("skips slots already taken", () => {
    const occupied = [{ at: new Date("2026-11-22T05:30:00Z"), productId: "Q", style: "minimal" }];
    const out = assignSlots([{ id: "p", productId: "P", style: "editorial" }], occupied, schedule, now, "Asia/Kolkata");
    expect(out[0].at.toISOString()).toBe("2026-11-22T15:00:00.000Z"); // 20:30 IST
  });
});

describe("seasonal calendar", () => {
  it("treats Christmas as active in early December and upcoming in mid-October", () => {
    const xmas = CAMPAIGNS.find((c) => c.key === "christmas")!;
    expect(campaignRelevance(xmas, new Date("2026-12-05T00:00:00Z"), 45).state).toBe("active");
    expect(campaignRelevance(xmas, new Date("2026-10-15T00:00:00Z"), 45).state).toBe("upcoming");
    expect(campaignRelevance(xmas, new Date("2026-06-15T00:00:00Z"), 45).state).toBe("inactive");
  });
  it("handles windows that wrap the new year", () => {
    const keys = activeCampaigns(new Date("2027-01-10T00:00:00Z"), 30).map((r) => r.campaign.key);
    expect(keys).toContain("winter_fashion");
    expect(keys).toContain("new_year_organisation");
  });
  it("matches products to campaigns", () => {
    expect(matchCampaign("christmas fairy lights warm white", "christmas", new Date("2026-12-01T00:00:00Z"))?.campaign.key).toBe("christmas");
  });
});

describe("boards and discovery plan", () => {
  it("prefers a campaign board over the category board", () => {
    expect(recommendBoard(DEFAULT_SETTINGS.boards, { category: "fashion", campaign: "winter_fashion", title: "Puffer jacket" }).name).toBe("Winter Fashion");
    expect(recommendBoard(DEFAULT_SETTINGS.boards, { category: "kitchen", campaign: null, title: "Spice jars" }).name).toBe("Kitchen Finds");
  });
  it("builds a bounded, de-duplicated plan led by seasonal keywords", () => {
    const plan = buildSearchPlan(DEFAULT_SETTINGS, ["cosy reading nook"], new Date("2026-11-22T00:00:00Z"));
    expect(plan.length).toBe(DEFAULT_SETTINGS.discovery.maxSearchesPerRun);
    expect(new Set(plan.map((p) => p.keyword)).size).toBe(plan.length);
    expect(plan[0].campaign).not.toBeNull();
    expect(plan.some((p) => p.reason === "Pinterest trend")).toBe(true);
  });
});

describe("utilities", () => {
  it("wraps text into lines", () => {
    const lines = wrapText("Cosy winter layers you will actually wear every day", 400, 60, "Inter");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toContain("Cosy");
  });
  it("converts IST wall time to UTC", () => {
    expect(zonedTimeToUtc("2026-11-22", "20:30", "Asia/Kolkata").toISOString()).toBe("2026-11-22T15:00:00.000Z");
  });
  it("converts placeholders for PostgreSQL", () => {
    expect(toPgPlaceholders("SELECT * FROM t WHERE a = ? AND b IN (?, ?)")).toBe("SELECT * FROM t WHERE a = $1 AND b IN ($2, $3)");
  });
});
