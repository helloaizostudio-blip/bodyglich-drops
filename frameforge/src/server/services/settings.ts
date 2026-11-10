import "server-only";
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { settings } from "@/db/schema";

export const SETTING_KEYS = {
  /** Free-text description of the channel's art style, added to every visual prompt. */
  styleGuide: "studio.styleGuide",
  /** Free-text notes about tone/humour, added to every story prompt. */
  storyGuide: "studio.storyGuide",
} as const;

export async function getSetting<T = string>(ctx: Ctx, key: string, fallback: T): Promise<T> {
  const [row] = await ctx.db
    .select()
    .from(settings)
    .where(and(eq(settings.projectId, ctx.project.id), eq(settings.key, key)))
    .limit(1);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(ctx: Ctx, key: string, value: unknown): Promise<void> {
  await ctx.db
    .insert(settings)
    .values({ projectId: ctx.project.id, key, value })
    .onConflictDoUpdate({ target: [settings.projectId, settings.key], set: { value, updatedAt: new Date() } });
}

export async function studioGuides(ctx: Ctx): Promise<{ styleGuide: string; storyGuide: string }> {
  const [styleGuide, storyGuide] = await Promise.all([getSetting(ctx, SETTING_KEYS.styleGuide, ""), getSetting(ctx, SETTING_KEYS.storyGuide, "")]);
  return { styleGuide, storyGuide };
}
