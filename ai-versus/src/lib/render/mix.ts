import fs from "node:fs";
import { decodePcm, encodeWav, ffmpeg } from "../audio/ffmpeg";
import { SR, sfxAmbience, sfxChime, sfxPop, sfxWhoosh, synthMusic } from "../audio/synth";
import type { AudioRole, Settings, Timeline } from "../types";

/**
 * Mixes the final soundtrack sample-accurately in JS:
 * dialogue at each scene's voiceStart, procedural music ducked under speech, transition whooshes,
 * card pops, the ending chime and a light environment ambience.
 */
export async function mixSoundtrack(
  tl: Timeline,
  clips: Partial<Record<AudioRole, string>>,
  s: Settings,
  hazard: Parameters<typeof sfxAmbience>[1],
  out: string,
): Promise<{ peak: number; dialogIntervals: [number, number][] }> {
  const n = Math.ceil(tl.duration * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const dialog = new Float32Array(n);
  const intervals: [number, number][] = [];

  for (const sc of tl.scenes) {
    const file = clips[sc.audioRole];
    if (!file) throw new Error(`no audio for ${sc.audioRole}`);
    const pcm = await decodePcm(file, SR);
    const o = Math.round(sc.voiceStart * SR);
    for (let i = 0; i < pcm.length && o + i < n; i++) dialog[o + i] += pcm[i];
    intervals.push([sc.voiceStart, sc.voiceStart + pcm.length / SR]);
  }

  // ducking envelope from dialogue
  const duck = new Float32Array(n);
  let e = 0;
  const att = Math.exp(-1 / (0.02 * SR));
  const rel = Math.exp(-1 / (0.35 * SR));
  for (let i = 0; i < n; i++) {
    const v = Math.abs(dialog[i]);
    e = v > e ? att * e + (1 - att) * v : rel * e + (1 - rel) * v;
    duck[i] = Math.min(1, e * 6);
  }

  const add = (src: [Float32Array, Float32Array], at: number, gain: number, ducked = false) => {
    const o = Math.round(at * SR);
    for (let i = 0; i < src[0].length; i++) {
      const j = o + i;
      if (j < 0 || j >= n) continue;
      const g = ducked ? gain * (1 - 0.65 * duck[j]) : gain;
      L[j] += src[0][i] * g;
      R[j] += src[1][i] * g;
    }
  };

  if (s.video.music) add(synthMusic(tl.duration, { seed: tl.seed, hazard }), 0, Math.pow(10, (s.video.musicVolumeDb + 18) / 20), true);
  if (s.video.sfx) {
    add(sfxAmbience(tl.duration, hazard, tl.seed), 0, 0.35, true);
    for (const sc of tl.scenes) {
      if (sc.kind !== "intro") add(sfxWhoosh(sc.index + tl.seed), sc.start - 0.18, 0.55);
      if (sc.kind === "response") add(sfxPop(), sc.start + 0.2, 0.5);
      if (sc.kind === "ending") add(sfxChime(), sc.voiceStart - 0.05, 0.55);
    }
  }
  for (let i = 0; i < n; i++) {
    L[i] += dialog[i];
    R[i] += dialog[i];
  }
  // gentle soft-clip limiter
  let peak = 0;
  for (let i = 0; i < n; i++) {
    for (const B of [L, R]) {
      const v = B[i];
      const a = Math.abs(v);
      B[i] = a > 0.9 ? Math.sign(v) * (0.9 + 0.1 * Math.tanh((a - 0.9) / 0.1)) : v;
      peak = Math.max(peak, Math.abs(B[i]));
    }
  }
  fs.writeFileSync(out, encodeWav([L, R], SR));
  return { peak, dialogIntervals: intervals };
}

/** Concatenate per-scene renders and mux the soundtrack into the final H.264/AAC MP4. */
export async function assembleVideo(sceneFiles: string[], audioWav: string, duration: number, out: string, workDir: string) {
  const list = `${workDir}/concat.txt`;
  fs.writeFileSync(list, sceneFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
  await ffmpeg([
    "-f", "concat", "-safe", "0", "-i", list,
    "-i", audioWav,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-t", duration.toFixed(3),
    "-movflags", "+faststart",
    out,
  ]);
}
