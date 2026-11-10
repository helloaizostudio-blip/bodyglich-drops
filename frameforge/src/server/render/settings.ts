/**
 * Export presets shared by the Video Editor UI and the renderer. Plain data only (no server
 * imports) so client components can use it too.
 */
import type { RenderSettings } from "@/db/schema";

export const RENDER_SIZES = [
  { width: 1920, height: 1080, label: "1920 × 1080", detail: "16:9 · YouTube" },
  { width: 1080, height: 1920, label: "1080 × 1920", detail: "9:16 · Shorts" },
  { width: 1280, height: 720, label: "1280 × 720", detail: "16:9 · smaller file" },
  { width: 1080, height: 1080, label: "1080 × 1080", detail: "1:1 · square" },
] as const;

export const RENDER_FPS = [24, 30] as const;

export const DEFAULT_RENDER_SETTINGS: RenderSettings = { width: 1920, height: 1080, fps: 30 };
