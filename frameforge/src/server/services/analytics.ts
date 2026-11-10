import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { analyticsEntries, episodes, publishingRecords, type AnalyticsEntry, type Episode } from "@/db/schema";
import { UserError } from "@/server/action";

export type EpisodeAnalytics = {
  episodeId: string;
  number: number;
  title: string;
  /** Upload date: when the episode was marked as published in the Publishing Center, if it was. */
  publishedAt: Date | null;
  youtubeUrl: string;
  /** Snapshots of cumulative totals, oldest first. */
  entries: AnalyticsEntry[];
  latest: AnalyticsEntry | null;
};

/** Every episode of the project with its manually entered analytics snapshots, newest episode first. */
export async function listEpisodeAnalytics(ctx: Ctx): Promise<EpisodeAnalytics[]> {
  const { db } = ctx;
  const eps = await db
    .select({
      episodeId: episodes.id,
      number: episodes.number,
      title: episodes.title,
      publishedAt: publishingRecords.publishedAt,
      youtubeUrl: publishingRecords.youtubeUrl,
    })
    .from(episodes)
    .leftJoin(publishingRecords, eq(publishingRecords.episodeId, episodes.id))
    .where(eq(episodes.projectId, ctx.project.id))
    .orderBy(desc(episodes.number));
  if (!eps.length) return [];
  const rows = await db
    .select({ entry: analyticsEntries })
    .from(analyticsEntries)
    .innerJoin(episodes, eq(episodes.id, analyticsEntries.episodeId))
    .where(eq(episodes.projectId, ctx.project.id))
    .orderBy(asc(analyticsEntries.recordedOn), asc(analyticsEntries.createdAt));
  return eps.map((e) => {
    const entries = rows.filter((r) => r.entry.episodeId === e.episodeId).map((r) => r.entry);
    return { ...e, youtubeUrl: e.youtubeUrl ?? "", entries, latest: entries.at(-1) ?? null };
  });
}

export type AnalyticsOverview = {
  episodeCount: number;
  /** Episodes that have at least one snapshot — only these contribute to the totals. */
  episodesWithData: number;
  views: number;
  likes: number;
  comments: number;
  /** (likes + comments) ÷ views across the latest snapshots; null when there are no views. */
  engagementRate: number | null;
  /** View-weighted mean of the latest snapshots that include a duration; null when none do. */
  avgViewDurationSec: number | null;
};

/** Channel totals built from each episode's latest snapshot. */
export function analyticsOverview(rows: EpisodeAnalytics[]): AnalyticsOverview {
  const latest = rows.map((r) => r.latest).filter((e): e is AnalyticsEntry => !!e);
  const sum = (pick: (e: AnalyticsEntry) => number) => latest.reduce((total, e) => total + pick(e), 0);
  const views = sum((e) => e.views);
  const likes = sum((e) => e.likes);
  const comments = sum((e) => e.comments);
  const timed = latest.filter((e) => e.avgViewDurationSec != null && e.views > 0);
  const timedViews = timed.reduce((total, e) => total + e.views, 0);
  return {
    episodeCount: rows.length,
    episodesWithData: latest.length,
    views,
    likes,
    comments,
    engagementRate: views > 0 ? (likes + comments) / views : null,
    avgViewDurationSec: timedViews > 0 ? timed.reduce((total, e) => total + (e.avgViewDurationSec ?? 0) * e.views, 0) / timedViews : null,
  };
}

export async function requireAnalyticsEntry(ctx: Ctx, id: string): Promise<{ entry: AnalyticsEntry; episode: Episode }> {
  const [row] = await ctx.db
    .select({ entry: analyticsEntries, episode: episodes })
    .from(analyticsEntries)
    .innerJoin(episodes, eq(episodes.id, analyticsEntries.episodeId))
    .where(and(eq(analyticsEntries.id, id), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("That analytics entry no longer exists.");
  return row;
}
