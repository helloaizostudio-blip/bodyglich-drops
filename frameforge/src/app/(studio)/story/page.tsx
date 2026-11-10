import { requireCtx } from "@/server/auth";
import { episodeCharacterIds, resolveCurrentEpisode } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { getScript } from "@/server/services/story";
import { capabilityReady } from "@/server/providers/config";
import { PageHeader } from "@/components/ui/misc";
import { EpisodeSwitcher, NoEpisodeState } from "@/components/episodes/episode-switcher";
import { StoryWorkspace } from "./story-workspace";

export const metadata = { title: "Story Engine" };
// Writing a full script can take a couple of minutes.
export const maxDuration = 300;

export default async function StoryPage({ searchParams }: { searchParams: Promise<{ episode?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Story Engine" subtitle="Turn ideas into scripts for your cast." />
        <NoEpisodeState what="A script" />
      </>
    );
  }
  const [script, characters, castIds, ai] = await Promise.all([
    getScript(ctx, current.id),
    listCharacters(ctx),
    episodeCharacterIds(ctx, current.id),
    capabilityReady(ctx, "text"),
  ]);
  return (
    <>
      <PageHeader title="Story Engine" subtitle="Ideas, scripts and honest script feedback for your cast.">
        <EpisodeSwitcher episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))} currentId={current.id} />
      </PageHeader>
      <StoryWorkspace
        key={current.id}
        episode={{ id: current.id, title: current.title, logline: current.logline, targetDurationSec: current.targetDurationSec }}
        script={script ? { sections: script.sections, inputs: script.inputs ?? null, review: script.review ?? null } : null}
        cast={characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }))}
        episodeCastIds={castIds}
        ai={ai}
      />
    </>
  );
}
