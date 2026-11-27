import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  credentials: { anthropicApiKey: "", elevenLabsApiKey: "", falKey: "" },
  providers: {
    anthropicModel: "claude-opus-5-5",
    elevenLabsModel: "eleven_v3",
    falImageModel: "fal-ai/nano-banana",
    falEditModel: "fal-ai/nano-banana/edit",
    falBackgroundRemovalModel: "fal-ai/birefnet/v2",
    falVideoModel: "fal-ai/kling-video/v2.1/standard/image-to-video",
    useImageToVideoBackground: false,
  },
  costLimits: {
    perVideoUsd: 3,
    monthlyUsd: 60,
    elevenLabsUsdPer1kChars: 0.18,
    falImageUsd: 0.04,
    falVideoUsd: 0.3,
  },
  video: {
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 18,
    preset: "medium",
    minDurationSec: 30,
    maxDurationSec: 50,
    music: true,
    musicVolumeDb: -24,
    sfx: true,
    showDisclaimer: true,
  },
  language: { scriptLanguage: "English", ttsLanguageCode: "en" },
};

/** Deep-merge stored settings over defaults so new fields always exist. */
export function mergeSettings(stored: Partial<Settings> | null | undefined): Settings {
  const s = stored ?? {};
  return {
    credentials: { ...DEFAULT_SETTINGS.credentials, ...(s.credentials ?? {}) },
    providers: { ...DEFAULT_SETTINGS.providers, ...(s.providers ?? {}) },
    costLimits: { ...DEFAULT_SETTINGS.costLimits, ...(s.costLimits ?? {}) },
    video: { ...DEFAULT_SETTINGS.video, ...(s.video ?? {}) },
    language: { ...DEFAULT_SETTINGS.language, ...(s.language ?? {}) },
  };
}

/** Credentials: dashboard value wins, otherwise environment variable. */
export function resolveCredentials(s: Settings) {
  return {
    anthropicApiKey: s.credentials.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
    elevenLabsApiKey: s.credentials.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || "",
    falKey: s.credentials.falKey || process.env.FAL_KEY || "",
  };
}

/** Never send secrets to the browser. */
export function redactSettings(s: Settings): Settings & { credentialStatus: Record<string, string> } {
  const creds = resolveCredentials(s);
  const mask = (v: string) => (v ? `••••${v.slice(-4)}` : "");
  return {
    ...s,
    credentials: {
      anthropicApiKey: mask(s.credentials.anthropicApiKey),
      elevenLabsApiKey: mask(s.credentials.elevenLabsApiKey),
      falKey: mask(s.credentials.falKey),
    },
    credentialStatus: {
      anthropic: creds.anthropicApiKey ? (s.credentials.anthropicApiKey ? "dashboard" : "env") : "missing",
      elevenlabs: creds.elevenLabsApiKey ? (s.credentials.elevenLabsApiKey ? "dashboard" : "env") : "missing",
      fal: creds.falKey ? (s.credentials.falKey ? "dashboard" : "env") : "missing",
    },
  };
}
