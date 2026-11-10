"use client";

import { useMemo, useState } from "react";
import type { Asset, DialogueLine } from "@/db/schema";
import type { SceneView } from "@/server/services/scenes";
import type { CueView, VoiceProfileView } from "@/server/services/audio";
import { sceneStarts } from "@/server/render/timeline";
import { Chip, ChipRow, PageHeader } from "@/components/ui/misc";
import { EpisodeSwitcher, type EpisodeOption } from "@/components/episodes/episode-switcher";
import type { AudioTab } from "./tabs";
import { DialoguePanel, type DialogueLineView, type DialogueSceneView } from "./dialogue-panel";
import { VoiceProfilesPanel, type VoiceCharacter } from "./voice-profiles-panel";
import { CuesPanel, type CueScene } from "./cues-panel";
import { SoundLibraryPanel } from "./sound-library-panel";
import { GenerateVoiceButton } from "./generate-voice-button";
import { Notice } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AudioStudio({
  episode,
  episodes,
  scenes,
  voices,
  characters,
  profiles,
  cues,
  music,
  sfx,
  initialTab,
  voiceReady,
}: {
  episode: { id: string; title: string };
  episodes: EpisodeOption[];
  scenes: SceneView[];
  /** Voiceover recordings by asset id. */
  voices: Record<string, Asset>;
  characters: Omit<VoiceCharacter, "inEpisode">[];
  profiles: Record<string, VoiceProfileView>;
  cues: CueView[];
  music: Asset[];
  sfx: Asset[];
  initialTab: AudioTab;
  /** True when a voice generation provider is connected and verified. */
  voiceReady: boolean;
}) {
  const [tab, setTab] = useState<AudioTab>(initialTab);
  /** A library sound the user chose to place in this episode: the cues tab opens with its form pre-filled. */
  const [cueDraft, setCueDraft] = useState<Asset | null>(null);

  const selectTab = (next: AudioTab, draft: Asset | null = null) => {
    setTab(next);
    setCueDraft(draft);
    // Keep the tab in the address bar (refresh / share) without a server round-trip.
    const params = new URLSearchParams(window.location.search);
    params.set("episode", episode.id);
    params.set("tab", next);
    window.history.replaceState(null, "", `?${params}`);
  };

  const nameById = useMemo(() => new Map(characters.map((c) => [c.id, c.name])), [characters]);
  const speakerName = (line: DialogueLine) => (line.characterId ? nameById.get(line.characterId) : undefined) ?? line.speaker.trim();

  const dialogueScenes: DialogueSceneView[] = scenes.map((s) => ({
    id: s.id,
    position: s.position,
    title: s.title,
    lines: s.lines.map((l): DialogueLineView => ({ ...l, speakerName: speakerName(l), audio: l.audioAssetId ? (voices[l.audioAssetId] ?? null) : null })),
  }));
  const allLines = dialogueScenes.flatMap((s) => s.lines);
  const recorded = allLines.filter((l) => l.audio).length;

  // Characters who appear in this episode's scenes (as cast or as a speaker) come first.
  const inEpisode = new Set(scenes.flatMap((s) => [...s.characterIds, ...s.lines.map((l) => l.characterId).filter((v): v is string => !!v)]));
  const cast: VoiceCharacter[] = [
    ...characters.filter((c) => inEpisode.has(c.id)).map((c) => ({ ...c, inEpisode: true })),
    ...characters.filter((c) => !inEpisode.has(c.id)).map((c) => ({ ...c, inEpisode: false })),
  ];

  const { starts, total } = sceneStarts(scenes);
  const cueScenes: CueScene[] = scenes.map((s) => ({ id: s.id, position: s.position, title: s.title, startSec: starts[s.id] ?? 0 }));

  const tabs: { id: AudioTab; label: string; count: string }[] = [
    { id: "dialogue", label: "Dialogue", count: `${recorded}/${allLines.length}` },
    { id: "voices", label: "Voices", count: String(cast.length) },
    { id: "cues", label: "Music & SFX", count: String(cues.length) },
    { id: "library", label: "Library", count: String(music.length + sfx.length) },
  ];

  return (
    <>
      <PageHeader title="Audio Studio" subtitle="Voiceovers, character voices, music and sound effects.">
        <div className="flex flex-col gap-3">
          <div className="max-w-xl">
            <EpisodeSwitcher episodes={episodes} currentId={episode.id} />
          </div>
          <ChipRow>
            {tabs.map((t) => (
              <Chip key={t.id} active={tab === t.id} onClick={() => selectTab(t.id)} className="!h-10">
                {t.label} <span className="ml-1 tabular-nums opacity-70">{t.count}</span>
              </Chip>
            ))}
          </ChipRow>
        </div>
      </PageHeader>

      {tab === "dialogue" && !voiceReady ? (
        <Notice
          tone="lav"
          icon={<Sparkles />}
          title="Voice generation is not connected"
          className="mb-4"
          action={
            <LinkButton href="/settings" size="sm" variant="navy">
              Connect in Settings
            </LinkButton>
          }
        >
          Record or upload each line yourself for now. Once a voice provider key is added and verified, a Generate button appears on every line that belongs to a character with a voice ID.
        </Notice>
      ) : null}

      {tab === "dialogue" ? (
        <DialoguePanel
          episodeId={episode.id}
          scenes={dialogueScenes}
          // Voice generation is only offered once a voice provider is connected and verified.
          renderGenerate={voiceReady ? (line) => <GenerateVoiceButton lineId={line.id} hasAudio={!!line.audio} hasCharacter={!!line.characterId} /> : undefined}
        />
      ) : null}

      {tab === "voices" ? <VoiceProfilesPanel characters={cast} profiles={profiles} episodeId={episode.id} /> : null}

      {tab === "cues" ? (
        <CuesPanel episodeId={episode.id} scenes={cueScenes} totalSec={total} cues={cues} draftAsset={cueDraft} />
      ) : null}

      {tab === "library" ? (
        <SoundLibraryPanel
          music={music}
          sfx={sfx}
          onAddToEpisode={(asset) => selectTab("cues", asset)}
        />
      ) : null}
    </>
  );
}
