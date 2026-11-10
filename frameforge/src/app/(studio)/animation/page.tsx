import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { listScenes } from "@/server/services/scenes";
import { failStaleJobs, listJobs } from "@/server/services/jobs";
import { capabilityReady } from "@/server/providers/config";
import { videoProvider } from "@/server/providers";
import { PageHeader } from "@/components/ui/misc";
import { EpisodeSwitcher, NoEpisodeState } from "@/components/episodes/episode-switcher";
import { AnimationStudio } from "./animation-studio";

export const metadata = { title: "Animation Studio" };
export const maxDuration = 300;

export default async function AnimationPage({ searchParams }: { searchParams: Promise<{ episode?: string; scene?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Animation Studio" subtitle="Produce an animated clip for every scene." />
        <NoEpisodeState what="Animation" />
      </>
    );
  }
  // Provider video jobs can legitimately take a long time, so only very old ones are treated as lost.
  await failStaleJobs(ctx, 120);
  const [scenes, characters, jobs, ready] = await Promise.all([
    listScenes(ctx, current.id),
    listCharacters(ctx),
    listJobs(ctx, { kinds: ["video"], episodeId: current.id, limit: 60 }),
    capabilityReady(ctx, "video"),
  ]);
  let limits: { durations: number[]; aspects: string[] } | null = null;
  if (ready.ready) {
    try {
      const p = await videoProvider(ctx);
      limits = { durations: p.supportedDurations(), aspects: p.supportedAspectRatios() };
    } catch {
      limits = null;
    }
  }
  return (
    <>
      <PageHeader title="Animation Studio" subtitle="Produce an animated clip for every scene.">
        <EpisodeSwitcher episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))} currentId={current.id} />
      </PageHeader>
      <AnimationStudio
        key={current.id}
        episodeId={current.id}
        scenes={scenes}
        cast={characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }))}
        jobs={jobs}
        video={{ ...ready, limits }}
        openSceneId={sp.scene ?? null}
      />
    </>
  );
}
