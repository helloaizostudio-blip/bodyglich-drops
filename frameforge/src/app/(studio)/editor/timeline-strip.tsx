"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Film, ImageOff, ZoomIn, ZoomOut } from "lucide-react";
import { cn, fileUrl, formatDuration } from "@/lib/utils";
import { sceneLabel, secondsLabel, timecode } from "@/server/render/timeline";
import { IconButton } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/misc";
import type { AudioBlock, EditorScene, EditorTimeline } from "./model";
import { useClock, type PreviewClock } from "./preview-clock";

/** Pixels per second at each zoom step. */
const ZOOM = [6, 10, 16, 24, 36, 54, 80, 120];
const LANE_PX = 24;

const TRACKS: { key: "voice" | "music" | "sfx"; label: string; color: string }[] = [
  { key: "voice", label: "Voice", color: "bg-brand-500" },
  { key: "music", label: "Music", color: "bg-lav-600" },
  { key: "sfx", label: "SFX", color: "bg-warn-700" },
];

/** Starts at a zoom where the shortest scene is still a comfortable tap target. */
function initialZoom(scenes: EditorScene[]): number {
  const shortest = Math.min(...scenes.filter((s) => s.durationSec > 0).map((s) => s.durationSec), 5);
  const index = ZOOM.findIndex((pps) => shortest * pps >= 56);
  return index < 0 ? ZOOM.length - 1 : Math.max(index, 2);
}

export function TimelineStrip({
  timeline,
  clock,
  selectedId,
  onSelect,
  audioHref,
}: {
  timeline: EditorTimeline;
  clock: PreviewClock;
  selectedId: string | null;
  onSelect: (scene: EditorScene) => void;
  audioHref: string;
}) {
  const [zoom, setZoom] = useState(() => initialZoom(timeline.scenes));
  const pps = ZOOM[zoom];
  const total = timeline.totalSec;
  const width = Math.max(1, Math.ceil(total * pps));
  const scroller = useRef<HTMLDivElement>(null);

  const tickStep = pps >= 54 ? 1 : pps >= 24 ? 2 : pps >= 10 ? 5 : 10;
  const ticks = Array.from({ length: Math.floor(total / tickStep) + 1 }, (_, i) => i * tickStep);

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        action={
          <div className="flex items-center">
            <IconButton label="Zoom out" disabled={zoom === 0} onClick={() => setZoom((z) => Math.max(0, z - 1))}>
              <ZoomOut className="size-[18px]" />
            </IconButton>
            <IconButton label="Zoom in" disabled={zoom === ZOOM.length - 1} onClick={() => setZoom((z) => Math.min(ZOOM.length - 1, z + 1))}>
              <ZoomIn className="size-[18px]" />
            </IconButton>
          </div>
        }
      >
        Timeline
        <span className="ml-2 text-xs font-medium text-muted">
          {timeline.scenes.length} scene{timeline.scenes.length === 1 ? "" : "s"} · {timecode(total)}
        </span>
      </SectionTitle>

      {/* The strip scrolls sideways on its own; the page never does. */}
      <div ref={scroller} tabIndex={0} role="group" aria-label="Episode timeline. Scroll sideways to see all of it." className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:-mx-5 sm:px-5">
        <div className="relative" style={{ width }}>
          {/* Ruler — tap to move the preview there */}
          <div
            className="relative h-6 cursor-pointer border-b border-line"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              clock.seek((e.clientX - rect.left) / pps);
            }}
          >
            {ticks.map((t) => (
              <span key={t} className="absolute top-0 h-full border-l border-line pl-1 text-[10px] font-semibold tabular-nums text-faint" style={{ left: t * pps }}>
                {formatDuration(t)}
              </span>
            ))}
          </div>

          {/* Scenes */}
          <div className="relative mt-2 h-[72px]">
            {timeline.scenes.map((scene) => {
              const w = scene.durationSec * pps;
              if (w <= 0) return null;
              const selected = scene.id === selectedId;
              return (
                <button
                  key={scene.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${sceneLabel(scene)}, ${secondsLabel(scene.durationSec)}`}
                  title={`${sceneLabel(scene)} · ${secondsLabel(scene.durationSec)}`}
                  onClick={() => onSelect(scene)}
                  className={cn(
                    "absolute top-0 h-full overflow-hidden rounded-xl bg-navy-950 text-left ring-1 ring-inset transition-shadow",
                    selected ? "z-[1] ring-[3px] ring-brand-500" : "ring-white/60 hover:ring-brand-300",
                  )}
                  style={{ left: scene.startSec * pps, width: w }}
                >
                  <SceneThumb scene={scene} />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-navy-950/90 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-bold leading-none text-white">
                    <span>{scene.position + 1}</span>
                    {w >= 44 ? <span className="tabular-nums opacity-90">{secondsLabel(scene.durationSec)}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sound tracks */}
          {TRACKS.map((track) => {
            const blocks = timeline[track.key];
            const lanes = Math.max(1, ...blocks.map((b) => b.lane + 1));
            return (
              <div key={track.key} className="mt-1.5">
                <span className="sticky left-0 inline-block text-[10px] font-bold uppercase tracking-wider text-faint">{track.label}</span>
                <div className="relative overflow-hidden rounded-lg bg-brand-50 ring-1 ring-inset ring-line/70" style={{ height: lanes * LANE_PX + 4 }}>
                  {blocks.map((b) => (
                    <SoundBlock key={b.key} block={b} pps={pps} total={total} color={track.color} />
                  ))}
                </div>
              </div>
            );
          })}

          <Playhead clock={clock} pps={pps} scroller={scroller} />
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        Tap a scene to select it. Voiceovers play back-to-back from the start of their scene; music and sound effects sit at their own start points.{" "}
        <Link href={audioHref} className="font-semibold text-brand-700 hover:underline">
          Edit sound in Audio Studio
        </Link>
      </p>
    </Card>
  );
}

function SceneThumb({ scene }: { scene: EditorScene }) {
  const picture = scene.picture;
  if (!picture) {
    return (
      <span className="absolute inset-0 grid place-items-center text-navy-600">
        <ImageOff className="size-5" aria-hidden />
      </span>
    );
  }
  if (picture.kind === "video") {
    return (
      <>
        <video src={`${fileUrl(picture.id)}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} className="absolute inset-0 size-full object-cover" />
        <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-md bg-navy-950/70 text-white">
          <Film className="size-3" aria-hidden />
        </span>
      </>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={fileUrl(picture.id)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />;
}

function SoundBlock({ block, pps, total, color }: { block: AudioBlock; pps: number; total: number; color: string }) {
  // Sound is cut where the episode ends, as in the render.
  const end = block.durationSec === null ? null : Math.min(total, block.startSec + block.durationSec);
  const w = end === null ? 10 : Math.max(3, (end - block.startSec) * pps);
  return (
    <span
      title={`${block.label} · starts ${timecode(block.startSec)}${block.durationSec !== null ? ` · ${secondsLabel(block.durationSec)}` : ""}${block.kind !== "voice" ? ` · volume ${Math.round(block.volume * 100)}%` : ""}`}
      className={cn("absolute overflow-hidden whitespace-nowrap rounded-md px-1.5 text-[10px] font-semibold leading-5 text-white", color, end === null && "border-r-2 border-dashed border-white/80")}
      style={{ left: block.startSec * pps, width: w, top: 2 + block.lane * LANE_PX, height: LANE_PX - 4 }}
    >
      {w >= 40 ? block.label : null}
    </span>
  );
}

function Playhead({ clock, pps, scroller }: { clock: PreviewClock; pps: number; scroller: React.RefObject<HTMLDivElement | null> }) {
  const { time, playing } = useClock(clock);
  const x = time * pps;

  // Follow the playhead while playing so it never runs off the visible part of the strip.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !playing) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const left = x + pad;
    if (left < el.scrollLeft + 8 || left > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = Math.max(0, left - el.clientWidth * 0.25);
  }, [x, playing, scroller]);

  return (
    <span aria-hidden className="pointer-events-none absolute bottom-0 top-0 z-[2] w-0.5 -translate-x-px bg-bad-600" style={{ left: x }}>
      <span className="absolute -left-[5px] top-0 size-3 rounded-full bg-bad-600" />
    </span>
  );
}
