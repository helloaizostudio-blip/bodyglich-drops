"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { action, UserError, zId } from "@/server/action";
import { characters, dialogueLines, episodes, scenes, voiceProfiles } from "@/db/schema";
import { voiceProvider } from "@/server/providers";
import { createJob, markFailed, markRunning, markSucceeded } from "@/server/services/jobs";
import { saveBufferAsAsset } from "@/server/services/assets";

/** Voices available on the connected voice provider account (for picking a voice ID in a voice profile). */
export const listProviderVoices = action(
  z.object({}),
  async (_input, ctx) => {
    const provider = await voiceProvider(ctx);
    return provider.listVoices();
  },
  { revalidate: false },
);

/**
 * Generates a voiceover for one dialogue line with the connected voice provider, using the voice
 * assigned in the speaking character's voice profile. An existing recording is only replaced when
 * the user explicitly asks for it.
 */
export const generateVoiceover = action(z.object({ lineId: zId, replace: z.boolean().default(false) }), async (input, ctx) => {
  const [row] = await ctx.db
    .select({ line: dialogueLines, scene: scenes, episode: episodes })
    .from(dialogueLines)
    .innerJoin(scenes, eq(scenes.id, dialogueLines.sceneId))
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(and(eq(dialogueLines.id, input.lineId), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("Dialogue line not found.");
  const { line, scene, episode } = row;
  if (!line.text.trim()) throw new UserError("This line has no text to speak.");
  if (line.audioAssetId && !input.replace) throw new UserError("This line already has a voiceover. Choose Replace to generate a new one.");
  if (!line.characterId) throw new UserError("This line is not assigned to a library character, so it has no voice profile. Upload a recording instead.");

  const [character] = await ctx.db.select().from(characters).where(eq(characters.id, line.characterId)).limit(1);
  const [profile] = await ctx.db.select().from(voiceProfiles).where(eq(voiceProfiles.characterId, line.characterId)).limit(1);
  if (!profile?.providerVoiceId.trim()) {
    throw new UserError(`${character?.name ?? "This character"} has no voice ID yet. Add one in their voice profile (Audio Studio → Voice profiles).`);
  }

  const provider = await voiceProvider(ctx); // throws a clear error when nothing is connected
  const job = await createJob(ctx, { kind: "voice", purpose: "voiceover", provider: provider.id, model: provider.model, prompt: line.text, episodeId: episode.id, sceneId: scene.id, characterId: line.characterId, params: { voiceId: profile.providerVoiceId } });
  await markRunning(ctx, job.id);
  try {
    const { data, mimeType } = await provider.synthesize({ text: line.text, voiceId: profile.providerVoiceId });
    const asset = await saveBufferAsAsset(ctx, {
      data,
      mimeType,
      name: `${character?.name ?? "Voice"} · S${scene.position + 1} L${line.position + 1}`,
      category: "voiceover",
      source: "generated",
      jobId: job.id,
    });
    await ctx.db.update(dialogueLines).set({ audioAssetId: asset.id }).where(eq(dialogueLines.id, line.id));
    await markSucceeded(ctx, job.id, asset.id, { characters: line.text.length });
    return { assetId: asset.id };
  } catch (err) {
    const message = err instanceof UserError ? err.message : "Voice generation failed unexpectedly.";
    if (!(err instanceof UserError)) console.error("[voice job]", err);
    await markFailed(ctx, job.id, message);
    throw new UserError(message);
  }
});
