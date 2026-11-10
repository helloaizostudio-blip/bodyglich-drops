import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { getPublishingView, listPublishingHistory } from "@/server/services/publishing";
import { PageHeader } from "@/components/ui/misc";
import { NoEpisodeState } from "@/components/episodes/episode-switcher";
import { PublishingCenter } from "./publishing-center";

export const metadata = { title: "Publishing Center" };

export default async function PublishingPage({ searchParams }: { searchParams: Promise<{ episode?: string | string[] }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Publishing Center" subtitle="Prepare each episode's YouTube package and keep track of what has gone live." />
        <NoEpisodeState what="A publishing package" />
      </>
    );
  }
  const [view, history] = await Promise.all([getPublishingView(ctx, current.id), listPublishingHistory(ctx)]);
  return (
    <PublishingCenter
      key={current.id}
      episode={{ id: current.id, number: current.number, title: current.title, stage: current.stage }}
      episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))}
      view={view}
      history={history}
    />
  );
}
