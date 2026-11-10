"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Pause, Play } from "lucide-react";
import type { SceneView } from "@/server/services/scenes";
import { fileUrl, formatDuration } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { IconButton } from "@/components/ui/button";
import type { CastOption } from "@/components/episodes/episode-form";

/**
 * Animatic preview: plays the storyboard like a slideshow — each scene's visual stays on screen
 * for its duration while its dialogue appears as captions. A planning tool, not the final video.
 */
export function Animatic({ scenes, cast, startIndex, onClose }: { scenes: SceneView[]; cast: CastOption[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = useRef<number | null>(null);
  const scene = scenes[index];

  useEffect(() => {
    if (!playing || !scene) return;
    let raf = 0;
    const tick = (t: number) => {
      const dt = last.current === null ? 0 : (t - last.current) / 1000;
      last.current = t;
      setElapsed((e) => e + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, scene]);

  useEffect(() => {
    if (!scene || elapsed < scene.durationSec) return;
    if (index < scenes.length - 1) {
      setIndex(index + 1);
      setElapsed(0);
    } else {
      setPlaying(false);
      setElapsed(scene.durationSec);
    }
  }, [elapsed, scene, index, scenes.length]);

  if (!scene) return null;
  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(scenes.length - 1, i)));
    setElapsed(0);
  };
  const lines = scene.lines.filter((l) => l.text.trim());
  // Spread the lines evenly across the scene so captions change as it plays.
  const line = lines.length ? lines[Math.min(lines.length - 1, Math.floor((elapsed / Math.max(scene.durationSec, 0.1)) * lines.length))] : null;
  const speaker = line ? (cast.find((c) => c.id === line.characterId)?.name ?? line.speaker) : "";
  const before = scenes.slice(0, index).reduce((s, x) => s + x.durationSec, 0);
  const total = scenes.reduce((s, x) => s + x.durationSec, 0);
  const portrait = scene.aspectRatio === "9:16" || scene.aspectRatio === "3:4";

  return (
    <Modal open onClose={onClose} title="Storyboard preview" description="Animatic made from your scene visuals, durations and dialogue." size="lg">
      <div className="flex flex-col gap-3">
        <div className={`relative mx-auto w-full overflow-hidden rounded-2xl bg-navy-950 ${portrait ? "aspect-[9/16] max-h-[60dvh] w-auto" : "aspect-video"}`}>
          {scene.visual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(scene.visual.id)} alt="" className="size-full object-contain" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-brand-200">
              <ImageIcon className="size-8 opacity-60" />
              <p className="text-sm font-semibold">{scene.action || "No visual reference for this scene yet"}</p>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-navy-950/75 px-2.5 py-1 text-xs font-bold text-white">
            {index + 1}/{scenes.length}
            {scene.title ? ` · ${scene.title}` : ""}
          </span>
          {line ? (
            <p className="absolute inset-x-3 bottom-3 rounded-xl bg-navy-950/80 px-3 py-2 text-center text-sm font-medium leading-snug text-white">
              {speaker ? <span className="font-bold text-brand-300">{speaker}: </span> : null}
              {line.text}
            </p>
          ) : null}
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${total ? ((before + Math.min(elapsed, scene.durationSec)) / total) * 100 : 0}%` }} />
        </div>

        <div className="flex items-center justify-center gap-2">
          <IconButton label="Previous scene" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeft className="size-5" />
          </IconButton>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => {
              if (!playing && index === scenes.length - 1 && elapsed >= scene.durationSec) go(0);
              setPlaying((p) => !p);
            }}
            className="grid size-12 place-items-center rounded-full bg-brand-600 text-white shadow-card hover:bg-brand-700"
          >
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 translate-x-px fill-current" />}
          </button>
          <IconButton label="Next scene" disabled={index === scenes.length - 1} onClick={() => go(index + 1)}>
            <ChevronRight className="size-5" />
          </IconButton>
          <span className="ml-2 text-xs font-semibold text-muted tabular-nums">
            {formatDuration(before + Math.min(elapsed, scene.durationSec))} / {formatDuration(total)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
