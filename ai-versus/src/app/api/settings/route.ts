import { handler, ok } from "@/lib/api";
import { mergeSettings, redactSettings } from "@/lib/settings";
import { loadSettings, saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => ok({ settings: redactSettings(await loadSettings()) }));

/** Partial update. Credential fields: "" keeps the stored value, "__clear__" removes it. */
export const PUT = handler(async (req: Request) => {
  const cur = await loadSettings();
  const b = (await req.json()) as Partial<Settings>;
  const next = mergeSettings({
    credentials: cur.credentials,
    providers: { ...cur.providers, ...(b.providers ?? {}) },
    costLimits: { ...cur.costLimits, ...(b.costLimits ?? {}) },
    video: { ...cur.video, ...(b.video ?? {}), width: 1080, height: 1920, fps: 30 },
    language: { ...cur.language, ...(b.language ?? {}) },
  });
  for (const k of ["anthropicApiKey", "elevenLabsApiKey", "falKey"] as const) {
    const v = b.credentials?.[k];
    if (v === "__clear__") next.credentials[k] = "";
    else if (typeof v === "string" && v && !v.startsWith("••••")) next.credentials[k] = v.trim();
  }
  next.video.crf = Math.max(14, Math.min(30, Math.round(next.video.crf)));
  next.video.minDurationSec = Math.max(10, next.video.minDurationSec);
  next.video.maxDurationSec = Math.max(next.video.minDurationSec + 5, next.video.maxDurationSec);
  await saveSettings(next);
  return ok({ settings: redactSettings(next) });
});
