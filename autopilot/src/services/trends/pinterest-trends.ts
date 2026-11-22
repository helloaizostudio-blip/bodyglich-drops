import { getDb } from "@/database/client";
import { config } from "@/utils/config";
import { nowIso } from "@/utils/ids";
import { pinterestGet, getPinterestAccessToken } from "@/services/pinterest/api";
import { audit } from "@/utils/audit";

export interface TrendKeyword {
  keyword: string;
  source: string;
  region: string | null;
  trend_type: string | null;
  growth_wow: number | null;
  growth_mom: number | null;
  growth_yoy: number | null;
  fetched_at: string;
}

/** Trend keywords stored by the last refresh (Pinterest Trends API). */
export async function getTrendKeywords(): Promise<TrendKeyword[]> {
  const db = await getDb();
  return db.all<TrendKeyword>(`SELECT * FROM trend_keywords ORDER BY COALESCE(growth_wow, 0) DESC LIMIT 200`);
}

interface TrendsResponse {
  trends?: { keyword: string; pct_growth_wow?: number; pct_growth_mom?: number; pct_growth_yoy?: number }[];
}

/**
 * Pulls top trending keywords from the Pinterest Trends API (requires a connected
 * Pinterest account). Region support varies; unsupported regions return an error that is logged.
 */
export async function refreshPinterestTrends(): Promise<{ summary: string }> {
  if (!(await getPinterestAccessToken())) return { summary: "skipped: Pinterest account not connected" };
  const region = config.pinterest.trendsRegion;
  const db = await getDb();
  let stored = 0;
  for (const trendType of ["growing", "seasonal"] as const) {
    try {
      const json = await pinterestGet<TrendsResponse>(`/trends/keywords/${encodeURIComponent(region)}/top/${trendType}`, {
        limit: "50",
      });
      for (const t of json.trends ?? []) {
        if (!t.keyword) continue;
        await db.run(
          `INSERT INTO trend_keywords (keyword, source, region, trend_type, growth_wow, growth_mom, growth_yoy, fetched_at)
           VALUES (?, 'pinterest_trends', ?, ?, ?, ?, ?, ?)
           ON CONFLICT (keyword, source) DO UPDATE SET region = excluded.region, trend_type = excluded.trend_type,
             growth_wow = excluded.growth_wow, growth_mom = excluded.growth_mom, growth_yoy = excluded.growth_yoy,
             fetched_at = excluded.fetched_at`,
          [t.keyword, region, trendType, t.pct_growth_wow ?? null, t.pct_growth_mom ?? null, t.pct_growth_yoy ?? null, nowIso()],
        );
        stored++;
      }
    } catch (err) {
      await audit("warn", "worker", "trends.pinterest", `Pinterest Trends (${trendType}, ${region}) failed: ${(err as Error).message}`);
    }
  }
  return { summary: `stored ${stored} Pinterest trend keywords for region ${region}` };
}
