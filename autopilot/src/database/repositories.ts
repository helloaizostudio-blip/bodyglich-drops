import { getDb, type Param } from "./client";
import type { Pin, PinStatus, Product, ProductStatus } from "./types";
import { newId, nowIso } from "@/utils/ids";

// ─── JSON column helpers ──────────────────────────────────────────────
function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string" || v === "") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    ...(r as unknown as Product),
    features: parseJson(r.features, []),
    flags: parseJson(r.flags, []),
    rejection_reasons: parseJson(r.rejection_reasons, []),
    score_breakdown: parseJson(r.score_breakdown, null),
    price_amount: num(r.price_amount),
    rating: num(r.rating),
    review_count: num(r.review_count),
    sales_rank: num(r.sales_rank),
    score: num(r.score),
  };
}

function rowToPin(r: Record<string, unknown>): Pin {
  return {
    ...(r as unknown as Pin),
    keywords: parseJson(r.keywords, []),
    compliance_flags: parseJson(r.compliance_flags, []),
    attempts: Number(r.attempts ?? 0),
    concept_index: Number(r.concept_index ?? 0),
  };
}

// ─── Products ────────────────────────────────────────────────────────
export type ProductInput = Omit<Product, "id" | "created_at" | "updated_at" | "status" | "score" | "score_breakdown" | "flags" | "rejection_reasons"> &
  Partial<Pick<Product, "status" | "score" | "score_breakdown" | "flags" | "rejection_reasons">>;

const PRODUCT_COLS = [
  "asin", "marketplace", "source", "title", "brand", "category", "search_index", "features", "price_amount",
  "price_currency", "rating", "review_count", "sales_rank", "availability", "availability_message",
  "detail_page_url", "affiliate_url", "link_status", "image_url", "campaign", "source_keyword", "status", "score",
  "score_breakdown", "flags", "rejection_reasons", "notes", "data_fetched_at",
] as const;

function productParams(p: ProductInput): Param[] {
  const v: Record<string, unknown> = {
    ...p,
    status: p.status ?? "candidate",
    score: p.score ?? null,
    features: JSON.stringify(p.features ?? []),
    score_breakdown: p.score_breakdown ? JSON.stringify(p.score_breakdown) : null,
    flags: JSON.stringify(p.flags ?? []),
    rejection_reasons: JSON.stringify(p.rejection_reasons ?? []),
  };
  return PRODUCT_COLS.map((c) => (v[c] === undefined ? null : (v[c] as Param)));
}

/** Inserts or updates a product by ASIN. Returns the stored product. */
export async function upsertProduct(p: ProductInput): Promise<Product> {
  const db = await getDb();
  const now = nowIso();
  const existing = await db.get<{ id: string; status: string }>(`SELECT id, status FROM products WHERE asin = ?`, [p.asin]);
  if (existing) {
    const sets = PRODUCT_COLS.filter((c) => c !== "asin").map((c) => `${c} = ?`).join(", ");
    const params = productParams(p).slice(1);
    await db.run(`UPDATE products SET ${sets}, updated_at = ? WHERE id = ?`, [...params, now, existing.id]);
    return (await getProduct(existing.id))!;
  }
  const id = newId("prd");
  await db.run(
    `INSERT INTO products (id, ${PRODUCT_COLS.join(", ")}, created_at, updated_at)
     VALUES (?, ${PRODUCT_COLS.map(() => "?").join(", ")}, ?, ?)`,
    [id, ...productParams(p), now, now],
  );
  return (await getProduct(id))!;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const db = await getDb();
  const r = await db.get(`SELECT * FROM products WHERE id = ?`, [id]);
  return r ? rowToProduct(r) : undefined;
}

export async function getProductByAsin(asin: string): Promise<Product | undefined> {
  const db = await getDb();
  const r = await db.get(`SELECT * FROM products WHERE asin = ?`, [asin]);
  return r ? rowToProduct(r) : undefined;
}

export async function listProducts(filter: { status?: ProductStatus; category?: string; limit?: number } = {}) {
  const db = await getDb();
  const where: string[] = [];
  const params: Param[] = [];
  if (filter.status) {
    where.push("status = ?");
    params.push(filter.status);
  }
  if (filter.category) {
    where.push("category = ?");
    params.push(filter.category);
  }
  const rows = await db.all(
    `SELECT * FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE WHEN score IS NULL THEN 1 ELSE 0 END, score DESC, updated_at DESC LIMIT ?`,
    [...params, filter.limit ?? 500],
  );
  return rows.map(rowToProduct);
}

export async function updateProductFields(id: string, fields: Partial<Product>) {
  const db = await getDb();
  const entries = Object.entries(fields).filter(([k]) => k !== "id" && k !== "created_at");
  if (!entries.length) return;
  const json = new Set(["features", "flags", "rejection_reasons", "score_breakdown"]);
  const sets = entries.map(([k]) => `${k} = ?`).join(", ");
  const params = entries.map(([k, v]) => (json.has(k) ? JSON.stringify(v) : (v as Param)));
  await db.run(`UPDATE products SET ${sets}, updated_at = ? WHERE id = ?`, [...params, nowIso(), id]);
}

// ─── Pins ────────────────────────────────────────────────────────────
export type PinInput = Pick<
  Pin,
  | "product_id" | "concept_index" | "style" | "headline" | "subheadline" | "title" | "description" | "keywords"
  | "board" | "link" | "alt_text" | "disclosure" | "campaign" | "image_file" | "image_source" | "image_prompt"
  | "copy_source" | "compliance_flags"
>;

export async function createPin(p: PinInput): Promise<Pin> {
  const db = await getDb();
  const id = newId("pin");
  const now = nowIso();
  await db.run(
    `INSERT INTO pins (id, product_id, concept_index, style, headline, subheadline, title, description, keywords,
       board, link, alt_text, disclosure, campaign, image_file, image_source, image_prompt, copy_source,
       compliance_flags, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [
      id, p.product_id, p.concept_index, p.style, p.headline, p.subheadline, p.title, p.description,
      JSON.stringify(p.keywords), p.board, p.link, p.alt_text, p.disclosure, p.campaign, p.image_file,
      p.image_source, p.image_prompt, p.copy_source, JSON.stringify(p.compliance_flags), now, now,
    ],
  );
  return (await getPin(id))!;
}

export async function getPin(id: string): Promise<Pin | undefined> {
  const db = await getDb();
  const r = await db.get(`SELECT * FROM pins WHERE id = ?`, [id]);
  return r ? rowToPin(r) : undefined;
}

export async function listPins(filter: { status?: PinStatus | PinStatus[]; productId?: string; limit?: number } = {}) {
  const db = await getDb();
  const where: string[] = [];
  const params: Param[] = [];
  if (filter.status) {
    const s = Array.isArray(filter.status) ? filter.status : [filter.status];
    where.push(`status IN (${s.map(() => "?").join(", ")})`);
    params.push(...s);
  }
  if (filter.productId) {
    where.push("product_id = ?");
    params.push(filter.productId);
  }
  const rows = await db.all(
    `SELECT * FROM pins ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY COALESCE(scheduled_for, published_at, created_at) DESC LIMIT ?`,
    [...params, filter.limit ?? 500],
  );
  return rows.map(rowToPin);
}

export async function updatePinFields(id: string, fields: Partial<Pin>) {
  const db = await getDb();
  const entries = Object.entries(fields).filter(([k]) => k !== "id" && k !== "created_at");
  if (!entries.length) return;
  const json = new Set(["keywords", "compliance_flags"]);
  const sets = entries.map(([k]) => `${k} = ?`).join(", ");
  const params = entries.map(([k, v]) => (json.has(k) ? JSON.stringify(v) : (v as Param)));
  await db.run(`UPDATE pins SET ${sets}, updated_at = ? WHERE id = ?`, [...params, nowIso(), id]);
}

/**
 * Atomically moves a pin from one of `from` statuses to `to`. Returns false if another
 * process changed it first, which prevents double-publishing.
 */
export async function transitionPin(id: string, from: PinStatus[], to: PinStatus, fields: Partial<Pin> = {}) {
  const db = await getDb();
  const extra = Object.entries(fields);
  const sets = [`status = ?`, ...extra.map(([k]) => `${k} = ?`), `updated_at = ?`].join(", ");
  const r = await db.run(
    `UPDATE pins SET ${sets} WHERE id = ? AND status IN (${from.map(() => "?").join(", ")})`,
    [to, ...extra.map(([, v]) => v as Param), nowIso(), id, ...from],
  );
  return r.changes === 1;
}

export async function countBy(table: "products" | "pins", column: "status"): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.all<{ k: string; n: number }>(`SELECT ${column} AS k, COUNT(*) AS n FROM ${table} GROUP BY ${column}`);
  return Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
}
