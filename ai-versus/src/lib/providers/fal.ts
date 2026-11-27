import fs from "node:fs";
import path from "node:path";
import { createFalClient, type FalClient } from "@fal-ai/client";
import { resolveCredentials } from "../settings";
import type { Settings } from "../types";

/**
 * fal.ai integration: image generation (backgrounds, character sheets), reference-guided edits,
 * background removal and optional image-to-video ambience loops. Model ids are configurable in
 * Settings → Providers because fal endpoints evolve.
 */

function client(s: Settings): FalClient {
  const credentials = resolveCredentials(s).falKey;
  if (!credentials) throw new Error("fal.ai key missing: set FAL_KEY or add it in Settings.");
  return createFalClient({ credentials });
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

/** Upload a local file to fal storage so it can be used as a reference input. */
export async function uploadReference(s: Settings, file: string): Promise<string> {
  const buf = fs.readFileSync(file);
  const type = file.endsWith(".png") ? "image/png" : file.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
  return client(s).storage.upload(new Blob([buf], { type }));
}

function firstImageUrl(data: any): string {
  const url = data?.images?.[0]?.url ?? data?.image?.url;
  if (!url) throw new Error(`fal returned no image: ${JSON.stringify(data).slice(0, 300)}`);
  return url;
}

export async function generateImage(
  s: Settings,
  prompt: string,
  dest: string,
  opts: { aspectRatio?: string; referenceFiles?: string[] } = {},
): Promise<string> {
  const fal = client(s);
  const refs = opts.referenceFiles?.length ? await Promise.all(opts.referenceFiles.map((f) => uploadReference(s, f))) : [];
  const model = refs.length ? s.providers.falEditModel : s.providers.falImageModel;
  const input: Record<string, unknown> = {
    prompt,
    num_images: 1,
    output_format: "png",
    aspect_ratio: opts.aspectRatio ?? "9:16",
  };
  if (refs.length) input.image_urls = refs;
  const r = await fal.subscribe(model, { input, logs: false });
  return download(firstImageUrl(r.data), dest);
}

export async function removeBackground(s: Settings, file: string, dest: string): Promise<string> {
  const fal = client(s);
  const url = await uploadReference(s, file);
  const r = await fal.subscribe(s.providers.falBackgroundRemovalModel, {
    input: { image_url: url, output_format: "png", refine_foreground: true },
    logs: false,
  });
  return download(firstImageUrl(r.data), dest);
}

/** Subtle looping ambience video (water ripples, flickering lights…) from a still background. */
export async function imageToVideo(s: Settings, file: string, prompt: string, dest: string): Promise<string> {
  const fal = client(s);
  const url = await uploadReference(s, file);
  const r = await fal.subscribe(s.providers.falVideoModel, {
    input: {
      prompt:
        `${prompt}. Static locked-off camera, no camera movement, no people, subtle ambient motion only, seamless loop.`,
      image_url: url,
      duration: "5",
      aspect_ratio: "9:16",
    },
    logs: false,
  });
  const vurl = (r.data as any)?.video?.url;
  if (!vurl) throw new Error(`fal returned no video: ${JSON.stringify(r.data).slice(0, 300)}`);
  return download(vurl, dest);
}
