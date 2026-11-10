"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutPanelLeft } from "lucide-react";
import type { Asset } from "@/db/schema";
import type { EditorData } from "@/server/services/editor";
import { fileUrl } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui/misc";
import { EpisodeSwitcher, type EpisodeOption } from "@/components/episodes/episode-switcher";
import { buildTimeline } from "./model";
import { PreviewClock } from "./preview-clock";
import { PreviewPlayer } from "./preview-player";
import { TimelineStrip } from "./timeline-strip";
import { SceneInspector } from "./scene-inspector";
import { RenderPanel } from "./render-panel";

/**
 * Measures, in the browser, the length of media that was stored without one (for example files
 * whose metadata could not be read at upload time). Only metadata is fetched.
 */
function useMeasuredLengths(assets: Asset[]): Record<string, number> {
  const [lengths, setLengths] = useState<Record<string, number>>({});
  const unknown = [...new Set(assets.filter((a) => a.durationSec == null && (a.kind === "audio" || a.kind === "video")).map((a) => `${a.kind}:${a.id}`))].sort().join(",");

  useEffect(() => {
    if (!unknown) return;
    const elements = unknown.split(",").map((entry) => {
      const [kind, id] = entry.split(":");
      const el = document.createElement(kind === "video" ? "video" : "audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        if (Number.isFinite(el.duration) && el.duration > 0) setLengths((prev) => ({ ...prev, [id]: el.duration }));
      };
      el.src = fileUrl(id);
      return el;
    });
    return () => {
      for (const el of elements) {
        el.onloadedmetadata = null;
        el.removeAttribute("src");
        el.load();
      }
    };
  }, [unknown]);

  return lengths;
}

export function VideoEditor({
  episode,
  episodes,
  data,
  characterNames,
  initialSceneId,
}: {
  episode: { id: string; title: string };
  episodes: EpisodeOption[];
  data: EditorData;
  characterNames: Record<string, string>;
  initialSceneId: string | null;
}) {
  const { scenes, voices, cues } = data;
  const [clock] = useState(() => new PreviewClock());
  const [selectedId, setSelectedId] = useState<string | null>(initialSceneId);
  /** Set after a reorder: once the new order arrives, move the preview to the scene's new start. */
  const [followId, setFollowId] = useState<string | null>(null);

  const media = useMemo(() => [...Object.values(voices), ...cues.map((c) => c.asset), ...scenes.flatMap((s) => (s.clip ? [s.clip] : []))], [voices, cues, scenes]);
  const measured = useMeasuredLengths(media);
  const timeline = useMemo(() => buildTimeline(scenes, voices, cues, characterNames, measured), [scenes, voices, cues, characterNames, measured]);

  const selected = timeline.scenes.find((s) => s.id === selectedId) ?? timeline.scenes[0] ?? null;
  const followStart = followId ? timeline.scenes.find((s) => s.id === followId)?.startSec : undefined;

  useEffect(() => {
    if (followStart === undefined) return;
    clock.seek(followStart);
  }, [followStart, clock]);

  const header = (
    <PageHeader title="Video Editor" subtitle="Assemble the episode timeline and render the final video.">
      <div className="max-w-xl">
        <EpisodeSwitcher episodes={episodes} currentId={episode.id} />
      </div>
    </PageHeader>
  );

  const renderPanel = (
    <RenderPanel
      episodeId={episode.id}
      settings={data.settings}
      settingsSaved={data.settingsSaved}
      ffmpeg={data.ffmpeg}
      jobs={data.jobs}
      finalVideoAssetId={data.finalVideoAssetId}
      sceneCount={timeline.scenes.length}
      totalSec={timeline.totalSec}
    />
  );

  if (!timeline.scenes.length || !selected) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4">
          <EmptyState icon={<LayoutPanelLeft />} title="No scenes to edit yet" action={<LinkButton href={`/storyboard?episode=${episode.id}`}>Open Storyboard Studio</LinkButton>}>
            The timeline is built from the episode&apos;s scenes. Create them in Storyboard Studio, then come back to set timings, add clips and render the video.
          </EmptyState>
          {data.jobs.length ? renderPanel : null}
        </div>
      </>
    );
  }

  const clipSec = selected.clip ? (selected.clip.durationSec ?? measured[selected.clip.id] ?? null) : null;

  return (
    <>
      {header}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <Card className="order-1 min-w-0 p-4 sm:p-5 lg:col-span-3">
          <SectionTitle>Preview</SectionTitle>
          <PreviewPlayer timeline={timeline} clock={clock} aspect={data.settings} onNavigate={(sceneId) => {
              setFollowId(null);
              setSelectedId(sceneId);
            }}
          />
        </Card>

        <div className="order-3 min-w-0 lg:order-2 lg:col-span-2">
          <SceneInspector scene={selected} sceneCount={timeline.scenes.length} episodeId={episode.id} clipSec={clipSec} onMoved={() => setFollowId(selected.id)} />
        </div>

        <div className="order-2 min-w-0 lg:order-3 lg:col-span-5">
          <TimelineStrip
            timeline={timeline}
            clock={clock}
            selectedId={selected.id}
            audioHref={`/audio?episode=${episode.id}`}
            onSelect={(scene) => {
              setFollowId(null);
              setSelectedId(scene.id);
              clock.seek(scene.startSec);
            }}
          />
        </div>

        <div className="order-4 min-w-0 lg:col-span-5">{renderPanel}</div>
      </div>
    </>
  );
}
