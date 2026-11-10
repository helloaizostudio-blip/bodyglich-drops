"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { action, UserError, zId, zText } from "@/server/action";
import { characters, episodeCharacters, episodes, EPISODE_STAGES } from "@/db/schema";
import { getEpisode, nextEpisodeNumber } from "@/server/services/episodes";
import { logActivity } from "@/server/services/activity";
import { STAGE_LABELS } from "@/lib/constants";

const zTitle = z.string().trim().min(1, "Give the episode a title").max(160);

export const createEpisode = action(
  z.object({
    title: zTitle,
    logline: zText(2000).default(""),
    format: z.enum(["short", "long"]).default("long"),
    targetDurationSec: z.number().int().min(5).max(4 * 3600).default(180),
    characterIds: z.array(zId).max(50).default([]),
  }),
  async (input, ctx) => {
    const number = await nextEpisodeNumber(ctx);
    const [ep] = await ctx.db
      .insert(episodes)
      .values({ projectId: ctx.project.id, number, title: input.title, logline: input.logline, format: input.format, targetDurationSec: input.targetDurationSec })
      .returning();
    if (input.characterIds.length) {
      const valid = await ctx.db
        .select({ id: characters.id })
        .from(characters)
        .where(and(eq(characters.projectId, ctx.project.id), inArray(characters.id, input.characterIds)));
      if (valid.length) await ctx.db.insert(episodeCharacters).values(valid.map((c) => ({ episodeId: ep.id, characterId: c.id })));
    }
    await logActivity(ctx, "episode", `Created episode ${number}: “${ep.title}”`, `/episodes/${ep.id}`);
    return ep;
  },
);

export const updateEpisode = action(
  z.object({
    id: zId,
    title: zTitle.optional(),
    logline: zText(2000).optional(),
    format: z.enum(["short", "long"]).optional(),
    targetDurationSec: z.number().int().min(5).max(4 * 3600).optional(),
    notes: zText(10000).optional(),
    stage: z.enum(EPISODE_STAGES).optional(),
    coverAssetId: zId.nullable().optional(),
    characterIds: z.array(zId).max(50).optional(),
  }),
  async (input, ctx) => {
    const ep = await getEpisode(ctx, input.id);
    if (!ep) throw new UserError("Episode not found.");
    const { id, characterIds, ...patch } = input;
    const [row] = await ctx.db
      .update(episodes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(episodes.id, id))
      .returning();
    if (characterIds) {
      await ctx.db.delete(episodeCharacters).where(eq(episodeCharacters.episodeId, id));
      const valid = characterIds.length
        ? await ctx.db
            .select({ id: characters.id })
            .from(characters)
            .where(and(eq(characters.projectId, ctx.project.id), inArray(characters.id, characterIds)))
        : [];
      if (valid.length) await ctx.db.insert(episodeCharacters).values(valid.map((c) => ({ episodeId: id, characterId: c.id })));
    }
    if (input.stage && input.stage !== ep.stage) {
      await logActivity(ctx, "episode", `Moved “${row.title}” to ${STAGE_LABELS[input.stage]}`, `/episodes/${id}`);
    }
    return row;
  },
);

export const deleteEpisode = action(z.object({ id: zId }), async (input, ctx) => {
  const ep = await getEpisode(ctx, input.id);
  if (!ep) throw new UserError("Episode not found.");
  await ctx.db.delete(episodes).where(eq(episodes.id, ep.id));
  await logActivity(ctx, "episode", `Deleted episode “${ep.title}”`);
  return { id: ep.id };
});
