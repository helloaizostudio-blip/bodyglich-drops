import "server-only";
import { UserError } from "@/server/action";
import type { ResolvedProvider } from "./config";
import type { ImageProvider, VideoJobState, VideoProvider } from "./types";
import { blobOf, providerFetch } from "./http";

/**
 * OpenAI adapters. Request and response shapes follow OpenAI's published OpenAPI specification:
 *   POST /v1/images/generations   (JSON)            → { data: [{ b64_json }] }
 *   POST /v1/images/edits         (multipart, image[] reference files) → { data: [{ b64_json }] }
 *   POST /v1/videos               (multipart: model, prompt, seconds, size, input_reference)
 *   GET  /v1/videos/{id}          → { status: queued | in_progress | completed | failed, progress, error }
 *   GET  /v1/videos/{id}/content  → video/mp4 bytes
 *   GET  /v1/models/{model}       (used as the free verification call)
 */
// OPENAI_BASE_URL lets self-hosters route through a gateway or proxy; the default is the public API.
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const auth = (key: string) => ({ Authorization: `Bearer ${key}` });

/* ---------------- images ---------------- */

/** Newer GPT Image models accept any WIDTHxHEIGHT divisible by 16; older ones only three fixed sizes. */
const EXACT_SIZES: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "16:9": [1536, 864],
  "9:16": [864, 1536],
  "4:3": [1344, 1008],
  "3:4": [1008, 1344],
};
const STANDARD_SIZES: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "16:9": [1536, 1024],
  "4:3": [1536, 1024],
  "9:16": [1024, 1536],
  "3:4": [1024, 1536],
};
const flexibleSizes = (model: string) => /^gpt-image-2/.test(model);

type ImagesResponse = { data?: { b64_json?: string }[]; output_format?: string; usage?: Record<string, unknown> };

export function createOpenAIImageProvider(resolved: ResolvedProvider): ImageProvider {
  const model = resolved.config.model;
  const quality = resolved.config.quality;
  return {
    id: "openai-images",
    model,
    supportedAspectRatios: () => Object.keys(EXACT_SIZES),
    async generate({ prompt, aspectRatio, references }) {
      const [width, height] = (flexibleSizes(model) ? EXACT_SIZES : STANDARD_SIZES)[aspectRatio] ?? [1024, 1024];
      const size = `${width}x${height}`;
      let res: Response;
      if (references.length) {
        // Reference images (original character art, backgrounds) go to the edits endpoint as image[] files.
        const form = new FormData();
        form.set("model", model);
        form.set("prompt", prompt);
        form.set("size", size);
        form.set("quality", quality);
        for (const ref of references.slice(0, 16)) form.append("image[]", blobOf(ref.data, ref.mimeType), ref.name);
        res = await providerFetch("OpenAI", `${BASE}/images/edits`, { method: "POST", headers: auth(resolved.apiKey), body: form, timeoutMs: 300_000 });
      } else {
        res = await providerFetch("OpenAI", `${BASE}/images/generations`, {
          method: "POST",
          headers: { ...auth(resolved.apiKey), "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
          timeoutMs: 300_000,
        });
      }
      const body = (await res.json()) as ImagesResponse;
      const b64 = body.data?.[0]?.b64_json;
      if (!b64) throw new UserError("OpenAI returned no image data.");
      const format = body.output_format === "jpeg" || body.output_format === "webp" ? body.output_format : "png";
      return { data: Buffer.from(b64, "base64"), mimeType: `image/${format}`, width, height, usage: body.usage };
    },
  };
}

/* ---------------- video (Sora) ---------------- */

const SORA_SIZES: Record<string, Record<string, [number, number]>> = {
  "sora-2": { "16:9": [1280, 720], "9:16": [720, 1280] },
  "sora-2-pro": { "16:9": [1792, 1024], "9:16": [1024, 1792] },
};

type VideoResource = { id: string; status: "queued" | "in_progress" | "completed" | "failed"; progress?: number; error?: { message?: string } | null };

export function createSoraProvider(resolved: ResolvedProvider): VideoProvider {
  const model = resolved.config.model;
  const sizes = SORA_SIZES[model] ?? SORA_SIZES["sora-2"];
  const outputSize = (aspectRatio: string) => {
    const s = sizes[aspectRatio];
    if (!s) throw new UserError(`${model} only supports ${Object.keys(sizes).join(" and ")} video. Change the scene's aspect ratio.`);
    return { width: s[0], height: s[1] };
  };
  return {
    id: "openai-sora",
    model,
    supportedAspectRatios: () => Object.keys(sizes),
    supportedDurations: () => [4, 8, 12],
    outputSize,
    async submit({ prompt, aspectRatio, seconds, reference }) {
      const { width, height } = outputSize(aspectRatio);
      if (![4, 8, 12].includes(seconds)) throw new UserError("Sora clips must be 4, 8 or 12 seconds long.");
      const form = new FormData();
      form.set("model", model);
      form.set("prompt", prompt);
      form.set("seconds", String(seconds));
      form.set("size", `${width}x${height}`);
      if (reference) form.set("input_reference", blobOf(reference.data, reference.mimeType), reference.name);
      const res = await providerFetch("OpenAI", `${BASE}/videos`, { method: "POST", headers: auth(resolved.apiKey), body: form, timeoutMs: 120_000 });
      const video = (await res.json()) as VideoResource;
      if (!video.id) throw new UserError("OpenAI did not return a video job id.");
      return { externalId: video.id };
    },
    async poll(externalId): Promise<VideoJobState> {
      const res = await providerFetch("OpenAI", `${BASE}/videos/${encodeURIComponent(externalId)}`, { headers: auth(resolved.apiKey), timeoutMs: 30_000 });
      const video = (await res.json()) as VideoResource;
      const progress = typeof video.progress === "number" ? Math.max(0, Math.min(1, video.progress / 100)) : null;
      if (video.status === "completed") return { status: "succeeded", progress: 1, error: null };
      if (video.status === "failed") return { status: "failed", progress, error: video.error?.message ?? "The provider reported that generation failed." };
      return { status: video.status === "queued" ? "queued" : "running", progress, error: null };
    },
    async download(externalId) {
      const res = await providerFetch("OpenAI", `${BASE}/videos/${encodeURIComponent(externalId)}/content`, { headers: auth(resolved.apiKey), timeoutMs: 300_000 });
      return { data: Buffer.from(await res.arrayBuffer()), mimeType: "video/mp4" };
    },
  };
}

/** Free call: confirms the key is valid and can see the configured model. */
export async function verifyOpenAI(resolved: ResolvedProvider): Promise<void> {
  await providerFetch("OpenAI", `${BASE}/models/${encodeURIComponent(resolved.config.model)}`, { headers: auth(resolved.apiKey), timeoutMs: 20_000 });
}
