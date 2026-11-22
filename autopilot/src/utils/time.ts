import { config } from "./config";

/** Returns {year, month (1-12), day, hour, minute, weekday} for a Date in the app timezone. */
export function zonedParts(d: Date, tz = config.timezone) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
  };
}

/** YYYY-MM-DD for a date in the app timezone. */
export function zonedDateKey(d: Date, tz = config.timezone): string {
  const p = zonedParts(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Offset (ms) of tz from UTC at instant d. */
function tzOffsetMs(d: Date, tz: string): number {
  const p = zonedParts(d, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(d.getTime() / 60000) * 60000;
}

/** Converts a wall-clock time (dateKey "YYYY-MM-DD", "HH:MM") in tz into a UTC Date. */
export function zonedTimeToUtc(dateKey: string, hhmm: string, tz = config.timezone): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMs(guess, tz);
  const result = new Date(guess.getTime() - offset);
  // Correct for DST transitions (not relevant for IST, but keeps this general).
  const offset2 = tzOffsetMs(result, tz);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2);
}

export function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatDateTime(iso: string | null | undefined, tz = config.timezone): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function hoursAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}
