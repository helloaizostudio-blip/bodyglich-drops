/**
 * Pure helpers shared by the Analytics page and its server code. Formatting uses a fixed
 * locale so the server-rendered HTML and the browser always agree.
 */

const INT = new Intl.NumberFormat("en-US");
const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const DAY_SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatInt = (n: number) => INT.format(n);
export const formatCompact = (n: number) => COMPACT.format(n);

/** (likes + comments) ÷ views, or null when there are no views to divide by. */
export function engagementRate(e: { views: number; likes: number; comments: number } | null | undefined): number | null {
  if (!e || e.views <= 0) return null;
  return (e.likes + e.comments) / e.views;
}

export const formatRate = (rate: number | null) => (rate == null ? "–" : `${(rate * 100).toFixed(1)}%`);
export const formatPercent = (pct: number | null | undefined) => (pct == null ? "–" : `${Number(pct.toFixed(1))}%`);

/** Milliseconds (UTC midnight) for a YYYY-MM-DD date. */
export const dayToTime = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** "2026-11-10" → "10 Nov 2026" (or "10 Nov" when short). */
export function formatDay(day: string, short = false): string {
  const t = dayToTime(day);
  if (Number.isNaN(t)) return day;
  return (short ? DAY_SHORT : DAY).format(t);
}

export function isRealDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = dayToTime(day);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === day;
}

/** Today's date (YYYY-MM-DD) in the device's own time zone. Browser only. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Parses an average view duration as YouTube Studio shows it ("2:34", "1:02:03") or as plain
 * seconds ("154"). Returns null for an empty field and "invalid" for anything else.
 */
export function parseDuration(text: string): number | null | "invalid" {
  const v = text.trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  const parts = /^(?:(\d+):)?(\d+):([0-5]?\d)$/.exec(v);
  if (!parts) return "invalid";
  const [, h, m, s] = parts;
  if (h !== undefined && Number(m) > 59) return "invalid";
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s);
}
