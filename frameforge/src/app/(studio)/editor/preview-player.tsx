"use client";

import { useCallback, useEffect, useRef } from "react";
import { ImageOff, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { fileUrl } from "@/lib/utils";
import { sceneLabel, timecode } from "@/server/render/timeline";
import { IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { sceneAt, type AudioBlock, type EditorScene, type EditorTimeline } from "./model";
import { useClock, type PreviewClock } from "./preview-clock";

/**
 * In-browser preview of the episode: steps through the scenes in order, showing each scene's
 * clip (or still visual) for the scene's duration while voiceovers, music and sound effects play
 * at their timeline positions. It approximates the render — the rendered file is the reference.
 */
export function PreviewPlayer({
  timeline,
  clock,
  aspect,
  onNavigate,
}: {
  timeline: EditorTimeline;
  clock: PreviewClock;
  /** Export frame size, so the preview letterboxes the same way the render does. */
  aspect: { width: number; height: number };
  /** The user jumped to a scene with the previous / next buttons. */
  onNavigate: (sceneId: string) => void;
}) {
  const { time, playing } = useClock(clock);
  const scene = sceneAt(timeline, time);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef(timeline);
  const pool = useRef(new Map<string, HTMLAudioElement>());

  /** Brings the <video> and every sound in line with the clock. Safe to call at any time. */
  const sync = useCallback(() => {
    const tl = timelineRef.current;
    const t = clock.now;
    const isPlaying = clock.playing;

    const video = videoRef.current;
    const current = sceneAt(tl, t);
    // Only drive the element when it already belongs to the scene the clock is in.
    if (video && current && video.dataset.scene === current.id) {
      const local = Math.max(0, t - current.startSec);
      const length = Number.isFinite(video.duration) ? video.duration : null;
      // A clip shorter than its scene holds its last frame, as in the render.
      const pastEnd = length !== null && local >= length - 0.05;
      const target = length !== null ? Math.min(local, Math.max(0, length - 0.05)) : local;
      if (video.readyState >= 1 && Math.abs(video.currentTime - target) > (isPlaying && !pastEnd ? 0.35 : 0.04)) video.currentTime = target;
      if (isPlaying && !pastEnd) {
        if (video.paused) video.play().catch(() => {});
      } else if (!video.paused) video.pause();
    }

    const blocks: AudioBlock[] = [...tl.voice, ...tl.music, ...tl.sfx];
    const wanted = new Set(blocks.map((b) => b.key));
    for (const [key, el] of pool.current) {
      if (!wanted.has(key)) {
        el.pause();
        el.removeAttribute("src");
        pool.current.delete(key);
      }
    }
    for (const block of blocks) {
      let el = pool.current.get(block.key);
      const local = t - block.startSec;
      const length = el && Number.isFinite(el.duration) ? el.duration : block.durationSec;
      const active = isPlaying && local >= 0 && (length === null || local < length - 0.05);
      if (!active) {
        if (el && !el.paused) el.pause();
        continue;
      }
      if (!el) {
        el = new Audio(fileUrl(block.assetId));
        el.preload = "auto";
        pool.current.set(block.key, el);
      }
      // Browsers cap element volume at 100%; louder cues are only heard at full level in the render.
      el.volume = Math.min(1, Math.max(0, block.volume));
      if (el.paused) {
        // A sound that just played to its end stays finished (the clock may trail it slightly);
        // it only starts again after a seek back into it.
        if (el.ended && (length === null || local > length - 0.6)) continue;
        el.currentTime = local;
        el.play().catch(() => {});
      } else if (Math.abs(el.currentTime - local) > 0.4) {
        el.currentTime = local;
      }
    }
  }, [clock]);

  // Keep the engine's view of the timeline current, and the clock's length in step with it.
  useEffect(() => {
    timelineRef.current = timeline;
    clock.setDuration(timeline.totalSec);
    sync();
  }, [timeline, clock, sync]);

  // The play loop: advance the clock on every animation frame while playing.
  useEffect(() => {
    if (!playing) {
      sync();
      return;
    }
    let raf = 0;
    let last = performance.now();
    let sceneId = sceneAt(timelineRef.current, clock.now)?.id;
    const loop = (now: number) => {
      // Cap the step so a stalled tab resumes where it was instead of jumping ahead.
      clock.advance(Math.min(0.25, (now - last) / 1000));
      last = now;
      const nextId = sceneAt(timelineRef.current, clock.now)?.id;
      if (nextId !== sceneId) {
        sceneId = nextId;
        clock.publish(); // switch the picture immediately at a scene boundary
      }
      sync();
      if (clock.playing) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, clock, sync]);

  // While paused, a seek (scrubber, timeline tap, prev / next) must update the picture.
  useEffect(() => {
    if (!playing) sync();
  }, [time, playing, scene?.id, sync]);

  // Stop when the tab is hidden, and release every media element when the editor closes.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) clock.setPlaying(false);
    };
    document.addEventListener("visibilitychange", onHide);
    const elements = pool.current;
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      clock.setPlaying(false);
      for (const el of elements.values()) {
        el.pause();
        el.removeAttribute("src");
      }
      elements.clear();
    };
  }, [clock]);

  const total = timeline.totalSec;
  const toggle = () => {
    if (!playing && time >= total - 0.01) clock.seek(0);
    clock.setPlaying(!playing);
  };
  const jump = (target: EditorScene | undefined) => {
    if (!target) return;
    clock.seek(target.startSec);
    onNavigate(target.id);
  };
  const playable = timeline.scenes.filter((s) => s.durationSec > 0);
  const at = scene ? playable.findIndex((s) => s.id === scene.id) : -1;
  const previous = () => {
    if (!scene) return;
    // Like a music player: first back to the start of this scene, then to the one before.
    jump(time - scene.startSec > 1 || at <= 0 ? scene : playable[at - 1]);
  };
  const next = () => jump(playable[at + 1]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio: `${aspect.width} / ${aspect.height}`, maxWidth: `calc(62dvh * ${aspect.width} / ${aspect.height})` }}
      >
        {scene?.picture?.kind === "video" ? (
          <video
            key={`${scene.id}:${scene.picture.id}`}
            ref={videoRef}
            data-scene={scene.id}
            src={fileUrl(scene.picture.id)}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={sync}
            className="absolute inset-0 size-full object-contain"
          />
        ) : scene?.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={scene.picture.id} src={fileUrl(scene.picture.id)} alt={scene.picture.name} className="absolute inset-0 size-full object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-navy-950 p-4 text-center">
            <div>
              <ImageOff className="mx-auto size-8 text-navy-600" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-white/80">No visual yet</p>
              <p className="mt-0.5 text-xs text-white/50">This scene renders as a plain dark card.</p>
            </div>
          </div>
        )}
        {scene ? (
          <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-lg bg-navy-950/75 px-2 py-1 text-[11px] font-bold text-white">{sceneLabel(scene)}</span>
        ) : null}
        <Badge tone="navy" className="absolute right-2 top-2 !bg-navy-950/75">
          Preview
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="Previous scene" onClick={previous} disabled={!scene}>
          <SkipBack className="size-5" />
        </IconButton>
        <button
          type="button"
          onClick={toggle}
          disabled={total <= 0}
          aria-label={playing ? "Pause preview" : "Play preview"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgb(38_112_230/0.7)] transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
        >
          {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 translate-x-px fill-current" />}
        </button>
        <IconButton label="Next scene" onClick={next} disabled={at < 0 || at >= playable.length - 1}>
          <SkipForward className="size-5" />
        </IconButton>
        <span className="ml-auto text-[13px] font-semibold tabular-nums text-navy-800">
          {timecode(time)} <span className="font-medium text-muted">/ {timecode(total)}</span>
        </span>
      </div>

      <input
        type="range"
        aria-label="Preview position"
        min={0}
        max={Math.max(total, 0.1)}
        step={0.05}
        value={Math.min(time, total)}
        disabled={total <= 0}
        onChange={(e) => clock.seek(Number(e.target.value))}
        className="h-10 w-full accent-brand-600"
      />

      <p className="text-xs leading-relaxed text-muted">
        This is a quick browser preview with approximate timing — the rendered video is the source of truth. Sound inside animation clips is muted here and is not included in the render (v1).
      </p>
    </div>
  );
}
