/**
 * The episode timeline as the Video Editor shows it. Built with the same arithmetic as the
 * renderer (see server/render/timeline.ts) so the preview, the strip and the MP4 agree.
 */
import type { Asset } from "@/db/schema";
import type { SceneView } from "@/server/services/scenes";
import type { CueView } from "@/server/services/audio";
import { cueStartSec, sceneStarts } from "@/server/render/timeline";

export type EditorLine = { id: string; speakerName: string; text: string; audio: Asset | null };

export type EditorScene = {
  id: string;
  index: number;
  position: number;
  title: string;
  startSec: number;
  durationSec: number;
  clip: Asset | null;
  visual: Asset | null;
  /** What the scene shows: the clip when there is one, otherwise the visual. */
  picture: Asset | null;
  lines: EditorLine[];
  /** Combined length of the scene's voiceovers; null while any of them has an unknown length. */
  voiceSec: number | null;
};

export type AudioBlock = {
  key: string;
  kind: "voice" | "music" | "sfx";
  assetId: string;
  label: string;
  startSec: number;
  /** Null when the file's length is not known (yet). */
  durationSec: number | null;
  volume: number;
  /** Row inside its track, so overlapping sounds do not hide each other. */
  lane: number;
};

export type EditorTimeline = {
  scenes: EditorScene[];
  totalSec: number;
  voice: AudioBlock[];
  music: AudioBlock[];
  sfx: AudioBlock[];
};

function assignLanes(blocks: Omit<AudioBlock, "lane">[]): AudioBlock[] {
  const laneEnds: number[] = [];
  return [...blocks]
    .sort((a, b) => a.startSec - b.startSec)
    .map((b) => {
      const end = b.startSec + (b.durationSec ?? 0.5);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= b.startSec + 0.001);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = end;
      return { ...b, lane };
    });
}

export function buildTimeline(
  scenes: SceneView[],
  voices: Record<string, Asset>,
  cues: CueView[],
  characterNames: Record<string, string>,
  /** Lengths measured in the browser for files that were stored without one. */
  learned: Record<string, number>,
): EditorTimeline {
  const { starts, total } = sceneStarts(scenes);
  const lengthOf = (a: Asset): number | null => a.durationSec ?? learned[a.id] ?? null;

  const voice: Omit<AudioBlock, "lane">[] = [];
  const editorScenes: EditorScene[] = scenes.map((s, index) => {
    const startSec = starts[s.id] ?? 0;
    let offset = 0;
    let allKnown = true;
    const lines: EditorLine[] = s.lines.map((l) => {
      const audio = l.audioAssetId ? (voices[l.audioAssetId] ?? null) : null;
      const speakerName = (l.characterId ? characterNames[l.characterId] : undefined) ?? l.speaker.trim();
      if (audio) {
        // Voiceovers of a scene play back-to-back from the scene's start, exactly as in the render.
        const length = lengthOf(audio);
        voice.push({ key: `${l.id}:${audio.id}`, kind: "voice", assetId: audio.id, label: `${speakerName || "Voiceover"} — ${audio.name}`, startSec: startSec + offset, durationSec: length, volume: 1 });
        if (length === null) allKnown = false;
        offset += length ?? 0;
      }
      return { id: l.id, speakerName, text: l.text, audio };
    });
    const picture = s.clip ?? s.visual;
    return {
      id: s.id,
      index,
      position: s.position,
      title: s.title,
      startSec,
      durationSec: Math.max(0, s.durationSec),
      clip: s.clip,
      visual: s.visual,
      picture: picture && (picture.kind === "video" || picture.kind === "image") ? picture : null,
      lines,
      voiceSec: allKnown ? offset : null,
    };
  });

  const cueBlocks = (kind: "music" | "sfx") =>
    cues.flatMap((c): Omit<AudioBlock, "lane">[] => {
      const startSec = c.kind === kind ? cueStartSec(c, starts) : null;
      // Like the renderer, a cue that starts after the episode ends is left out.
      if (startSec === null || startSec >= total) return [];
      return [{ key: `${c.id}:${c.asset.id}`, kind, assetId: c.asset.id, label: c.asset.name, startSec, durationSec: lengthOf(c.asset), volume: c.volume }];
    });

  return { scenes: editorScenes, totalSec: total, voice: assignLanes(voice), music: assignLanes(cueBlocks("music")), sfx: assignLanes(cueBlocks("sfx")) };
}

/** The scene on screen at `time` (the last scene once the end is reached). */
export function sceneAt(timeline: Pick<EditorTimeline, "scenes">, time: number): EditorScene | null {
  const list = timeline.scenes;
  for (let i = list.length - 1; i >= 0; i--) {
    if (time >= list[i].startSec && list[i].durationSec > 0) return list[i];
  }
  return list[0] ?? null;
}
