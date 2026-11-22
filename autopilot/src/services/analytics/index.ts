import Papa from "papaparse";
import { getDb } from "@/database/client";
import { listPins } from "@/database/repositories";
import { audit } from "@/utils/audit";
import { newId, nowIso } from "@/utils/ids";
import { getPinAnalytics, getPinterestAccessToken } from "@/services/pinterest/api";
import { categoryLabel } from "@/services/product-research/categories";
import { getCampaign } from "@/services/trends/seasonal-calendar";

// ─── Pinterest metrics sync ──────────────────────────────────────────
export async function syncPinterestAnalytics(actor: "user" | "worker" = "worker") {
  if (!(await getPinterestAccessToken())) return { summary: "skipped: Pinterest account not connected" };
  const pins = (await listPins({ status: "published", limit: 1000 })).filter((p) => p.pinterest_pin_id);
  if (!pins.length) return { summary: "no published pins with a Pinterest ID yet" };
  const db = await getDb();
  const end = new Date();
  const start = new Date(end.getTime() - 89 * 86_400_000); // Pinterest allows up to 90 days
  let rows = 0;
  let errors = 0;
  for (const pin of pins) {
    try {
      const daily = await getPinAnalytics(pin.pinterest_pin_id!, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
      for (const d of daily) {
        await db.run(
          `INSERT INTO pin_metrics (pin_id, metric_date, impressions, outbound_clicks, pin_clicks, saves, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (pin_id, metric_date) DO UPDATE SET impressions = excluded.impressions,
             outbound_clicks = excluded.outbound_clicks, pin_clicks = excluded.pin_clicks, saves = excluded.saves,
             fetched_at = excluded.fetched_at`,
          [pin.id, d.date, d.impressions, d.outboundClicks, d.pinClicks, d.saves, nowIso()],
        );
        rows++;
      }
    } catch (err) {
      errors++;
      await audit("warn", actor, "analytics.pinterest", `Analytics for pin ${pin.id} failed: ${(err as Error).message}`, {
        entityType: "pin",
        entityId: pin.id,
      });
    }
  }
  return { summary: `synced ${rows} daily metric rows for ${pins.length} pins${errors ? `, ${errors} errors` : ""}` };
}

// ─── Amazon Associates report import ─────────────────────────────────
const HEADER_MAP: Record<string, string[]> = {
  date: ["date", "dateshipped", "day", "shippeddate", "orderdate"],
  tracking_id: ["trackingid", "tag", "trackingids"],
  asin: ["asin"],
  product_title: ["name", "productname", "title", "itemname"],
  category: ["category", "productline", "productgroup"],
  clicks: ["clicks"],
  ordered_items: ["ordereditems", "itemsordered", "qty", "quantity", "orders"],
  shipped_items: ["shippeditems", "itemsshipped"],
  revenue: ["revenue", "revenuers", "revenueinr", "totalrevenue", "price"],
  earnings: ["adfees", "earnings", "advertisingfees", "totalearnings", "fees", "adfeesrs", "earningsrs"],
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function parseNumber(v: string | undefined): number | null {
  if (v === undefined) return null;
  const t = v.replace(/[₹,\s]|rs\.?/gi, "").trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const dmy = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Imports a report CSV downloaded from Associates Central (Reports → Download).
 * Supports the daily trends, orders and earnings report layouts by matching column names.
 * Only figures present in the file are stored; nothing is derived from Pinterest clicks.
 */
export async function importAssociatesReport(csv: string, fileName: string) {
  // Amazon exports sometimes start with a title line before the header row.
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /date|asin|clicks/i.test(l) && l.includes(","));
  if (headerIdx < 0) throw new Error("Could not find a header row with Date/ASIN/Clicks columns");
  const parsed = Papa.parse<Record<string, string>>(lines.slice(headerIdx).join("\n"), { header: true, skipEmptyLines: true });

  const fields = parsed.meta.fields ?? [];
  const col: Record<string, string | undefined> = {};
  for (const [key, aliases] of Object.entries(HEADER_MAP)) col[key] = fields.find((f) => aliases.includes(norm(f)));
  if (!col.date) throw new Error(`No date column found. Columns: ${fields.join(", ")}`);
  if (!col.clicks && !col.ordered_items && !col.shipped_items && !col.earnings) {
    throw new Error("Report has no clicks, items or earnings columns");
  }

  const db = await getDb();
  await db.run(`DELETE FROM affiliate_reports WHERE source_file = ?`, [fileName]); // re-import replaces
  let imported = 0;
  let skipped = 0;
  for (const row of parsed.data) {
    const date = parseDate(row[col.date]);
    if (!date) {
      skipped++;
      continue;
    }
    const get = (k: string) => (col[k] ? row[col[k]!] : undefined);
    await db.run(
      `INSERT INTO affiliate_reports (id, report_date, tracking_id, asin, product_title, category, clicks, ordered_items,
         shipped_items, revenue, earnings, source_file, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId("rpt"),
        date,
        get("tracking_id")?.trim() || null,
        get("asin")?.trim().toUpperCase() || null,
        get("product_title")?.trim() || null,
        get("category")?.trim() || null,
        parseNumber(get("clicks")),
        parseNumber(get("ordered_items")),
        parseNumber(get("shipped_items")),
        parseNumber(get("revenue")),
        parseNumber(get("earnings")),
        fileName,
        nowIso(),
      ],
    );
    imported++;
  }
  await audit("info", "user", "analytics.import_report", `Imported ${imported} rows from ${fileName}${skipped ? ` (${skipped} skipped)` : ""}`);
  return { imported, skipped, columns: col };
}

// ─── Dashboard aggregates ────────────────────────────────────────────
export interface AnalyticsSummary {
  funnel: { discovered: number; shortlisted: number; rejected: number; pinsGenerated: number; approved: number; published: number; sent: number };
  pinterest: { impressions: number | null; outboundClicks: number | null; saves: number | null; pinsWithData: number };
  amazon: { clicks: number | null; orderedItems: number | null; shippedItems: number | null; revenue: number | null; earnings: number | null; rows: number; from: string | null; to: string | null };
  byCategory: { category: string; label: string; pins: number; impressions: number; outboundClicks: number; orderedItems: number | null; earnings: number | null }[];
  byCampaign: { campaign: string; label: string; pins: number; impressions: number; outboundClicks: number; earnings: number | null }[];
  topPins: { id: string; title: string; board: string; impressions: number; outboundClicks: number; saves: number; pinterestUrl: string | null }[];
  daily: { date: string; impressions: number; outboundClicks: number }[];
}

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const nOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const prod = await db.all<{ status: string; c: number }>(`SELECT status, COUNT(*) AS c FROM products GROUP BY status`);
  const pinsByStatus = await db.all<{ status: string; c: number }>(`SELECT status, COUNT(*) AS c FROM pins GROUP BY status`);
  const ps = Object.fromEntries(prod.map((r) => [r.status, n(r.c)]));
  const pn = Object.fromEntries(pinsByStatus.map((r) => [r.status, n(r.c)]));
  const totalPins = Object.values(pn).reduce((a, b) => a + b, 0);

  const pt = await db.get<Record<string, unknown>>(
    `SELECT SUM(impressions) AS i, SUM(outbound_clicks) AS o, SUM(saves) AS s, COUNT(DISTINCT pin_id) AS p
     FROM pin_metrics WHERE metric_date >= ?`,
    [since],
  );
  const am = await db.get<Record<string, unknown>>(
    `SELECT SUM(clicks) AS c, SUM(ordered_items) AS oi, SUM(shipped_items) AS si, SUM(revenue) AS r, SUM(earnings) AS e,
            COUNT(*) AS rows, MIN(report_date) AS f, MAX(report_date) AS t
     FROM affiliate_reports WHERE report_date >= ?`,
    [since],
  );

  const cat = await db.all<Record<string, unknown>>(
    `SELECT p.category AS category, COUNT(DISTINCT x.id) AS pins,
            COALESCE(SUM(m.impressions), 0) AS impressions, COALESCE(SUM(m.outbound_clicks), 0) AS outbound
     FROM pins x JOIN products p ON p.id = x.product_id
     LEFT JOIN pin_metrics m ON m.pin_id = x.id AND m.metric_date >= ?
     WHERE x.status IN ('sent','published') GROUP BY p.category`,
    [since],
  );
  const catAmazon = await db.all<Record<string, unknown>>(
    `SELECT p.category AS category, SUM(a.ordered_items) AS oi, SUM(a.earnings) AS e
     FROM affiliate_reports a JOIN products p ON p.asin = a.asin WHERE a.report_date >= ? GROUP BY p.category`,
    [since],
  );
  const catAm = new Map(catAmazon.map((r) => [String(r.category), r]));

  const camp = await db.all<Record<string, unknown>>(
    `SELECT COALESCE(x.campaign, 'none') AS campaign, COUNT(DISTINCT x.id) AS pins,
            COALESCE(SUM(m.impressions), 0) AS impressions, COALESCE(SUM(m.outbound_clicks), 0) AS outbound
     FROM pins x LEFT JOIN pin_metrics m ON m.pin_id = x.id AND m.metric_date >= ?
     WHERE x.status IN ('sent','published') GROUP BY COALESCE(x.campaign, 'none')`,
    [since],
  );
  const campAmazon = await db.all<Record<string, unknown>>(
    `SELECT COALESCE(p.campaign, 'none') AS campaign, SUM(a.earnings) AS e
     FROM affiliate_reports a JOIN products p ON p.asin = a.asin WHERE a.report_date >= ? GROUP BY COALESCE(p.campaign, 'none')`,
    [since],
  );
  const campAm = new Map(campAmazon.map((r) => [String(r.campaign), r]));

  const top = await db.all<Record<string, unknown>>(
    `SELECT x.id AS id, x.title AS title, x.board AS board, x.pinterest_url AS url,
            SUM(m.impressions) AS i, SUM(m.outbound_clicks) AS o, SUM(m.saves) AS s
     FROM pins x JOIN pin_metrics m ON m.pin_id = x.id WHERE m.metric_date >= ?
     GROUP BY x.id, x.title, x.board, x.pinterest_url ORDER BY SUM(m.outbound_clicks) DESC, SUM(m.impressions) DESC LIMIT 10`,
    [since],
  );
  const daily = await db.all<Record<string, unknown>>(
    `SELECT metric_date AS d, SUM(impressions) AS i, SUM(outbound_clicks) AS o FROM pin_metrics
     WHERE metric_date >= ? GROUP BY metric_date ORDER BY metric_date`,
    [since],
  );

  return {
    funnel: {
      discovered: Object.values(ps).reduce((a, b) => a + b, 0),
      shortlisted: ps.shortlisted ?? 0,
      rejected: ps.rejected ?? 0,
      pinsGenerated: totalPins,
      approved: (pn.approved ?? 0) + (pn.scheduled ?? 0) + (pn.sending ?? 0) + (pn.sent ?? 0) + (pn.published ?? 0),
      sent: pn.sent ?? 0,
      published: pn.published ?? 0,
    },
    pinterest: {
      impressions: n(pt?.p) ? n(pt?.i) : null,
      outboundClicks: n(pt?.p) ? n(pt?.o) : null,
      saves: n(pt?.p) ? n(pt?.s) : null,
      pinsWithData: n(pt?.p),
    },
    amazon: {
      clicks: nOrNull(am?.c),
      orderedItems: nOrNull(am?.oi),
      shippedItems: nOrNull(am?.si),
      revenue: nOrNull(am?.r),
      earnings: nOrNull(am?.e),
      rows: n(am?.rows),
      from: (am?.f as string) ?? null,
      to: (am?.t as string) ?? null,
    },
    byCategory: cat
      .map((r) => {
        const a = catAm.get(String(r.category));
        return {
          category: String(r.category),
          label: categoryLabel(String(r.category)),
          pins: n(r.pins),
          impressions: n(r.impressions),
          outboundClicks: n(r.outbound),
          orderedItems: a ? nOrNull(a.oi) : null,
          earnings: a ? nOrNull(a.e) : null,
        };
      })
      .sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0) || b.outboundClicks - a.outboundClicks),
    byCampaign: camp
      .map((r) => ({
        campaign: String(r.campaign),
        label: getCampaign(String(r.campaign))?.label ?? "No campaign",
        pins: n(r.pins),
        impressions: n(r.impressions),
        outboundClicks: n(r.outbound),
        earnings: campAm.has(String(r.campaign)) ? nOrNull(campAm.get(String(r.campaign))!.e) : null,
      }))
      .sort((a, b) => b.outboundClicks - a.outboundClicks),
    topPins: top.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      board: String(r.board),
      impressions: n(r.i),
      outboundClicks: n(r.o),
      saves: n(r.s),
      pinterestUrl: (r.url as string) ?? null,
    })),
    daily: daily.map((r) => ({ date: String(r.d), impressions: n(r.i), outboundClicks: n(r.o) })),
  };
}
