/**
 * Timeline arithmetic shared by the renderer, the Video Editor and the Audio Studio, so a cue or
 * a scene sits at the same moment everywhere. Pure functions only (safe for client components).
 */

/** When each scene starts (seconds from the start of the episode), and the episode's total length. */
export function sceneStarts(scenes: { id: string; durationSec: number }[]): { starts: Record<string, number>; total: number } {
  const starts: Record<string, number> = {};
  let total = 0;
  for (const scene of scenes) {
    starts[scene.id] = total;
    total += Math.max(0, scene.durationSec);
  }
  return { starts, total };
}

/**
 * Absolute start of a music / sound-effect cue. A cue tied to a scene is offset from that scene's
 * start; otherwise from the start of the episode. Null when its scene is not in the timeline.
 */
export function cueStartSec(cue: { sceneId: string | null; startSec: number }, starts: Record<string, number>): number | null {
  if (!cue.sceneId) return Math.max(0, cue.startSec);
  const base: number | undefined = starts[cue.sceneId];
  return base === undefined ? null : base + Math.max(0, cue.startSec);
}

/** 65.25 → "1:05.3". Used wherever tenths of a second matter. */
export function timecode(seconds: number): string {
  const tenths = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 10));
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenths % 10}`;
}

/** 5 → "5s", 2.5 → "2.5s". */
export function secondsLabel(seconds: number): string {
  return `${Math.round(seconds * 10) / 10}s`;
}

export function sceneLabel(scene: { position: number; title: string }): string {
  return `Scene ${scene.position + 1}${scene.title.trim() ? ` · ${scene.title.trim()}` : ""}`;
}
