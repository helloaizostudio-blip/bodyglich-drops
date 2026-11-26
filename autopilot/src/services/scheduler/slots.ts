import type { AppSettings } from "@/database/types";
import { addDaysKey, zonedDateKey, zonedParts, zonedTimeToUtc } from "@/utils/time";

export interface Blackout {
  start: string; // "HH:MM" in tz
  end: string;
}

/** True when `at` (wall clock in tz) falls inside any blackout window (start inclusive, end exclusive). */
export function inBlackout(at: Date, blackouts: Blackout[], tz: string): boolean {
  if (!blackouts.length) return false;
  const p = zonedParts(at, tz);
  const hm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  return blackouts.some((b) => (b.start <= b.end ? hm >= b.start && hm < b.end : hm >= b.start || hm < b.end));
}

/** A pin already occupying the calendar (scheduled, sending, sent or published). */
export interface OccupiedSlot {
  at: Date;
  productId: string;
  style: string;
}

export interface Assignable {
  id: string;
  productId: string;
  style: string;
}

export interface Assignment {
  pinId: string;
  at: Date;
}

const MIN = 60_000;
const DAY = 86_400_000;

/**
 * Assigns posting slots to approved pins while enforcing:
 *  - at most `pinsPerDay` pins per local day, only at configured posting times
 *  - at least `minGapMinutes` between any two pins
 *  - the same product is not posted again within `productCooldownDays`
 *  - consecutive pins use different visual styles when possible
 * Pure function — easy to test and reason about.
 */
export function assignSlots(
  pins: Assignable[],
  occupied: OccupiedSlot[],
  schedule: AppSettings["schedule"],
  now: Date,
  tz: string,
  horizonDays = 90,
  blackouts: Blackout[] = [],
): Assignment[] {
  const times = [...schedule.postingTimes].filter((t) => /^\d{2}:\d{2}$/.test(t)).sort();
  if (!times.length || schedule.pinsPerDay <= 0) return [];
  const taken: OccupiedSlot[] = [...occupied].sort((a, b) => a.at.getTime() - b.at.getTime());
  const queue = [...pins];
  const result: Assignment[] = [];
  const earliest = now.getTime() + 10 * MIN;
  const cooldown = schedule.productCooldownDays * DAY;

  const perDay = (key: string) => taken.filter((t) => zonedDateKey(t.at, tz) === key).length;
  const gapOk = (at: Date) => taken.every((t) => Math.abs(t.at.getTime() - at.getTime()) >= schedule.minGapMinutes * MIN);
  const productOk = (productId: string, at: Date) =>
    taken.every((t) => t.productId !== productId || Math.abs(t.at.getTime() - at.getTime()) >= cooldown);
  const previousStyle = (at: Date) => {
    const before = taken.filter((t) => t.at.getTime() < at.getTime());
    return before.length ? before[before.length - 1].style : null;
  };

  let dayKey = zonedDateKey(now, tz);
  for (let d = 0; d < horizonDays && queue.length; d++, dayKey = addDaysKey(dayKey, 1)) {
    for (const time of times) {
      if (!queue.length) break;
      if (perDay(dayKey) >= schedule.pinsPerDay) break;
      const at = zonedTimeToUtc(dayKey, time, tz);
      if (at.getTime() < earliest || !gapOk(at) || inBlackout(at, blackouts, tz)) continue;
      const prev = previousStyle(at);
      const eligible = queue.filter((p) => productOk(p.productId, at));
      const pick = eligible.find((p) => p.style !== prev) ?? eligible[0];
      if (!pick) continue;
      queue.splice(queue.indexOf(pick), 1);
      taken.push({ at, productId: pick.productId, style: pick.style });
      taken.sort((a, b) => a.at.getTime() - b.at.getTime());
      result.push({ pinId: pick.id, at });
    }
  }
  return result;
}
