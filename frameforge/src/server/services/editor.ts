import "server-only";
import { eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { publishingRecords, type Asset, type Episode, type RenderSettings } from "@/db/schema";
import { listScenes, type SceneView } from "@/server/services/scenes";
import { listCues, voiceoverAssets, type CueView } from "@/server/services/audio";
import { ffmpegStatus, listRenderJobs, resolveRenderSettings, type FfmpegStatus, type RenderJobView } from "@/server/services/render";

export type EditorData = {
  scenes: SceneView[];
  /** Voiceover recordings by asset id. */
  voices: Record<string, Asset>;
  cues: CueView[];
  settings: RenderSettings;
  /** False until the user has chosen export settings for this episode. */
  settingsSaved: boolean;
  ffmpeg: FfmpegStatus;
  jobs: RenderJobView[];
  /** The video currently attached to the episode's publishing package, if any. */
  finalVideoAssetId: string | null;
};

/** Everything the Video Editor shows for one episode. The episode must already be project-checked. */
export async function getEditorData(ctx: Ctx, episode: Episode): Promise<EditorData> {
  const scenes = await listScenes(ctx, episode.id);
  const [voices, cues, ffmpeg, jobs, publishing] = await Promise.all([
    voiceoverAssets(ctx, scenes),
    listCues(ctx, episode.id),
    ffmpegStatus(),
    listRenderJobs(ctx, episode.id),
    ctx.db.select({ videoAssetId: publishingRecords.videoAssetId }).from(publishingRecords).where(eq(publishingRecords.episodeId, episode.id)).limit(1),
  ]);
  return {
    scenes,
    voices,
    cues,
    settings: resolveRenderSettings(episode),
    settingsSaved: !!episode.renderSettings,
    ffmpeg,
    jobs,
    finalVideoAssetId: publishing[0]?.videoAssetId ?? null,
  };
}
