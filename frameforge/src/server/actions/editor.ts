"use server";

import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { action, UserError, zId } from "@/server/action";
import { episodes, publishingRecords, scenes } from "@/db/schema";
import { requireAsset } from "@/server/services/assets";
import { renumberScenes, requireEpisode, requireScene } from "@/server/services/scenes";
import { startRender } from "@/server/services/render";
import { logActivity } from "@/server/services/activity";
import { RENDER_FPS, RENDER_SIZES } from "@/server/render/settings";

const touchEpisode = (ctx: Parameters<typeof requireEpisode>[0], episodeId: string) =>
  ctx.db.update(episodes).set({ updatedAt: new Date() }).where(eq(episodes.id, episodeId));

export const setSceneDuration = action(
  z.object({ sceneId: zId, durationSec: z.number().min(0.5, "A scene must last at least half a second").max(600, "A scene can last 10 minutes at most") }),
  async (input, ctx) => {
    const { scene, episode } = await requireScene(ctx, input.sceneId);
    // Keep to a tenth of a second: precise enough for editing, and tidy to read.
    const durationSec = Math.round(input.durationSec * 10) / 10;
    await ctx.db.update(scenes).set({ durationSec }).where(eq(scenes.id, scene.id));
    await touchEpisode(ctx, episode.id);
    return { id: scene.id, durationSec };
  },
);

/** Assign, replace (assetId) or detach (null) the animation clip of a scene. The file stays in the library. */
export const setSceneClip = action(z.object({ sceneId: zId, assetId: zId.nullable() }), async (input, ctx) => {
  const { scene, episode } = await requireScene(ctx, input.sceneId);
  if (input.assetId) await requireAsset(ctx, input.assetId, "video");
  await ctx.db.update(scenes).set({ clipAssetId: input.assetId }).where(eq(scenes.id, scene.id));
  await touchEpisode(ctx, episode.id);
  return { id: scene.id, clipAssetId: input.assetId };
});

/** Moves a scene one place earlier or later and keeps positions dense (0..n-1). */
export const moveScene = action(z.object({ sceneId: zId, direction: z.enum(["earlier", "later"]) }), async (input, ctx) => {
  const { scene, episode } = await requireScene(ctx, input.sceneId);
  const rows = await ctx.db.select({ id: scenes.id }).from(scenes).where(eq(scenes.episodeId, episode.id)).orderBy(asc(scenes.position), asc(scenes.createdAt));
  const order = rows.map((r) => r.id);
  const from = order.indexOf(scene.id);
  const to = input.direction === "earlier" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= order.length) throw new UserError(input.direction === "earlier" ? "This is already the first scene." : "This is already the last scene.");
  [order[from], order[to]] = [order[to], order[from]];
  await renumberScenes(ctx, episode.id, order);
  return { id: scene.id, position: to };
});

export const saveRenderSettings = action(
  z.object({ episodeId: zId, width: z.number().int(), height: z.number().int(), fps: z.number().int() }),
  async (input, ctx) => {
    const episode = await requireEpisode(ctx, input.episodeId);
    if (!RENDER_SIZES.some((s) => s.width === input.width && s.height === input.height)) throw new UserError("Choose one of the listed resolutions.");
    if (!RENDER_FPS.some((f) => f === input.fps)) throw new UserError("Choose 24 or 30 frames per second.");
    const renderSettings = { width: input.width, height: input.height, fps: input.fps };
    await ctx.db.update(episodes).set({ renderSettings }).where(eq(episodes.id, episode.id));
    return renderSettings;
  },
);

/** Starts a real ffmpeg render in the server process and returns the job to poll. */
export const startEpisodeRender = action(z.object({ episodeId: zId }), async (input, ctx) => startRender(ctx, input.episodeId));

/** Attaches a rendered (or any other) video of this studio to the episode's publishing package. */
export const setFinalVideo = action(z.object({ episodeId: zId, assetId: zId }), async (input, ctx) => {
  const episode = await requireEpisode(ctx, input.episodeId);
  const asset = await requireAsset(ctx, input.assetId, "video");
  await ctx.db
    .insert(publishingRecords)
    .values({ episodeId: episode.id, videoAssetId: asset.id })
    .onConflictDoUpdate({ target: publishingRecords.episodeId, set: { videoAssetId: asset.id, updatedAt: new Date() } });
  await touchEpisode(ctx, episode.id);
  await logActivity(ctx, "publishing", `Set “${asset.name}” as the final video of “${episode.title}”`, `/publishing?episode=${episode.id}`);
  return { episodeId: episode.id, videoAssetId: asset.id };
});
