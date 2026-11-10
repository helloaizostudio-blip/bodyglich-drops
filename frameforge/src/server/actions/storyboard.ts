"use server";

import { z } from "zod";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { action, UserError, zId, zText } from "@/server/action";
import { characters, dialogueLines, episodes, locations, sceneCharacters, scenes, SCENE_STATUSES } from "@/db/schema";
import { listScenes, renumberScenes, requireEpisode, requireScene } from "@/server/services/scenes";
import { requireAsset } from "@/server/services/assets";
import { buildSceneAnimationPrompt, buildSceneVisualPrompt } from "@/server/services/prompts";
import { scenesFromScript } from "@/server/services/storyboard";
import { logActivity } from "@/server/services/activity";
import { ASPECT_RATIOS } from "@/lib/constants";

export const addScene = action(z.object({ episodeId: zId, afterSceneId: zId.optional() }), async (input, ctx) => {
  const episode = await requireEpisode(ctx, input.episodeId);
  const existing = await listScenes(ctx, episode.id);
  const after = input.afterSceneId ? existing.find((s) => s.id === input.afterSceneId) : undefined;
  const position = after ? after.position + 1 : existing.length;
  if (after) {
    await ctx.db
      .update(scenes)
      .set({ position: sql`${scenes.position} + 1` })
      .where(and(eq(scenes.episodeId, episode.id), gte(scenes.position, position)));
  }
  const [scene] = await ctx.db
    .insert(scenes)
    .values({ episodeId: episode.id, position, aspectRatio: existing[0]?.aspectRatio ?? (episode.format === "short" ? "9:16" : "16:9") })
    .returning();
  await renumberScenes(ctx, episode.id);
  if (episode.stage === "idea" || episode.stage === "script") await ctx.db.update(episodes).set({ stage: "storyboard" }).where(eq(episodes.id, episode.id));
  return scene;
});

const zLine = z.object({ id: zId.optional(), characterId: zId.nullable(), speaker: zText(80), text: zText(4000) });

export const updateScene = action(
  z.object({
    id: zId,
    title: zText(200),
    durationSec: z.number().min(0.5, "Duration must be at least half a second").max(600),
    locationId: zId.nullable(),
    locationText: zText(300),
    action: zText(6000),
    camera: zText(2000),
    motion: zText(2000),
    aspectRatio: z.enum(ASPECT_RATIOS),
    visualPrompt: zText(20000),
    notes: zText(6000),
    status: z.enum(SCENE_STATUSES),
    visualAssetId: zId.nullable(),
    backgroundAssetId: zId.nullable(),
    characterIds: z.array(zId).max(30),
    lines: z.array(zLine).max(200),
  }),
  async (input, ctx) => {
    const { scene } = await requireScene(ctx, input.id);
    const { db } = ctx;
    if (input.locationId) {
      const [loc] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.id, input.locationId), eq(locations.projectId, ctx.project.id)));
      if (!loc) throw new UserError("That location no longer exists.");
    }
    if (input.visualAssetId) await requireAsset(ctx, input.visualAssetId, "image");
    if (input.backgroundAssetId) await requireAsset(ctx, input.backgroundAssetId, "image");

    const validChars = input.characterIds.length
      ? await db
          .select({ id: characters.id })
          .from(characters)
          .where(and(eq(characters.projectId, ctx.project.id), inArray(characters.id, input.characterIds)))
      : [];
    const validIds = new Set(validChars.map((c) => c.id));

    const { id, characterIds: _c, lines, ...patch } = input;
    void _c;
    await db.update(scenes).set({ ...patch, updatedAt: new Date() }).where(eq(scenes.id, id));

    await db.delete(sceneCharacters).where(eq(sceneCharacters.sceneId, id));
    if (validIds.size) await db.insert(sceneCharacters).values([...validIds].map((characterId) => ({ sceneId: id, characterId })));

    // Dialogue: update lines that still exist (keeping their recorded audio), insert new ones, delete removed ones.
    const current = await db.select().from(dialogueLines).where(eq(dialogueLines.sceneId, id));
    const keep = new Set(lines.map((l) => l.id).filter((v): v is string => !!v));
    const gone = current.filter((l) => !keep.has(l.id)).map((l) => l.id);
    if (gone.length) await db.delete(dialogueLines).where(inArray(dialogueLines.id, gone));
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const characterId = l.characterId && (validIds.has(l.characterId) || (await isProjectCharacter(ctx, l.characterId))) ? l.characterId : null;
      const values = { position: i, characterId, speaker: characterId ? "" : l.speaker, text: l.text };
      if (l.id && current.some((c) => c.id === l.id)) await db.update(dialogueLines).set(values).where(eq(dialogueLines.id, l.id));
      else await db.insert(dialogueLines).values({ sceneId: id, ...values });
    }
    await db.update(episodes).set({ updatedAt: new Date() }).where(eq(episodes.id, scene.episodeId));
    return { id };
  },
);

async function isProjectCharacter(ctx: Parameters<typeof requireScene>[0], id: string): Promise<boolean> {
  const [row] = await ctx.db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.projectId, ctx.project.id)));
  return !!row;
}

export const deleteScene = action(z.object({ id: zId }), async (input, ctx) => {
  const { scene } = await requireScene(ctx, input.id);
  await ctx.db.delete(scenes).where(eq(scenes.id, scene.id));
  await renumberScenes(ctx, scene.episodeId);
  return { id: scene.id };
});

export const duplicateScene = action(z.object({ id: zId }), async (input, ctx) => {
  const { scene } = await requireScene(ctx, input.id);
  const { db } = ctx;
  await db
    .update(scenes)
    .set({ position: sql`${scenes.position} + 1` })
    .where(and(eq(scenes.episodeId, scene.episodeId), gte(scenes.position, scene.position + 1)));
  const { id: _id, createdAt: _ca, updatedAt: _ua, clipAssetId: _clip, ...copy } = scene;
  void _id, _ca, _ua, _clip;
  const [dup] = await db
    .insert(scenes)
    .values({ ...copy, position: scene.position + 1, title: scene.title ? `${scene.title} (copy)` : "", status: "draft" })
    .returning();
  const chars = await db.select().from(sceneCharacters).where(eq(sceneCharacters.sceneId, scene.id));
  if (chars.length) await db.insert(sceneCharacters).values(chars.map((c) => ({ sceneId: dup.id, characterId: c.characterId })));
  const lines = await db.select().from(dialogueLines).where(eq(dialogueLines.sceneId, scene.id));
  // Recorded voiceovers belong to the original lines, so the copy starts without audio.
  if (lines.length) await db.insert(dialogueLines).values(lines.map((l) => ({ sceneId: dup.id, position: l.position, characterId: l.characterId, speaker: l.speaker, text: l.text })));
  await renumberScenes(ctx, scene.episodeId);
  return dup;
});

export const reorderScenes = action(z.object({ episodeId: zId, orderedIds: z.array(zId).min(1).max(500) }), async (input, ctx) => {
  const episode = await requireEpisode(ctx, input.episodeId);
  const existing = await listScenes(ctx, episode.id);
  const known = new Set(existing.map((s) => s.id));
  if (input.orderedIds.length !== existing.length || input.orderedIds.some((id) => !known.has(id)) || new Set(input.orderedIds).size !== existing.length) {
    throw new UserError("The scene list changed while you were reordering. Please try again.");
  }
  await renumberScenes(ctx, episode.id, input.orderedIds);
  return { ok: true };
});

/** Builds the scene's image prompt from the style guide, location and character consistency profiles. No AI call. */
export const generateVisualPrompt = action(
  z.object({ sceneId: zId, kind: z.enum(["visual", "animation"]).default("visual") }),
  async (input, ctx) => {
    const { scene } = await requireScene(ctx, input.sceneId);
    const view = (await listScenes(ctx, scene.episodeId)).find((s) => s.id === scene.id);
    if (!view) throw new UserError("Scene not found.");
    const prompt = input.kind === "visual" ? await buildSceneVisualPrompt(ctx, view) : await buildSceneAnimationPrompt(ctx, view);
    return { prompt };
  },
  { revalidate: false },
);

export const breakScriptIntoScenes = action(
  z.object({ episodeId: zId, sceneCount: z.number().int().min(1).max(80).optional(), mode: z.enum(["replace", "append"]) }),
  async (input, ctx) => {
    const episode = await requireEpisode(ctx, input.episodeId);
    const count = await scenesFromScript(ctx, episode, { sceneCount: input.sceneCount, mode: input.mode });
    await logActivity(ctx, "storyboard", `Created ${count} storyboard scenes for “${episode.title}” from the script`, `/storyboard?episode=${episode.id}`);
    return { count };
  },
);
