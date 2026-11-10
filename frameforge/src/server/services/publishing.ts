import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { assets, episodes, publishingRecords, type Asset, type EpisodeStage, type PublishingRecord, type PublishStatus } from "@/db/schema";

/** The publishing record of an episode of this project, or null when nothing has been saved yet. */
export async function getPublishingRecord(ctx: Ctx, episodeId: string): Promise<PublishingRecord | null> {
  const [row] = await ctx.db
    .select({ record: publishingRecords })
    .from(publishingRecords)
    .innerJoin(episodes, eq(episodes.id, publishingRecords.episodeId))
    .where(and(eq(publishingRecords.episodeId, episodeId), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  return row?.record ?? null;
}

export type PublishingView = { record: PublishingRecord | null; thumbnail: Asset | null; video: Asset | null };

/** The record together with its thumbnail and video assets, for the Publishing Center form. */
export async function getPublishingView(ctx: Ctx, episodeId: string): Promise<PublishingView> {
  const record = await getPublishingRecord(ctx, episodeId);
  const ids = [record?.thumbnailAssetId, record?.videoAssetId].filter((v): v is string => !!v);
  const rows = ids.length
    ? await ctx.db
        .select()
        .from(assets)
        .where(and(eq(assets.projectId, ctx.project.id), inArray(assets.id, ids)))
    : [];
  const find = (id: string | null | undefined) => (id ? (rows.find((a) => a.id === id) ?? null) : null);
  return { record, thumbnail: find(record?.thumbnailAssetId), video: find(record?.videoAssetId) };
}

export type PublishingValues = Pick<
  PublishingRecord,
  "title" | "description" | "tags" | "visibility" | "thumbnailAssetId" | "videoAssetId" | "status" | "scheduledAt" | "publishedAt" | "youtubeUrl"
>;

/** Creates the episode's publishing record on first save, updates it afterwards. The caller checks the episode belongs to the project. */
export async function upsertPublishingRecord(ctx: Ctx, episodeId: string, values: PublishingValues): Promise<PublishingRecord> {
  const [row] = await ctx.db
    .insert(publishingRecords)
    .values({ episodeId, ...values })
    .onConflictDoUpdate({ target: publishingRecords.episodeId, set: { ...values, updatedAt: new Date() } })
    .returning();
  return row;
}

export type PublishingHistoryRow = {
  episodeId: string;
  number: number;
  title: string;
  stage: EpisodeStage;
  /** null when nothing has been saved in the Publishing Center for this episode yet. */
  status: PublishStatus | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  youtubeUrl: string;
};

/** Every episode of the project with its publishing status, newest episode first. */
export async function listPublishingHistory(ctx: Ctx): Promise<PublishingHistoryRow[]> {
  return ctx.db
    .select({
      episodeId: episodes.id,
      number: episodes.number,
      title: episodes.title,
      stage: episodes.stage,
      status: publishingRecords.status,
      scheduledAt: publishingRecords.scheduledAt,
      publishedAt: publishingRecords.publishedAt,
      youtubeUrl: publishingRecords.youtubeUrl,
    })
    .from(episodes)
    .leftJoin(publishingRecords, eq(publishingRecords.episodeId, episodes.id))
    .where(eq(episodes.projectId, ctx.project.id))
    .orderBy(desc(episodes.number))
    .then((rows) => rows.map((r) => ({ ...r, youtubeUrl: r.youtubeUrl ?? "" })));
}
