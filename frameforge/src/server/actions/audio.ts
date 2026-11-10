"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { action, UserError, zId, zText } from "@/server/action";
import { audioCues, dialogueLines, episodes, voiceProfiles } from "@/db/schema";
import { requireAsset } from "@/server/services/assets";
import { getCharacter } from "@/server/services/characters";
import { requireEpisode } from "@/server/services/scenes";
import { requireCue, requireLine, requireSceneInEpisode } from "@/server/services/audio";
import { logActivity } from "@/server/services/activity";

const zCueKind = z.enum(["music", "sfx"]);
const zStartSec = z.number().min(0, "The start offset cannot be negative").max(36000);
const zVolume = z.number().min(0).max(1.5);

/** Attach, replace (assetId) or clear (null) the voiceover recording of a dialogue line. */
export const setLineAudio = action(z.object({ lineId: zId, assetId: zId.nullable() }), async (input, ctx) => {
  const { line, episode } = await requireLine(ctx, input.lineId);
  if (input.assetId) await requireAsset(ctx, input.assetId, "audio");
  await ctx.db.update(dialogueLines).set({ audioAssetId: input.assetId }).where(eq(dialogueLines.id, line.id));
  await ctx.db.update(episodes).set({ updatedAt: new Date() }).where(eq(episodes.id, episode.id));
  return { id: line.id, audioAssetId: input.assetId };
});

/** One voice profile per character: created on first save, updated afterwards. */
export const saveVoiceProfile = action(
  z.object({
    characterId: zId,
    description: zText(2000).default(""),
    providerId: zText(120).default(""),
    providerVoiceId: zText(200).default(""),
    sampleAssetId: zId.nullable().default(null),
  }),
  async (input, ctx) => {
    const character = await getCharacter(ctx, input.characterId);
    if (!character) throw new UserError("Character not found.");
    if (input.sampleAssetId) await requireAsset(ctx, input.sampleAssetId, "audio");
    const values = {
      description: input.description,
      providerId: input.providerId,
      providerVoiceId: input.providerVoiceId,
      sampleAssetId: input.sampleAssetId,
    };
    const [row] = await ctx.db
      .insert(voiceProfiles)
      .values({ characterId: character.id, ...values })
      .onConflictDoUpdate({ target: voiceProfiles.characterId, set: { ...values, updatedAt: new Date() } })
      .returning();
    return row;
  },
);

export const addAudioCue = action(
  z.object({
    episodeId: zId,
    assetId: zId,
    kind: zCueKind,
    sceneId: zId.nullable().default(null),
    startSec: zStartSec.default(0),
    volume: zVolume.default(1),
  }),
  async (input, ctx) => {
    const episode = await requireEpisode(ctx, input.episodeId);
    const asset = await requireAsset(ctx, input.assetId, "audio");
    if (input.sceneId) await requireSceneInEpisode(ctx, input.sceneId, episode.id);
    const [row] = await ctx.db
      .insert(audioCues)
      .values({ episodeId: episode.id, assetId: asset.id, kind: input.kind, sceneId: input.sceneId, startSec: input.startSec, volume: input.volume })
      .returning();
    await logActivity(ctx, "audio", `Added ${input.kind === "music" ? "music" : "a sound effect"} “${asset.name}” to “${episode.title}”`, `/audio?episode=${episode.id}&tab=cues`);
    return row;
  },
);

export const updateAudioCue = action(
  z.object({
    id: zId,
    assetId: zId.optional(),
    kind: zCueKind.optional(),
    sceneId: zId.nullable().optional(),
    startSec: zStartSec.optional(),
    volume: zVolume.optional(),
  }),
  async (input, ctx) => {
    const { cue } = await requireCue(ctx, input.id);
    if (input.assetId) await requireAsset(ctx, input.assetId, "audio");
    if (input.sceneId) await requireSceneInEpisode(ctx, input.sceneId, cue.episodeId);
    const { id, ...patch } = input;
    if (!Object.values(patch).some((v) => v !== undefined)) return cue;
    const [row] = await ctx.db.update(audioCues).set(patch).where(eq(audioCues.id, id)).returning();
    return row;
  },
);

/** Removes the placement only — the sound itself stays in the Asset Library. */
export const removeAudioCue = action(z.object({ id: zId }), async (input, ctx) => {
  const { cue } = await requireCue(ctx, input.id);
  await ctx.db.delete(audioCues).where(eq(audioCues.id, cue.id));
  return { id: cue.id };
});
