import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { assetLinks, assets, characterReferences, characters, scenes, type Asset, type GenerationJob } from "@/db/schema";
import { UserError } from "@/server/action";
import { imageProvider } from "@/server/providers";
import type { BinaryInput } from "@/server/providers/types";
import { createJob, markFailed, markRunning, markSucceeded } from "@/server/services/jobs";
import { readAssetBuffer, saveBufferAsAsset } from "@/server/services/assets";
import { logActivity } from "@/server/services/activity";

export const IMAGE_PURPOSES = {
  scene: "Scene illustration",
  storyboard: "Storyboard image",
  character_variation: "Character variation",
  expression: "Character expression",
  environment: "Environment",
  prop: "Prop",
  thumbnail: "Thumbnail concept",
} as const;
export type ImagePurpose = keyof typeof IMAGE_PURPOSES;

export type ImageJobInput = {
  prompt: string;
  aspectRatio: string;
  purpose: ImagePurpose;
  /** Characters whose ORIGINAL reference images are sent along with the prompt. */
  characterIds: string[];
  /** Extra reference images chosen by the user (backgrounds, props, uploads). */
  referenceAssetIds: string[];
  episodeId?: string | null;
  sceneId?: string | null;
};

const MAX_REFERENCES = 8;

/** The original (canonical) reference images for the given characters — profile image first. */
export async function originalReferencesFor(ctx: Ctx, characterIds: string[]): Promise<{ characterId: string; characterName: string; asset: Asset }[]> {
  if (!characterIds.length) return [];
  const rows = await ctx.db
    .select({ ref: characterReferences, asset: assets, character: characters })
    .from(characterReferences)
    .innerJoin(assets, eq(assets.id, characterReferences.assetId))
    .innerJoin(characters, eq(characters.id, characterReferences.characterId))
    .where(and(eq(characters.projectId, ctx.project.id), inArray(characterReferences.characterId, characterIds), eq(characterReferences.kind, "original")));
  const out: { characterId: string; characterName: string; asset: Asset }[] = [];
  for (const id of characterIds) {
    const mine = rows.filter((r) => r.character.id === id);
    const best = mine.find((r) => r.ref.id === r.character.profileReferenceId) ?? mine[0];
    if (best) out.push({ characterId: id, characterName: best.character.name, asset: best.asset });
  }
  return out;
}

/**
 * Creates an image generation job and runs it. The caller schedules `run()` to execute after the
 * response has been sent; the UI follows progress by polling the job.
 */
export async function createImageJob(ctx: Ctx, input: ImageJobInput): Promise<{ job: GenerationJob; run: () => Promise<void> }> {
  const provider = await imageProvider(ctx); // throws a clear error when no verified provider exists
  if (!provider.supportedAspectRatios().includes(input.aspectRatio)) {
    throw new UserError(`${provider.model} cannot produce ${input.aspectRatio} images.`);
  }
  const originals = await originalReferencesFor(ctx, input.characterIds);
  const missing = input.characterIds.length - originals.length;
  const extra = input.referenceAssetIds.length
    ? await ctx.db
        .select()
        .from(assets)
        .where(and(eq(assets.projectId, ctx.project.id), eq(assets.kind, "image"), inArray(assets.id, input.referenceAssetIds)))
    : [];
  const refAssets = [...originals.map((o) => o.asset), ...extra].filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i).slice(0, MAX_REFERENCES);

  if (input.sceneId) {
    const [ok] = await ctx.db.select({ id: scenes.id }).from(scenes).where(eq(scenes.id, input.sceneId)).limit(1);
    if (!ok) throw new UserError("Scene not found.");
  }

  const job = await createJob(ctx, {
    kind: "image",
    purpose: input.purpose,
    provider: provider.id,
    model: provider.model,
    prompt: input.prompt,
    params: {
      aspectRatio: input.aspectRatio,
      characterIds: input.characterIds,
      referenceAssetIds: refAssets.map((a) => a.id),
      charactersWithoutOriginal: missing,
    },
    episodeId: input.episodeId ?? null,
    sceneId: input.sceneId ?? null,
    characterId: input.characterIds.length === 1 ? input.characterIds[0] : null,
  });

  const run = async () => {
    try {
      await markRunning(ctx, job.id);
      const references: BinaryInput[] = [];
      for (const a of refAssets) references.push({ data: await readAssetBuffer(a), mimeType: a.mimeType, name: `${a.name}.${a.mimeType.split("/")[1] ?? "png"}` });
      const result = await provider.generate({ prompt: input.prompt, aspectRatio: input.aspectRatio, references });
      const asset = await saveBufferAsAsset(ctx, {
        data: result.data,
        mimeType: result.mimeType,
        name: `${IMAGE_PURPOSES[input.purpose]} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
        category: "generated_image",
        source: "generated",
        jobId: job.id,
        width: result.width,
        height: result.height,
      });
      if (input.episodeId || input.sceneId) {
        await ctx.db.insert(assetLinks).values({ assetId: asset.id, episodeId: input.sceneId ? null : input.episodeId, sceneId: input.sceneId ?? null });
      }
      await markSucceeded(ctx, job.id, asset.id, result.usage);
      await logActivity(ctx, "generation", `Generated image: ${IMAGE_PURPOSES[input.purpose]}`, `/assets?asset=${asset.id}`);
    } catch (err) {
      const message = err instanceof UserError ? err.message : "Image generation failed unexpectedly.";
      if (!(err instanceof UserError)) console.error("[image job]", err);
      await markFailed(ctx, job.id, message).catch(() => {});
    }
  };
  return { job, run };
}
