import { Clapperboard } from "lucide-react";
import { requireCtx } from "@/server/auth";
import { listEpisodes } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { EpisodeCard } from "@/components/episodes/episode-bits";
import { NewEpisodeButton } from "@/components/episodes/episode-form";

export const metadata = { title: "Episodes" };

export default async function EpisodesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const [episodes, characters] = await Promise.all([listEpisodes(ctx), listCharacters(ctx)]);
  const cast = characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }));
  return (
    <>
      <PageHeader title="Episodes" subtitle={`Every ${ctx.project.channelName} video, from idea to published.`} actions={<NewEpisodeButton cast={cast} defaultOpen={sp.new === "1"} />} />
      {episodes.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {episodes.map((e) => (
            <EpisodeCard key={e.id} episode={e} progress={e.progress} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Clapperboard />} title="No episodes yet" action={<NewEpisodeButton cast={cast} />}>
          Create your first episode to start planning a video.
        </EmptyState>
      )}
    </>
  );
}
