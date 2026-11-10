import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { assetLinks, scenes, type GenerationJob } from "@/db/schema";
import { UserError } from "@/server/action";
import { videoProvider } from "@/server/providers";
import type { BinaryInput } from "@/server/providers/types";
import { createJob, getJob, markFailed, markSucceeded, updateJob } from "@/server/services/jobs";
import { readAssetBuffer, requireAsset, saveBufferAsAsset } from "@/server/services/assets";
import { requireScene } from "@/server/services/scenes";
import { logActivity } from "@/server/services/activity";

/**
 * Letterboxes a reference image to the exact output size (video providers require the reference
 * to match the clip resolution). Uses ffmpeg when the server has it; otherwise returns null and
 * the original image is sent unchanged.
 */
async function fitImage(input: BinaryInput, width: number, height: number): Promise<BinaryInput | null> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ff-ref-"));
  try {
    const src = path.join(dir, "in");
    const out = path.join(dir, "out.png");
    await fs.writeFile(src, input.data);
    const vf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`;
    const code = await new Promise<number>((resolve) => {
      const p = spawn(/*turbopackIgnore: true*/ process.env.FFMPEG_PATH || "ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-vf", vf, "-frames:v", "1", out]);
      p.on("error", () => resolve(-1));
      p.on("close", (c) => resolve(c ?? -1));
    });
    if (code !== 0) return null;
    return { data: await fs.readFile(out), mimeType: "image/png", name: "reference.png" };
  } catch {
    return null;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function submitVideoJob(
  ctx: Ctx,
  input: { sceneId: string; prompt: string; seconds: number; aspectRatio: string; referenceAssetId?: string | null },
): Promise<GenerationJob> {
  const { scene, episode } = await requireScene(ctx, input.sceneId);
  const provider = await videoProvider(ctx); // throws a clear error when no verified provider exists
  if (!provider.supportedDurations().includes(input.seconds)) {
    throw new UserError(`${provider.model} makes clips of ${provider.supportedDurations().join(", ")} seconds. Pick one of those.`);
  }
  const size = provider.outputSize(input.aspectRatio);

  let reference: BinaryInput | undefined;
  if (input.referenceAssetId) {
    const asset = await requireAsset(ctx, input.referenceAssetId, "image");
    const raw: BinaryInput = { data: await readAssetBuffer(asset), mimeType: asset.mimeType, name: "reference" };
    reference = (await fitImage(raw, size.width, size.height)) ?? raw;
  }

  const job = await createJob(ctx, {
    kind: "video",
    purpose: "scene clip",
    provider: provider.id,
    model: provider.model,
    prompt: input.prompt,
    params: { seconds: input.seconds, aspectRatio: input.aspectRatio, referenceAssetId: input.referenceAssetId ?? null, width: size.width, height: size.height },
    episodeId: episode.id,
    sceneId: scene.id,
  });
  try {
    const { externalId } = await provider.submit({ prompt: input.prompt, aspectRatio: input.aspectRatio, seconds: input.seconds, reference });
    await updateJob(ctx, job.id, { externalId, startedAt: new Date() });
  } catch (err) {
    const message = err instanceof UserError ? err.message : "The video provider rejected the job.";
    if (!(err instanceof UserError)) console.error("[video submit]", err);
    await markFailed(ctx, job.id, message);
    throw new UserError(message);
  }
  return (await getJob(ctx, job.id))!;
}

const finalizing = new Set<string>();

/**
 * Called whenever the UI polls a video job: asks the provider for the real status and, once the
 * clip is finished, downloads it into the Asset Library. Nothing is marked done until the file exists.
 */
export async function advanceVideoJob(ctx: Ctx, job: GenerationJob): Promise<GenerationJob> {
  if (job.kind !== "video" || !job.externalId || (job.status !== "queued" && job.status !== "running")) return job;
  if (finalizing.has(job.id)) return job;
  let provider;
  try {
    provider = await videoProvider(ctx);
  } catch {
    return job; // provider was disconnected; leave the job as it is
  }
  try {
    const state = await provider.poll(job.externalId);
    if (state.status === "failed") {
      await markFailed(ctx, job.id, state.error ?? "Generation failed.");
    } else if (state.status === "succeeded") {
      finalizing.add(job.id);
      try {
        const { data, mimeType } = await provider.download(job.externalId);
        const params = job.params as { seconds?: number; width?: number; height?: number };
        const scene = job.sceneId ? (await ctx.db.select().from(scenes).where(eq(scenes.id, job.sceneId)).limit(1))[0] : undefined;
        const asset = await saveBufferAsAsset(ctx, {
          data,
          mimeType,
          name: `${scene?.title || (scene ? `Scene ${scene.position + 1}` : "Clip")} · generated ${new Date().toISOString().slice(0, 10)}`,
          category: "animation_clip",
          source: "generated",
          jobId: job.id,
          durationSec: params.seconds,
          width: params.width,
          height: params.height,
        });
        if (scene) {
          await ctx.db.insert(assetLinks).values({ assetId: asset.id, sceneId: scene.id });
          // Only fills an empty slot — an existing clip is never replaced without the user choosing to.
          if (!scene.clipAssetId) await ctx.db.update(scenes).set({ clipAssetId: asset.id }).where(eq(scenes.id, scene.id));
        }
        await markSucceeded(ctx, job.id, asset.id);
        await logActivity(ctx, "generation", `Generated an animation clip${scene ? ` for scene ${scene.position + 1}` : ""}`, job.episodeId ? `/animation?episode=${job.episodeId}` : "/animation");
      } finally {
        finalizing.delete(job.id);
      }
    } else {
      await updateJob(ctx, job.id, { status: state.status, progress: state.progress });
    }
  } catch (err) {
    // A failed status check is not a failed generation: keep the job and report on the next poll.
    if (!(err instanceof UserError)) console.error("[video poll]", err);
  }
  return (await getJob(ctx, job.id)) ?? job;
}
