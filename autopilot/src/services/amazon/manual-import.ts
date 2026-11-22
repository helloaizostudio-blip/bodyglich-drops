import Papa from "papaparse";
import { z } from "zod";
import { config } from "@/utils/config";
import { audit } from "@/utils/audit";
import { evaluateAndStore } from "@/services/product-research/evaluate";
import { CATEGORY_KEYS } from "@/services/product-research/categories";
import { extractAsin, isValidAsin } from "./links";
import type { Product } from "@/database/types";

/**
 * Manual product import for when the Creators API is unavailable.
 * Enter products and affiliate links generated in Associates Central / SiteStripe.
 * Ratings and review counts are optional: leave them blank if you do not have them —
 * the app will never fill them in.
 */
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? Number(v.replace(/[₹,\s]/g, "")) : v),
  z.number().finite().nonnegative().nullable(),
);

export const ManualProductSchema = z.object({
  asin: z.string().trim().toUpperCase().optional().default(""),
  title: z.string().trim().min(5, "Title is required"),
  category: z.enum(CATEGORY_KEYS),
  affiliate_url: z.string().trim().url("Affiliate link must be a full URL"),
  brand: z.string().trim().optional().default(""),
  price: optionalNumber.optional().default(null),
  rating: optionalNumber.optional().default(null).refine((v) => v === null || v <= 5, "Rating must be 0–5"),
  review_count: optionalNumber.optional().default(null),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]).optional().default("unknown"),
  features: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type ManualProduct = z.infer<typeof ManualProductSchema>;

export async function importManualProduct(raw: unknown, actor: "user" | "worker" = "user"): Promise<Product> {
  const m = ManualProductSchema.parse(raw);
  const asin = m.asin || extractAsin(m.affiliate_url) || "";
  if (!isValidAsin(asin)) {
    throw new Error("ASIN is required (10 characters). Short amzn.to links do not contain it — enter it separately.");
  }
  const product = await evaluateAndStore({
    asin,
    marketplace: config.amazon.marketplace,
    source: "manual",
    title: m.title,
    brand: m.brand || null,
    category: m.category,
    search_index: null,
    features: m.features
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8),
    price_amount: m.price,
    price_currency: m.price !== null ? "INR" : null,
    rating: m.rating,
    review_count: m.review_count === null ? null : Math.round(m.review_count),
    sales_rank: null,
    availability: m.availability,
    availability_message: null,
    detail_page_url: null,
    affiliate_url: m.affiliate_url,
    link_status: "unchecked",
    image_url: null,
    campaign: null,
    source_keyword: null,
    notes: m.notes || null,
    data_fetched_at: new Date().toISOString(),
  });
  await audit("info", actor, "product.import", `Imported ${asin} manually → ${product.status} (score ${product.score})`, {
    entityType: "product",
    entityId: product.id,
  });
  return product;
}

export interface CsvImportResult {
  imported: number;
  failed: { row: number; error: string }[];
}

export async function importProductsCsv(csv: string, actor: "user" | "worker" = "user"): Promise<CsvImportResult> {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const result: CsvImportResult = { imported: 0, failed: [] };
  for (const [i, row] of parsed.data.entries()) {
    try {
      await importManualProduct(row, actor);
      result.imported++;
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") : (err as Error).message;
      result.failed.push({ row: i + 2, error: msg });
    }
  }
  await audit(result.failed.length ? "warn" : "info", actor, "product.import_csv", `CSV import: ${result.imported} imported, ${result.failed.length} failed`, {
    details: result.failed.slice(0, 20),
  });
  return result;
}

export const MANUAL_CSV_TEMPLATE =
  "asin,title,category,affiliate_url,brand,price,rating,review_count,availability,features,notes\n" +
  "B0XXXXXXXX,Example product title from Amazon,home_decor,https://www.amazon.in/dp/B0XXXXXXXX?tag=yourtag-21,Brand,999,,,in_stock,Feature one; Feature two,\n";
