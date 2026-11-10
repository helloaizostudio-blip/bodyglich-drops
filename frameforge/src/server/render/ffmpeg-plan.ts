/**
 * Pure ffmpeg timeline renderer. No database, no Next.js and no "server-only" import, so it can
 * be exercised directly from a script (`npx tsx`). The DB wrapper lives in services/render.ts.
 *
 * How a timeline becomes an MP4:
 *  1. Every scene is encoded to its own video-only segment, normalised to the target size, frame
 *     rate and yuv420p: a clip is letterboxed, then cut or frozen on its last frame to exactly the
 *     scene length; a still image is held for the scene length; a scene with neither is a solid
 *     dark card. Segment lengths are counted in frames from the running total, so rounding never
 *     drifts over a long episode.
 *  2. The segments are joined without re-encoding, and the soundtrack is mixed in the same pass:
 *     voiceover lines play back-to-back from their scene's start, music / sound-effect cues start
 *     at their absolute offset with their own volume. Audio inside animation clips is dropped (v1).
 */
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";

export type TimelineScene = {
  /** Video clip for the scene (wins over imagePath). */
  clipPath?: string;
  /** Still image shown for the whole scene when there is no clip. */
  imagePath?: string;
  durationSec: number;
  /** Voiceover files, played one after another from the start of the scene. */
  voiceovers: { path: string }[];
};

export type TimelineCue = {
  path: string;
  /** Absolute offset from the start of the episode. */
  startSec: number;
  /** Linear gain, 1 = unchanged. */
  volume: number;
};

export type RenderTimelineInput = {
  scenes: TimelineScene[];
  cues: TimelineCue[];
  width: number;
  height: number;
  fps: number;
  outPath: string;
  /** ffmpeg binary. Defaults to "ffmpeg" on PATH. */
  ffmpegPath?: string;
  /** Directory for intermediate segments. Defaults to a folder next to outPath; always removed. */
  workDir?: string;
  /** Called with 0..1 as the render advances. */
  onProgress?: (fraction: number) => void;
  /** Polled about once a second; return true to stop the render. */
  isCanceled?: () => boolean | Promise<boolean>;
};

export type RenderTimelineResult = {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  frames: number;
  /** Things the user should know about, e.g. a cue that starts after the episode ends. */
  warnings: string[];
};

export class RenderCanceledError extends Error {
  constructor() {
    super("The render was canceled.");
    this.name = "RenderCanceledError";
  }
}

/** Colour of a scene that has neither a clip nor a visual (FRAMEFORGE navy). */
const EMPTY_SCENE_COLOR = "0x0B1B36";
const AUDIO_RATE = 48000;
const AUDIO_NORMALISE = `aresample=${AUDIO_RATE},aformat=sample_fmts=fltp:channel_layouts=stereo`;

/* ------------------------------------------------------------------ */
/* Running ffmpeg                                                      */
/* ------------------------------------------------------------------ */

const TIME_RE = /time=(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g;
const FRAME_RE = /frame=\s*(\d+)/g;

type RunOptions = {
  /** Seconds of output written so far, parsed from ffmpeg's `time=` status line. */
  onTime?: (seconds: number) => void;
  isCanceled?: () => boolean | Promise<boolean>;
};

/** Resolves to the number of video frames ffmpeg reported writing. */
function runFfmpeg(bin: string, args: string[], opts: RunOptions = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    // Arguments are always passed as an array — nothing here ever goes through a shell.
    const child = spawn(bin, ["-hide_banner", "-nostdin", "-loglevel", "error", "-stats", "-y", ...args], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let log = "";
    let frames = 0;
    let canceled = false;
    let checking = false;

    const timer = opts.isCanceled
      ? setInterval(async () => {
          if (checking || canceled) return;
          checking = true;
          try {
            if (await opts.isCanceled!()) {
              canceled = true;
              child.kill("SIGKILL");
            }
          } catch {
            /* a failed check must not kill a healthy render */
          } finally {
            checking = false;
          }
        }, 1000)
      : null;

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      let last: RegExpExecArray | null = null;
      for (let m = TIME_RE.exec(chunk); m; m = TIME_RE.exec(chunk)) last = m;
      if (last) opts.onTime?.(Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]));
      for (let m = FRAME_RE.exec(chunk); m; m = FRAME_RE.exec(chunk)) frames = Number(m[1]);
      // Status lines end in \r; everything else is a real message worth keeping for error reports.
      for (const line of chunk.split(/[\r\n]+/)) {
        if (line.trim() && !/^(frame=|size=)/.test(line.trim())) log = `${log}${line.trim()}\n`.slice(-3000);
      }
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (timer) clearInterval(timer);
      reject(err.code === "ENOENT" ? new Error(`ffmpeg was not found (tried “${bin}”).`) : err);
    });
    child.on("close", (code) => {
      if (timer) clearInterval(timer);
      if (canceled) reject(new RenderCanceledError());
      else if (code === 0) resolve(frames);
      else reject(new Error(`ffmpeg stopped with an error${log ? `: ${log.trim()}` : ` (exit code ${code}).`}`));
    });
  });
}

/** Runs `ffmpeg -version`. Resolves to the version string, or null when the binary cannot run. */
export function probeFfmpeg(ffmpegPath = "ffmpeg"): Promise<string | null> {
  return new Promise((resolve) => {
    let out = "";
    let settled = false;
    const done = (v: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    const child = spawn(/*turbopackIgnore: true*/ ffmpegPath, ["-version"], { stdio: ["ignore", "pipe", "ignore"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      done(null);
    }, 8000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (out += chunk));
    child.on("error", () => done(null));
    child.on("close", (code) => done(code === 0 ? (/ffmpeg version (\S+)/.exec(out)?.[1] ?? "unknown") : null));
  });
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

type PlannedScene = TimelineScene & { index: number; startFrame: number; frames: number };

/** Frame-accurate layout: each scene ends on the frame nearest to its cumulative end time. */
export function planFrames(scenes: TimelineScene[], fps: number): { planned: PlannedScene[]; totalFrames: number } {
  const planned: PlannedScene[] = [];
  let elapsed = 0;
  let frame = 0;
  scenes.forEach((scene, index) => {
    const duration = Number.isFinite(scene.durationSec) ? Math.max(0, scene.durationSec) : 0;
    elapsed += duration;
    const endFrame = Math.round(elapsed * fps);
    const frames = endFrame - frame;
    if (frames > 0) planned.push({ ...scene, index, startFrame: frame, frames });
    frame = Math.max(frame, endFrame);
  });
  return { planned, totalFrames: frame };
}

const secs = (n: number) => n.toFixed(6);

/** Encoder settings shared by every segment, so they can be joined without re-encoding. */
function videoEncodeArgs(fps: number, frames: number): string[] {
  return [
    "-an",
    "-frames:v", String(frames),
    "-r", String(fps),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "19",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-g", String(fps * 2),
    "-colorspace", "bt709",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-color_range", "tv",
    "-video_track_timescale", "90000",
  ];
}

/** ffmpeg arguments that turn one scene into a video-only segment of exactly `frames` frames. */
export function sceneSegmentArgs(
  scene: Pick<TimelineScene, "clipPath" | "imagePath"> & { frames: number },
  o: { width: number; height: number; fps: number; outPath: string },
): string[] {
  const { width: w, height: h, fps } = o;
  const source = scene.clipPath ?? scene.imagePath;
  if (!source) {
    return ["-f", "lavfi", "-i", `color=c=${EMPTY_SCENE_COLOR}:s=${w}x${h}:r=${fps}`, "-vf", "format=yuv420p", ...videoEncodeArgs(fps, scene.frames), o.outPath];
  }
  const hold = secs(scene.frames / fps + 1);
  const graph = [
    // Black canvas the picture is centred on (letterbox / pillarbox, and it flattens transparency).
    `color=c=black:s=${w}x${h}:r=${fps}[bg]`,
    // Square the pixels and fit inside the frame without cropping or stretching. Then make the
    // source at least as long as the scene: a short clip, or a single still frame, holds its last
    // frame (tpad). A longer clip is cut by -frames:v.
    `[0:v:0]scale=w=iw*sar:h=ih,setsar=1,scale=w=${w}:h=${h}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=bicubic:out_color_matrix=bt709:out_range=tv,fps=${fps},tpad=stop_mode=clone:stop_duration=${hold},format=yuva420p[fg]`,
    `[bg][fg]overlay=x=(W-w)/2:y=(H-h)/2:shortest=1,setsar=1,format=yuv420p[v]`,
  ].join(";");
  return ["-i", source, "-filter_complex", graph, "-map", "[v]", ...videoEncodeArgs(fps, scene.frames), o.outPath];
}

export type AudioPlan = {
  /** Input arguments for the audio files, in the order the graph refers to them (after input 0, the video). */
  inputs: string[];
  /** filter_complex graph ending in [aout]. */
  graph: string;
  warnings: string[];
};

/** Builds the soundtrack graph. Audio inputs start at index 1 (input 0 is the joined video). */
export function buildAudioPlan(planned: PlannedScene[], cues: TimelineCue[], fps: number, totalSec: number): AudioPlan {
  const inputs: string[] = [];
  const chains: string[] = [];
  const mixed: string[] = [];
  const warnings: string[] = [];
  let next = 1;
  const addInput = (file: string) => {
    inputs.push("-i", file);
    return next++;
  };
  const delay = (seconds: number) => `adelay=delays=${Math.max(0, Math.round(seconds * 1000))}:all=1`;

  for (const scene of planned) {
    if (!scene.voiceovers.length) continue;
    const labels = scene.voiceovers.map((v) => {
      const i = addInput(v.path);
      chains.push(`[${i}:a:0]${AUDIO_NORMALISE}[n${i}]`);
      return `[n${i}]`;
    });
    const out = `[vo${scene.index}]`;
    const joined = labels.length > 1 ? `${labels.join("")}concat=n=${labels.length}:v=0:a=1,` : labels[0];
    chains.push(`${joined}${delay(scene.startFrame / fps)}${out}`);
    mixed.push(out);
  }

  cues.forEach((cue, n) => {
    const start = Number.isFinite(cue.startSec) ? Math.max(0, cue.startSec) : 0;
    if (start >= totalSec) {
      warnings.push(`A music / sound-effect cue starts at ${start.toFixed(1)}s, after the episode ends (${totalSec.toFixed(1)}s), and was left out.`);
      return;
    }
    const volume = Number.isFinite(cue.volume) ? Math.min(4, Math.max(0, cue.volume)) : 1;
    const i = addInput(cue.path);
    chains.push(`[${i}:a:0]${AUDIO_NORMALISE},volume=${volume.toFixed(3)},${delay(start)}[cue${n}]`);
    mixed.push(`[cue${n}]`);
  });

  if (!mixed.length) {
    // No sound at all: a silent track keeps players and upload sites happy.
    inputs.push("-f", "lavfi", "-i", `anullsrc=channel_layout=stereo:sample_rate=${AUDIO_RATE}`);
    return { inputs, graph: `[1:a]atrim=duration=${secs(totalSec)}[aout]`, warnings };
  }
  // normalize=0 keeps every track at the level the user chose instead of ducking them as tracks are
  // added; the limiter only catches peaks. Then pad / cut to exactly the length of the picture.
  chains.push(
    `${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=longest:dropout_transition=0,alimiter=limit=0.97:level=disabled,apad,atrim=duration=${secs(totalSec)}[aout]`,
  );
  return { inputs, graph: chains.join(";"), warnings };
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

export async function renderTimeline(input: RenderTimelineInput): Promise<RenderTimelineResult> {
  const { width, height, fps } = input;
  const bin = input.ffmpegPath || "ffmpeg";
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width % 2 || height % 2) {
    throw new Error("The output size must be even whole numbers of pixels.");
  }
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new Error("The frame rate must be a whole number between 1 and 120.");

  const { planned, totalFrames } = planFrames(input.scenes, fps);
  if (!planned.length) throw new Error("There is nothing to render: the timeline has no scenes with a duration.");
  const totalSec = totalFrames / fps;

  const progress = (fraction: number) => input.onProgress?.(Math.min(1, Math.max(0, fraction)));
  const checkCanceled = async () => {
    if (input.isCanceled && (await input.isCanceled())) throw new RenderCanceledError();
  };

  const workDir = input.workDir ?? path.join(path.dirname(input.outPath), `.segments-${process.pid}-${Date.now()}`);
  await fsp.mkdir(workDir, { recursive: true });
  // Segments are ~90% of the work, the final join + sound mix the rest.
  const SEGMENT_SHARE = 0.9;

  try {
    progress(0);
    const segmentNames: string[] = [];
    for (const scene of planned) {
      await checkCanceled();
      const name = `seg-${String(scene.index).padStart(4, "0")}.mp4`;
      const outPath = path.join(workDir, name);
      const written = await runFfmpeg(bin, sceneSegmentArgs(scene, { width, height, fps, outPath }), {
        isCanceled: input.isCanceled,
        onTime: (t) => progress(((scene.startFrame + Math.min(scene.frames, t * fps)) / totalFrames) * SEGMENT_SHARE),
      });
      // Never join a short or empty segment: the episode would silently lose time.
      if (written !== scene.frames) {
        throw new Error(`Scene ${scene.index + 1} rendered ${written} of ${scene.frames} frames. Its clip or image may be damaged or unreadable.`);
      }
      segmentNames.push(name);
      progress(((scene.startFrame + scene.frames) / totalFrames) * SEGMENT_SHARE);
    }

    await checkCanceled();
    const listPath = path.join(workDir, "segments.txt");
    await fsp.writeFile(listPath, segmentNames.map((n) => `file '${n}'`).join("\n") + "\n", "utf8");

    const audio = buildAudioPlan(planned, input.cues, fps, totalSec);
    await fsp.mkdir(path.dirname(input.outPath), { recursive: true });
    await runFfmpeg(
      bin,
      [
        "-f", "concat", "-safe", "0", "-i", listPath,
        ...audio.inputs,
        "-filter_complex", audio.graph,
        "-map", "0:v:0",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", String(AUDIO_RATE),
        "-ac", "2",
        "-t", secs(totalSec),
        "-movflags", "+faststart",
        input.outPath,
      ],
      {
        isCanceled: input.isCanceled,
        onTime: (t) => progress(SEGMENT_SHARE + Math.min(1, t / totalSec) * (1 - SEGMENT_SHARE)),
      },
    );
    progress(1);
    return { durationSec: totalSec, width, height, fps, frames: totalFrames, warnings: audio.warnings };
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
