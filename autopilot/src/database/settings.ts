import type { AppSettings } from "./types";
import { getDb } from "./client";
import { nowIso } from "@/utils/ids";
import { CATEGORY_KEYS } from "@/services/product-research/categories";

export const DEFAULT_SETTINGS: AppSettings = {
  requireApproval: true,
  schedule: {
    paused: false,
    pinsPerDay: 2,
    postingTimes: ["11:00", "15:30", "20:30"],
    minGapMinutes: 180,
    productCooldownDays: 21,
  },
  discovery: {
    enabled: true,
    categories: [...CATEGORY_KEYS],
    customKeywords: [],
    maxSearchesPerRun: 8,
    minScoreToShortlist: 60,
    autoGenerateTopN: 3,
    lookaheadDays: 45,
  },
  boards: [
    { name: "Fashion Finds", pinterestBoardId: null, categories: ["fashion"], campaigns: [] },
    { name: "Skincare & Beauty Finds", pinterestBoardId: null, categories: ["skincare_beauty"], campaigns: [] },
    { name: "Home Essentials", pinterestBoardId: null, categories: ["home_decor"], campaigns: ["home_refresh"] },
    { name: "Christmas Gift Ideas", pinterestBoardId: null, categories: ["christmas"], campaigns: ["christmas"] },
    { name: "Winter Fashion", pinterestBoardId: null, categories: [], campaigns: ["winter_fashion"] },
    {
      name: "Everyday Useful Products",
      pinterestBoardId: null,
      categories: ["gadgets", "personal_care", "problem_solvers"],
      campaigns: [],
    },
    { name: "Kitchen Finds", pinterestBoardId: null, categories: ["kitchen"], campaigns: [] },
    { name: "Lifestyle Inspiration", pinterestBoardId: null, categories: ["gifts", "seasonal", "festive"], campaigns: [] },
  ],
  commissionRates: {},
  imageProvider: "template",
};

function merge(base: AppSettings, saved: Partial<AppSettings>): AppSettings {
  return {
    ...base,
    ...saved,
    schedule: { ...base.schedule, ...(saved.schedule ?? {}) },
    discovery: { ...base.discovery, ...(saved.discovery ?? {}) },
    boards: saved.boards && saved.boards.length ? saved.boards : base.boards,
    commissionRates: { ...(saved.commissionRates ?? {}) },
  };
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.get<{ value: string }>(`SELECT value FROM settings WHERE key = 'app'`);
  if (!row) return structuredClone(DEFAULT_SETTINGS);
  try {
    return merge(structuredClone(DEFAULT_SETTINGS), JSON.parse(row.value));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export async function saveSettings(next: AppSettings): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES ('app', ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(next), nowIso()],
  );
}

export async function updateSettings(fn: (s: AppSettings) => AppSettings | void): Promise<AppSettings> {
  const current = await getSettings();
  const result = fn(current) ?? current;
  await saveSettings(result);
  return result;
}
