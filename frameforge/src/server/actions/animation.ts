"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { action, zId, zText } from "@/server/action";
import { characters, episodes, sceneCharacters, scenes } from "@/db/schema";
import { requireScene } from "@/server/services/scenes";
import { requireAsset } from "@/server/services/assets";
import { submitVideoJob } from "@/server/services/animation";
import { ASPECT_RATIOS } from "@/lib/constants";

export const saveSceneAnimation = action(
  z.object({
    id: zId,
    action: zText(6000),
    motion: zText(2000),
    camera: zText(2000),
    durationSec: z.number().min(0.5).max(600),
    aspectRatio: z.enum(ASPECT_RATIOS),
    animationPrompt: zText(20000),
    characterIds: z.array(zId).max(30),
    visualAssetId: zId.nullable(),
    backgroundAssetId: zId.nullable(),
  }),
  async (input, ctx) => {
    const { scene } = await requireScene(ctx, input.id);
    if (input.visualAssetId) await requireAsset(ctx, input.visualAssetId, "image");
    if (input.backgroundAssetId) await requireAsset(ctx, input.backgroundAssetId, "image");
    const { id, characterIds, ...patch } = input;
    await ctx.db.update(scenes).set({ ...patch, updatedAt: new Date() }).where(eq(scenes.id, id));
    const valid = characterIds.length
      ? await ctx.db
          .select({ id: characters.id })
          .from(characters)
          .where(and(eq(characters.projectId, ctx.project.id), inArray(characters.id, characterIds)))
      : [];
    await ctx.db.delete(sceneCharacters).where(eq(sceneCharacters.sceneId, id));
    if (valid.length) await ctx.db.insert(sceneCharacters).values(valid.map((c) => ({ sceneId: id, characterId: c.id })));
    await ctx.db.update(episodes).set({ updatedAt: new Date() }).where(eq(episodes.id, scene.episodeId));
    return { id };
  },
);

/** Submits a real job to the connected video provider. Billed by the provider to the studio's account. */
export const startVideoGeneration = action(
  z.object({
    sceneId: zId,
    prompt: z.string().trim().min(10, "Write a generation prompt first (or tap Build prompt)").max(20000),
    seconds: z.number().int().min(1).max(60),
    aspectRatio: z.enum(ASPECT_RATIOS),
    referenceAssetId: zId.nullable(),
  }),
  async (input, ctx) => submitVideoJob(ctx, input),
);

/** Manual fallback and explicit choice: sets (or clears) the clip used for a scene. */
export const setSceneClip = action(z.object({ sceneId: zId, assetId: zId.nullable() }), async (input, ctx) => {
  const { scene, episode } = await requireScene(ctx, input.sceneId);
  if (input.assetId) await requireAsset(ctx, input.assetId, "video");
  await ctx.db.update(scenes).set({ clipAssetId: input.assetId, updatedAt: new Date() }).where(eq(scenes.id, scene.id));
  if (input.assetId && ["idea", "script", "storyboard", "assets"].includes(episode.stage)) {
    await ctx.db.update(episodes).set({ stage: "animation" }).where(eq(episodes.id, episode.id));
  }
  return { sceneId: scene.id };
});
