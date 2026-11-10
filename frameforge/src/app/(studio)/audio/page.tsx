import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { listScenes } from "@/server/services/scenes";
import { listCharacters } from "@/server/services/characters";
import { listAssets } from "@/server/services/assets";
import { listCues, listVoiceProfiles, voiceoverAssets } from "@/server/services/audio";
import { capabilityReady } from "@/server/providers/config";
import { PageHeader } from "@/components/ui/misc";
import { NoEpisodeState } from "@/components/episodes/episode-switcher";
import { AudioStudio } from "./audio-studio";
import { AUDIO_TABS, type AudioTab } from "./tabs";

export const metadata = { title: "Audio Studio" };

export default async function AudioPage({ searchParams }: { searchParams: Promise<{ episode?: string; tab?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Audio Studio" subtitle="Voiceovers, character voices, music and sound effects." />
        <NoEpisodeState what="Audio" />
      </>
    );
  }

  const scenes = await listScenes(ctx, current.id);
  const [voices, characters, profiles, cues, sounds, voice] = await Promise.all([
    voiceoverAssets(ctx, scenes),
    listCharacters(ctx),
    listVoiceProfiles(ctx),
    listCues(ctx, current.id),
    listAssets(ctx, { kind: "audio", categories: ["music", "sfx"] }),
    capabilityReady(ctx, "voice"),
  ]);

  return (
    <AudioStudio
      key={current.id}
      episode={{ id: current.id, title: current.title }}
      episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))}
      scenes={scenes}
      voices={voices}
      characters={characters.map((c) => ({ id: c.id, name: c.name, tagline: c.tagline, profileAssetId: c.profileAssetId, voiceDescription: c.voiceDescription }))}
      profiles={profiles}
      cues={cues}
      music={sounds.filter((a) => a.category === "music")}
      sfx={sounds.filter((a) => a.category === "sfx")}
      voiceReady={voice.ready}
      initialTab={AUDIO_TABS.some((t) => t === sp.tab) ? (sp.tab as AudioTab) : "dialogue"}
    />
  );
}
