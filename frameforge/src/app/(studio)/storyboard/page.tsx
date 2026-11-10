import { eq } from "drizzle-orm";
import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { listScenes } from "@/server/services/scenes";
import { getScript } from "@/server/services/story";
import { capabilityReady } from "@/server/providers/config";
import { locations } from "@/db/schema";
import { PageHeader } from "@/components/ui/misc";
import { EpisodeSwitcher, NoEpisodeState } from "@/components/episodes/episode-switcher";
import { StoryboardStudio } from "./storyboard-studio";

export const metadata = { title: "Storyboard Studio" };
export const maxDuration = 300;

export default async function StoryboardPage({ searchParams }: { searchParams: Promise<{ episode?: string; scene?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Storyboard Studio" subtitle="Plan every scene before animation begins." />
        <NoEpisodeState what="A storyboard" />
      </>
    );
  }
  const [scenes, characters, locs, script, ai] = await Promise.all([
    listScenes(ctx, current.id),
    listCharacters(ctx),
    ctx.db.select({ id: locations.id, name: locations.name }).from(locations).where(eq(locations.projectId, ctx.project.id)).orderBy(locations.name),
    getScript(ctx, current.id),
    capabilityReady(ctx, "text"),
  ]);
  return (
    <>
      <PageHeader title="Storyboard Studio" subtitle="Plan every scene before animation begins.">
        <EpisodeSwitcher episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))} currentId={current.id} />
      </PageHeader>
      <StoryboardStudio
        key={current.id}
        episode={{ id: current.id, title: current.title, targetDurationSec: current.targetDurationSec }}
        scenes={scenes}
        cast={characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }))}
        locations={locs}
        hasScript={!!(script?.sections.script ?? "").trim() || !!(script?.sections.sceneBreakdown ?? "").trim()}
        aiReady={ai.ready}
        openSceneId={sp.scene ?? null}
      />
    </>
  );
}
