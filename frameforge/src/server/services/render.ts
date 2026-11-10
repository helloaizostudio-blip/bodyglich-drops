import "server-only";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { assets, type Asset, type Episode, type GenerationJob, type RenderSettings } from "@/db/schema";
import { UserError } from "@/server/action";
import { storage } from "@/server/storage";
import { saveBufferAsAsset } from "@/server/services/assets";
import { createJob, failStaleJobs, getJob, listJobs, markFailed, markRunning, markSucceeded, updateJob } from "@/server/services/jobs";
import { listScenes, requireEpisode, type SceneView } from "@/server/services/scenes";
import { listCues, voiceoverAssets, type CueView } from "@/server/services/audio";
import { logActivity } from "@/server/services/activity";
import { probeFfmpeg, renderTimeline, RenderCanceledError, type TimelineCue, type TimelineScene } from "@/server/render/ffmpeg-plan";
import { cueStartSec, sceneStarts } from "@/server/render/timeline";
import { DEFAULT_RENDER_SETTINGS, RENDER_FPS, RENDER_SIZES } from "@/server/render/settings";

/* ------------------------------------------------------------------ */
/* ffmpeg availability                                                 */
/* ------------------------------------------------------------------ */

export type FfmpegStatus = { available: boolean; version?: string };

const ffmpegBinary = () => process.env.FFMPEG_PATH?.trim() || "ffmpeg";

let cachedStatus: { binary: string; at: number; value: Promise<FfmpegStatus> } | undefined;

/**
 * Whether this server can render video. A positive answer is cached for the life of the process;
 * a negative one is re-checked after a minute so installing ffmpeg does not need a restart.
 */
export function ffmpegStatus(): Promise<FfmpegStatus> {
  const binary = ffmpegBinary();
  if (cachedStatus && cachedStatus.binary === binary) return cachedStatus.value;
  const entry = {
    binary,
    at: Date.now(),
    value: probeFfmpeg(binary).then((version): FfmpegStatus => {
      if (version) return { available: true, version };
      setTimeout(() => {
        if (cachedStatus === entry) cachedStatus = undefined;
      }, 60_000).unref();
      return { available: false };
    }),
  };
  cachedStatus = entry;
  return entry.value;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

/** The episode's export settings, falling back to 1080p / 30 fps when nothing valid is stored. */
export function resolveRenderSettings(episode: Pick<Episode, "renderSettings">): RenderSettings {
  const s = episode.renderSettings;
  if (s && RENDER_SIZES.some((p) => p.width === s.width && p.height === s.height) && RENDER_FPS.includes(s.fps as (typeof RENDER_FPS)[number])) {
    return { width: s.width, height: s.height, fps: s.fps };
  }
  return DEFAULT_RENDER_SETTINGS;
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

export type RenderJobView = GenerationJob & { result: Asset | null };

/** Recent renders of an episode, newest first, each with its finished video when there is one. */
export async function listRenderJobs(ctx: Ctx, episodeId: string, limit = 8): Promise<RenderJobView[]> {
  await failStaleJobs(ctx);
  const jobs = await listJobs(ctx, { kinds: ["render"], episodeId, limit });
  const ids = jobs.map((j) => j.resultAssetId).filter((v): v is string => !!v);
  const rows = ids.length
    ? await ctx.db
        .select()
        .from(assets)
        .where(and(eq(assets.projectId, ctx.project.id), inArray(assets.id, ids)))
    : [];
  return jobs.map((j) => ({ ...j, result: rows.find((a) => a.id === j.resultAssetId) ?? null }));
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

type Snapshot = {
  episode: Episode;
  settings: RenderSettings;
  scenes: SceneView[];
  voices: Record<string, Asset>;
  cues: CueView[];
};

/**
 * Starts a real ffmpeg render of the episode timeline and returns its job row immediately.
 * The render keeps running in this server process; the UI follows it by polling the job.
 */
export async function startRender(ctx: Ctx, episodeId: string): Promise<GenerationJob> {
  const status = await ffmpegStatus();
  if (!status.available) {
    throw new UserError("This server has no ffmpeg, so it cannot render video. Deploy FRAMEFORGE on a host with ffmpeg installed, or set FFMPEG_PATH.");
  }
  const episode = await requireEpisode(ctx, episodeId);
  const scenes = await listScenes(ctx, episode.id);
  if (!scenes.length) throw new UserError("This episode has no scenes yet. Add scenes in Storyboard Studio before rendering.");
  if (!scenes.some((s) => s.durationSec > 0)) throw new UserError("Every scene has a duration of 0 seconds, so there is nothing to render.");

  await failStaleJobs(ctx);
  const active = await listJobs(ctx, { kinds: ["render"], episodeId: episode.id, statuses: ["queued", "running"], limit: 1 });
  if (active.length) throw new UserError("A render of this episode is already in progress. Wait for it to finish, or cancel it first.");

  const settings = resolveRenderSettings(episode);
  const [voices, cues] = await Promise.all([voiceoverAssets(ctx, scenes), listCues(ctx, episode.id)]);
  const totalSec = sceneStarts(scenes).total;

  const job = await createJob(ctx, {
    kind: "render",
    purpose: "Episode render",
    provider: "ffmpeg",
    model: status.version ?? "",
    episodeId: episode.id,
    params: { ...settings, sceneCount: scenes.length, durationSec: totalSec },
  });

  // Deliberately not awaited: the action returns the queued job and the render carries on here.
  void runRender(ctx, job.id, { episode, settings, scenes, voices, cues }).catch((err) => {
    console.error("[render crashed]", err);
  });
  return job;
}

/** What a scene shows: its animation clip when it has one, otherwise its visual. */
function scenePicture(scene: SceneView): Asset | null {
  const picture = scene.clip ?? scene.visual;
  return picture && (picture.kind === "video" || picture.kind === "image") ? picture : null;
}

async function runRender(ctx: Ctx, jobId: string, snap: Snapshot): Promise<void> {
  const { episode, settings } = snap;
  let tmpDir: string | undefined;
  let finished = false;

  // The job row is the source of truth for cancellation (and for jobs declared stale).
  let lastCheck = 0;
  let stopped = false;
  const isCanceled = async () => {
    if (stopped) return true;
    if (Date.now() - lastCheck < 1500) return false;
    lastCheck = Date.now();
    const job = await getJob(ctx, jobId);
    stopped = !job || (job.status !== "queued" && job.status !== "running");
    return stopped;
  };

  // Progress writes are throttled and chained so they can never land after the final status.
  let lastWrite = 0;
  let lastValue = -1;
  let writes: Promise<void> = Promise.resolve();
  const report = (fraction: number) => {
    const value = Math.round(Math.min(0.99, Math.max(0, fraction)) * 100) / 100;
    if (finished || value <= lastValue || Date.now() - lastWrite < 1200) return;
    lastWrite = Date.now();
    lastValue = value;
    writes = writes.then(() => (finished ? undefined : updateJob(ctx, jobId, { progress: value }))).catch(() => {});
  };

  try {
    await markRunning(ctx, jobId);
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "frameforge-render-"));

    // 1. Copy every input out of storage (each file once, even when it is used several times).
    const wanted = new Map<string, Asset>();
    for (const scene of snap.scenes) {
      const picture = scenePicture(scene);
      if (picture) wanted.set(picture.id, picture);
      for (const line of scene.lines) {
        const voice = line.audioAssetId ? snap.voices[line.audioAssetId] : undefined;
        if (voice) wanted.set(voice.id, voice);
      }
    }
    for (const cue of snap.cues) wanted.set(cue.asset.id, cue.asset);

    const local = new Map<string, string>();
    let n = 0;
    for (const asset of wanted.values()) {
      if (await isCanceled()) throw new RenderCanceledError();
      const ext = path.extname(asset.storageKey).replace(/[^.a-zA-Z0-9]/g, "");
      const file = path.join(tmpDir, `in-${String(n++).padStart(4, "0")}${ext}`);
      try {
        await storage().downloadTo(asset.storageKey, file);
      } catch {
        throw new Error(`“${asset.name}” is missing from storage, so the episode cannot be rendered. Re-upload it or remove it from the timeline.`);
      }
      local.set(asset.id, file);
      report((n / wanted.size) * 0.04);
    }

    // 2. Describe the timeline for the renderer.
    const { starts } = sceneStarts(snap.scenes);
    const scenes: TimelineScene[] = snap.scenes.map((scene) => {
      const picture = scenePicture(scene);
      const file = picture ? local.get(picture.id) : undefined;
      return {
        clipPath: picture?.kind === "video" ? file : undefined,
        imagePath: picture?.kind === "image" ? file : undefined,
        durationSec: scene.durationSec,
        voiceovers: scene.lines.flatMap((line) => {
          const voice = line.audioAssetId ? local.get(line.audioAssetId) : undefined;
          return voice ? [{ path: voice }] : [];
        }),
      };
    });
    const cues: TimelineCue[] = snap.cues.flatMap((cue) => {
      const file = local.get(cue.asset.id);
      if (!file) return [];
      // Scene cues are offset from their scene's start; episode cues from the start of the episode.
      const startSec = cueStartSec(cue, starts);
      return startSec === null ? [] : [{ path: file, startSec, volume: cue.volume }];
    });

    // 3. Render.
    const outPath = path.join(tmpDir, "render.mp4");
    const result = await renderTimeline({
      scenes,
      cues,
      width: settings.width,
      height: settings.height,
      fps: settings.fps,
      outPath,
      workDir: path.join(tmpDir, "segments"),
      ffmpegPath: ffmpegBinary(),
      onProgress: (f) => report(0.04 + f * 0.92),
      isCanceled,
    });

    // 4. Save the finished file to the Asset Library — unless the job was canceled meanwhile.
    lastCheck = 0;
    if (await isCanceled()) throw new RenderCanceledError();
    const data = await fsp.readFile(outPath);
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const asset = await saveBufferAsAsset(ctx, {
      data,
      mimeType: "video/mp4",
      name: `${episode.title} – render ${date}`.slice(0, 120),
      category: "final_video",
      source: "render",
      jobId,
      width: result.width,
      height: result.height,
      durationSec: result.durationSec,
    });
    finished = true;
    await writes;
    await markSucceeded(ctx, jobId, asset.id, {
      frames: result.frames,
      durationSec: result.durationSec,
      sizeBytes: data.length,
      warnings: result.warnings,
    });
    await logActivity(ctx, "render", `Rendered “${episode.title}” (${settings.width}×${settings.height}, ${settings.fps} fps)`, `/editor?episode=${episode.id}`);
  } catch (err) {
    finished = true;
    await writes;
    // A canceled (or already closed) job keeps its status; everything else is an honest failure.
    const job = await getJob(ctx, jobId).catch(() => null);
    if (job && (job.status === "queued" || job.status === "running")) {
      const message = err instanceof RenderCanceledError ? "The render was stopped before it finished." : err instanceof Error ? err.message : "The render failed for an unknown reason.";
      await markFailed(ctx, jobId, message).catch((e) => console.error("[render] could not record failure", e));
    }
    if (!(err instanceof RenderCanceledError)) console.error("[render failed]", err);
  } finally {
    if (tmpDir) await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
