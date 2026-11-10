"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { action, UserError, zId, zText } from "@/server/action";
import type { Ctx } from "@/server/auth";
import { episodes, PUBLISH_STATUSES, type Episode, type PublishingRecord } from "@/db/schema";
import { requireEpisode } from "@/server/services/scenes";
import { requireAsset } from "@/server/services/assets";
import { getPublishingRecord, upsertPublishingRecord, type PublishingValues } from "@/server/services/publishing";
import { logActivity } from "@/server/services/activity";
import { isHttpUrl, mergeTags, metadataProblems } from "@/app/(studio)/publishing/limits";

const zDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time");

// Drafts may run over YouTube's limits while they are being written; the limits are enforced
// as soon as the package is marked ready, scheduled or published.
const zPackage = z.object({
  episodeId: zId,
  title: zText(300).default(""),
  description: zText(20000).default(""),
  tags: z.array(z.string().max(200)).max(200).default([]),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  thumbnailAssetId: zId.nullable().default(null),
  videoAssetId: zId.nullable().default(null),
  status: z.enum(PUBLISH_STATUSES).default("draft"),
  /** ISO date-times (the browser converts from the user's local time). */
  scheduledAt: zDateTime.nullable().default(null),
  publishedAt: zDateTime.nullable().default(null),
  youtubeUrl: zText(500).default(""),
});

type PackageInput = z.output<typeof zPackage>;

/** Validates the form against the episode and turns it into column values. */
async function prepare(ctx: Ctx, input: PackageInput): Promise<{ episode: Episode; existing: PublishingRecord | null; values: PublishingValues }> {
  const episode = await requireEpisode(ctx, input.episodeId);
  const existing = await getPublishingRecord(ctx, episode.id);
  const tags = mergeTags([], input.tags);

  if (input.youtubeUrl && !isHttpUrl(input.youtubeUrl)) throw new UserError("Enter the full YouTube link, starting with https://");
  if (input.thumbnailAssetId) await requireAsset(ctx, input.thumbnailAssetId, "image");
  if (input.videoAssetId) await requireAsset(ctx, input.videoAssetId, "video");

  if (input.status !== "draft") {
    if (!input.title) throw new UserError("Add a video title before moving this package past Draft.");
    const [problem] = metadataProblems({ title: input.title, description: input.description, tags });
    if (problem) throw new UserError(problem);
  }
  if (input.status === "scheduled" && !input.scheduledAt) throw new UserError("Choose the date and time this episode is scheduled for.");

  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
  if (publishedAt && publishedAt.getTime() > Date.now() + 5 * 60_000) throw new UserError("The published date cannot be in the future.");

  return {
    episode,
    existing,
    values: {
      title: input.title,
      description: input.description,
      tags,
      visibility: input.visibility,
      thumbnailAssetId: input.thumbnailAssetId,
      videoAssetId: input.videoAssetId,
      status: input.status,
      // A schedule only exists while the package is scheduled; a published date only once it is published.
      scheduledAt: input.status === "scheduled" && input.scheduledAt ? new Date(input.scheduledAt) : null,
      publishedAt: input.status === "published" ? (publishedAt ?? existing?.publishedAt ?? new Date()) : null,
      youtubeUrl: input.youtubeUrl,
    },
  };
}

/** Saves the publishing package of an episode (created on first save). Never contacts YouTube. */
export const savePublishing = action(zPackage, async (input, ctx) => {
  const { episode, existing, values } = await prepare(ctx, input);
  if (values.status === "published" && existing?.status !== "published") {
    throw new UserError("Use “Mark as published” to publish this episode — it asks you to confirm first.");
  }
  return upsertPublishingRecord(ctx, episode.id, values);
});

/**
 * Records that the user has published the episode on YouTube themselves: saves the package with
 * status "published" and a published date, and moves the episode to the Published stage.
 * The UI only calls this after an explicit confirmation. Nothing is sent to YouTube.
 */
export const markEpisodePublished = action(zPackage, async (input, ctx) => {
  const { episode, values } = await prepare(ctx, { ...input, status: "published" });
  const record = await upsertPublishingRecord(ctx, episode.id, values);
  await ctx.db.update(episodes).set({ stage: "published", updatedAt: new Date() }).where(eq(episodes.id, episode.id));
  await logActivity(ctx, "publishing", `Marked episode ${episode.number} “${episode.title}” as published`, `/publishing?episode=${episode.id}`);
  return record;
});
