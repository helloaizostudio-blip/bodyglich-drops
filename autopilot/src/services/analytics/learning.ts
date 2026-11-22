import { getDb } from "@/database/client";
import type { CategoryKey } from "@/services/product-research/categories";

export interface CategoryLearning {
  adjust: number; // added to the demand component, −4…+4
  note: string;
}

const MIN_IMPRESSIONS = 1000;

/**
 * Feedback loop: categories whose published pins earn a higher outbound-click rate
 * (and, when reports are imported, more ordered items per click) get a small boost
 * in future product scoring; under-performers get a small penalty.
 * Requires real data — returns nothing until there are enough impressions.
 */
export async function getCategoryLearning(days = 90): Promise<Partial<Record<CategoryKey, CategoryLearning>>> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await db.all<{ category: CategoryKey; i: number; o: number }>(
    `SELECT p.category AS category, SUM(m.impressions) AS i, SUM(m.outbound_clicks) AS o
     FROM pin_metrics m JOIN pins x ON x.id = m.pin_id JOIN products p ON p.id = x.product_id
     WHERE m.metric_date >= ? GROUP BY p.category`,
    [since],
  );
  const conv = await db.all<{ category: CategoryKey; c: number; oi: number }>(
    `SELECT p.category AS category, SUM(a.clicks) AS c, SUM(a.ordered_items) AS oi
     FROM affiliate_reports a JOIN products p ON p.asin = a.asin WHERE a.report_date >= ? GROUP BY p.category`,
    [since],
  );
  const eligible = rows.filter((r) => Number(r.i) >= MIN_IMPRESSIONS);
  if (!eligible.length) return {};
  const totalI = eligible.reduce((a, r) => a + Number(r.i), 0);
  const totalO = eligible.reduce((a, r) => a + Number(r.o ?? 0), 0);
  const baseline = totalO / totalI;
  const convMap = new Map(conv.map((c) => [c.category, c]));

  const out: Partial<Record<CategoryKey, CategoryLearning>> = {};
  for (const r of eligible) {
    const ctr = Number(r.o ?? 0) / Number(r.i);
    const ratio = baseline > 0 ? ctr / baseline : 1;
    let adjust = Math.max(-3, Math.min(3, Math.log2(ratio) * 2));
    let note = `Learning: outbound CTR ${(ctr * 100).toFixed(2)}% vs ${(baseline * 100).toFixed(2)}% average`;
    const c = convMap.get(r.category);
    if (c && Number(c.c) >= 50) {
      const cr = Number(c.oi ?? 0) / Number(c.c);
      adjust += cr >= 0.05 ? 1 : cr < 0.01 ? -1 : 0;
      note += `; Amazon conversion ${(cr * 100).toFixed(1)}% (from imported reports)`;
    }
    out[r.category] = { adjust: Math.round(Math.max(-4, Math.min(4, adjust)) * 10) / 10, note };
  }
  return out;
}
