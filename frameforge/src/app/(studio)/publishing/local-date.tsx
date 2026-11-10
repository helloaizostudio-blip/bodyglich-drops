"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False on the server and during hydration, true afterwards — for values that depend on the device (time zone, locale). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp → value for an <input type="datetime-local"> in the device's time zone. */
export function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value of an <input type="datetime-local"> (device time zone) → ISO timestamp, or "" when empty. */
export function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function formatLocal(value: Date | string, dateOnly = false): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, dateOnly ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" });
}

/**
 * A timestamp in the viewer's own time zone. The server cannot know that zone, so the first
 * paint shows the UTC calendar date and the local date/time replaces it once the page is live.
 */
export function LocalDateTime({ value, dateOnly, fallback = "–" }: { value: Date | string | null | undefined; dateOnly?: boolean; fallback?: string }) {
  const mounted = useMounted();
  if (!value) return <>{fallback}</>;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return <>{fallback}</>;
  return <time dateTime={d.toISOString()}>{mounted ? formatLocal(d, dateOnly) : d.toISOString().slice(0, 10)}</time>;
}
