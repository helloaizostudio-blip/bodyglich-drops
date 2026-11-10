import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { analyticsOverview, listEpisodeAnalytics } from "@/server/services/analytics";
import { PageHeader } from "@/components/ui/misc";
import { NoEpisodeState } from "@/components/episodes/episode-switcher";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ episode?: string | string[] }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="How each episode is doing, from the numbers you record." />
        <NoEpisodeState what="Every analytics entry" />
      </>
    );
  }
  const rows = await listEpisodeAnalytics(ctx);
  return (
    <AnalyticsDashboard
      rows={rows}
      overview={analyticsOverview(rows)}
      selectedId={current.id}
      episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))}
    />
  );
}
