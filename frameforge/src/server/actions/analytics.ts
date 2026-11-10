"use server";

import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { action, UserError, zId, zText } from "@/server/action";
import { analyticsEntries } from "@/db/schema";
import { requireEpisode } from "@/server/services/scenes";
import { requireAnalyticsEntry } from "@/server/services/analytics";
import { formatDay, isRealDay } from "@/app/(studio)/analytics/metrics";

// Totals are stored in 32-bit integer columns. The action wrapper prefixes each message with the field name.
const zCount = z.number({ error: "enter a whole number" }).int("enter a whole number").min(0, "cannot be negative").max(2_000_000_000, "that number is too large");

/**
 * Adds or edits one manually typed snapshot of an episode's cumulative YouTube totals.
 * One snapshot per episode per date. Entries are always stored with source "manual".
 */
export const saveAnalyticsEntry = action(
  z.object({
    id: zId.optional(),
    episodeId: zId,
    recordedOn: z.string().refine(isRealDay, "Choose the date these numbers were read"),
    views: zCount,
    likes: zCount,
    comments: zCount,
    avgViewDurationSec: z.number().min(0).max(86_400, "that is longer than a day").nullable().default(null),
    // YouTube's "average percentage viewed" can pass 100% when viewers rewatch (common for Shorts).
    retentionPct: z.number().min(0, "cannot be negative").max(1000, "that percentage is too large").nullable().default(null),
    notes: zText(2000).default(""),
  }),
  async (input, ctx) => {
    const { id, episodeId, ...values } = input;
    // The user's calendar date can be one day ahead of the server's (UTC) date, never more.
    if (Date.parse(`${values.recordedOn}T00:00:00Z`) > Date.now() + 86_400_000) throw new UserError("That date is in the future.");
    const episode = id ? (await requireAnalyticsEntry(ctx, id)).episode : await requireEpisode(ctx, episodeId);

    const [clash] = await ctx.db
      .select({ id: analyticsEntries.id })
      .from(analyticsEntries)
      .where(and(eq(analyticsEntries.episodeId, episode.id), eq(analyticsEntries.recordedOn, values.recordedOn), id ? ne(analyticsEntries.id, id) : undefined))
      .limit(1);
    if (clash) throw new UserError(`This episode already has a snapshot for ${formatDay(values.recordedOn)}. Edit that one instead.`);

    if (id) {
      const [row] = await ctx.db.update(analyticsEntries).set(values).where(eq(analyticsEntries.id, id)).returning();
      return row;
    }
    const [row] = await ctx.db
      .insert(analyticsEntries)
      .values({ ...values, episodeId: episode.id, source: "manual" })
      .returning();
    return row;
  },
);

export const deleteAnalyticsEntry = action(z.object({ id: zId }), async (input, ctx) => {
  const { entry } = await requireAnalyticsEntry(ctx, input.id);
  await ctx.db.delete(analyticsEntries).where(eq(analyticsEntries.id, entry.id));
  return { id: entry.id };
});
