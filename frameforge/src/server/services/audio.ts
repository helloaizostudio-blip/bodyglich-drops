import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  assets,
  audioCues,
  characters,
  dialogueLines,
  episodes,
  scenes,
  voiceProfiles,
  type Asset,
  type AudioCue,
  type DialogueLine,
  type Episode,
  type Scene,
  type VoiceProfile,
} from "@/db/schema";
import { UserError } from "@/server/action";
import type { SceneView } from "@/server/services/scenes";

/** A music / sound-effect placement together with the sound it plays. */
export type CueView = AudioCue & { asset: Asset };

/** Music and sound-effect cues of an episode (project-scoped), oldest first. */
export async function listCues(ctx: Ctx, episodeId: string): Promise<CueView[]> {
  const rows = await ctx.db
    .select({ cue: audioCues, asset: assets })
    .from(audioCues)
    .innerJoin(episodes, eq(episodes.id, audioCues.episodeId))
    .innerJoin(assets, eq(assets.id, audioCues.assetId))
    .where(and(eq(audioCues.episodeId, episodeId), eq(episodes.projectId, ctx.project.id), eq(assets.projectId, ctx.project.id)))
    .orderBy(asc(audioCues.createdAt));
  return rows.map((r) => ({ ...r.cue, asset: r.asset }));
}

/** The voiceover recordings attached to the dialogue lines of these scenes, by asset id. */
export async function voiceoverAssets(ctx: Ctx, sceneList: Pick<SceneView, "lines">[]): Promise<Record<string, Asset>> {
  const ids = [...new Set(sceneList.flatMap((s) => s.lines.map((l) => l.audioAssetId)).filter((v): v is string => !!v))];
  if (!ids.length) return {};
  const rows = await ctx.db
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, ctx.project.id), inArray(assets.id, ids)));
  return Object.fromEntries(rows.map((a) => [a.id, a]));
}

export type VoiceProfileView = VoiceProfile & { sample: Asset | null };

/** Saved voice profiles of every character in the studio, by character id. */
export async function listVoiceProfiles(ctx: Ctx): Promise<Record<string, VoiceProfileView>> {
  const rows = await ctx.db
    .select({ profile: voiceProfiles, sample: assets })
    .from(voiceProfiles)
    .innerJoin(characters, eq(characters.id, voiceProfiles.characterId))
    .leftJoin(assets, and(eq(assets.id, voiceProfiles.sampleAssetId), eq(assets.projectId, ctx.project.id)))
    .where(eq(characters.projectId, ctx.project.id));
  return Object.fromEntries(rows.map((r) => [r.profile.characterId, { ...r.profile, sample: r.sample }]));
}

export async function requireLine(ctx: Ctx, lineId: string): Promise<{ line: DialogueLine; scene: Scene; episode: Episode }> {
  const [row] = await ctx.db
    .select({ line: dialogueLines, scene: scenes, episode: episodes })
    .from(dialogueLines)
    .innerJoin(scenes, eq(scenes.id, dialogueLines.sceneId))
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(and(eq(dialogueLines.id, lineId), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("That dialogue line no longer exists.");
  return row;
}

export async function requireCue(ctx: Ctx, cueId: string): Promise<{ cue: AudioCue; episode: Episode }> {
  const [row] = await ctx.db
    .select({ cue: audioCues, episode: episodes })
    .from(audioCues)
    .innerJoin(episodes, eq(episodes.id, audioCues.episodeId))
    .where(and(eq(audioCues.id, cueId), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("That cue no longer exists.");
  return row;
}

/** A scene id is only valid for a cue when the scene belongs to the cue's episode. */
export async function requireSceneInEpisode(ctx: Ctx, sceneId: string, episodeId: string): Promise<Scene> {
  const [row] = await ctx.db
    .select({ scene: scenes })
    .from(scenes)
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(and(eq(scenes.id, sceneId), eq(scenes.episodeId, episodeId), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("That scene is not part of this episode.");
  return row.scene;
}
