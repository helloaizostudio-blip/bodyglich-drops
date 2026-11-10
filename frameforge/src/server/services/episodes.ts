import "server-only";
import { cookies } from "next/headers";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  episodes,
  scenes,
  scripts,
  publishingRecords,
  episodeCharacters,
  dialogueLines,
  type Episode,
  type EpisodeStage,
  EPISODE_STAGES,
} from "@/db/schema";

export const EPISODE_COOKIE = "ff_episode";

export type ProgressTask = { key: string; label: string; done: boolean; fraction: number; detail: string };
export type EpisodeProgress = { percent: number; tasks: ProgressTask[]; sceneCount: number; totalDurationSec: number };
export type EpisodeWithProgress = Episode & { progress: EpisodeProgress };

/**
 * Production progress is computed from real work in the studio (script text, scenes, visuals,
 * clips, voiceovers, final video, publishing) — never from a manually typed percentage.
 */
export async function progressFor(ctx: Ctx, episodeIds: string[]): Promise<Map<string, EpisodeProgress>> {
  const map = new Map<string, EpisodeProgress>();
  if (!episodeIds.length) return map;
  const { db } = ctx;

  const sceneAgg = await db
    .select({
      episodeId: scenes.episodeId,
      total: sql<number>`count(*)::int`,
      withVisual: sql<number>`count(${scenes.visualAssetId})::int`,
      withClip: sql<number>`count(${scenes.clipAssetId})::int`,
      duration: sql<number>`coalesce(sum(${scenes.durationSec}), 0)::float`,
    })
    .from(scenes)
    .where(inArray(scenes.episodeId, episodeIds))
    .groupBy(scenes.episodeId);

  const lineAgg = await db
    .select({
      episodeId: scenes.episodeId,
      total: sql<number>`count(*)::int`,
      voiced: sql<number>`count(${dialogueLines.audioAssetId})::int`,
    })
    .from(dialogueLines)
    .innerJoin(scenes, eq(scenes.id, dialogueLines.sceneId))
    .where(inArray(scenes.episodeId, episodeIds))
    .groupBy(scenes.episodeId);

  const scriptRows = await db
    .select({ episodeId: scripts.episodeId, sections: scripts.sections })
    .from(scripts)
    .where(inArray(scripts.episodeId, episodeIds));

  const pubRows = await db
    .select({ episodeId: publishingRecords.episodeId, status: publishingRecords.status, video: publishingRecords.videoAssetId })
    .from(publishingRecords)
    .where(inArray(publishingRecords.episodeId, episodeIds));

  for (const id of episodeIds) {
    const s = sceneAgg.find((r) => r.episodeId === id);
    const l = lineAgg.find((r) => r.episodeId === id);
    const script = scriptRows.find((r) => r.episodeId === id);
    const pub = pubRows.find((r) => r.episodeId === id);
    const total = s?.total ?? 0;
    const scriptLen = (script?.sections?.script ?? "").trim().length;
    const frac = (n: number, d: number) => (d > 0 ? n / d : 0);

    const tasks: ProgressTask[] = [
      { key: "script", label: "Script", done: scriptLen > 0, fraction: scriptLen > 0 ? 1 : 0, detail: scriptLen > 0 ? "Script written" : "No script yet" },
      { key: "storyboard", label: "Storyboard", done: total > 0, fraction: total > 0 ? 1 : 0, detail: total > 0 ? `${total} scene${total === 1 ? "" : "s"}` : "No scenes yet" },
      {
        key: "assets",
        label: "Visual assets",
        done: total > 0 && s!.withVisual === total,
        fraction: frac(s?.withVisual ?? 0, total),
        detail: total > 0 ? `${s!.withVisual}/${total} scenes have a visual` : "Needs scenes first",
      },
      {
        key: "animation",
        label: "Animation",
        done: total > 0 && s!.withClip === total,
        fraction: frac(s?.withClip ?? 0, total),
        detail: total > 0 ? `${s!.withClip}/${total} scenes have a clip` : "Needs scenes first",
      },
      {
        key: "audio",
        label: "Voiceover",
        done: (l?.total ?? 0) > 0 && l!.voiced === l!.total,
        fraction: frac(l?.voiced ?? 0, l?.total ?? 0),
        detail: (l?.total ?? 0) > 0 ? `${l!.voiced}/${l!.total} lines recorded` : "No dialogue lines yet",
      },
      { key: "editing", label: "Final video", done: !!pub?.video, fraction: pub?.video ? 1 : 0, detail: pub?.video ? "Final video attached" : "No final video yet" },
      { key: "published", label: "Published", done: pub?.status === "published", fraction: pub?.status === "published" ? 1 : 0, detail: pub?.status === "published" ? "Marked as published" : "Not published" },
    ];
    const percent = Math.round((tasks.reduce((sum, t) => sum + t.fraction, 0) / tasks.length) * 100);
    map.set(id, { percent, tasks, sceneCount: total, totalDurationSec: s?.duration ?? 0 });
  }
  return map;
}

export async function listEpisodes(ctx: Ctx): Promise<EpisodeWithProgress[]> {
  const rows = await ctx.db.select().from(episodes).where(eq(episodes.projectId, ctx.project.id)).orderBy(desc(episodes.updatedAt));
  const progress = await progressFor(ctx, rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, progress: progress.get(r.id)! }));
}

export async function getEpisode(ctx: Ctx, id: string): Promise<Episode | null> {
  const [row] = await ctx.db
    .select()
    .from(episodes)
    .where(and(eq(episodes.id, id), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  return row ?? null;
}

export async function episodeCharacterIds(ctx: Ctx, episodeId: string): Promise<string[]> {
  const rows = await ctx.db.select({ id: episodeCharacters.characterId }).from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));
  return rows.map((r) => r.id);
}

/**
 * The episode the user is currently working on: ?episode= in the URL, else the one remembered
 * in a cookie, else the most recently updated episode.
 */
export async function resolveCurrentEpisode(ctx: Ctx, requested?: string | string[]): Promise<{ current: Episode | null; all: Episode[] }> {
  const all = await ctx.db.select().from(episodes).where(eq(episodes.projectId, ctx.project.id)).orderBy(desc(episodes.updatedAt));
  const wanted = (Array.isArray(requested) ? requested[0] : requested) ?? (await cookies()).get(EPISODE_COOKIE)?.value;
  const current = all.find((e) => e.id === wanted) ?? all[0] ?? null;
  return { current, all };
}

export async function nextEpisodeNumber(ctx: Ctx): Promise<number> {
  const [row] = await ctx.db
    .select({ max: sql<number>`coalesce(max(${episodes.number}), 0)::int` })
    .from(episodes)
    .where(eq(episodes.projectId, ctx.project.id));
  return (row?.max ?? 0) + 1;
}

export function stageIndex(stage: EpisodeStage): number {
  return EPISODE_STAGES.indexOf(stage);
}
