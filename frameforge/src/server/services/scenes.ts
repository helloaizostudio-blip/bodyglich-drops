import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  assets,
  dialogueLines,
  episodes,
  locations,
  sceneCharacters,
  scenes,
  type Asset,
  type DialogueLine,
  type Episode,
  type Scene,
} from "@/db/schema";
import { UserError } from "@/server/action";

export type SceneView = Scene & {
  characterIds: string[];
  lines: DialogueLine[];
  visual: Asset | null;
  background: Asset | null;
  clip: Asset | null;
  locationName: string | null;
};

export async function requireEpisode(ctx: Ctx, id: string): Promise<Episode> {
  const [row] = await ctx.db
    .select()
    .from(episodes)
    .where(and(eq(episodes.id, id), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("Episode not found.");
  return row;
}

export async function requireScene(ctx: Ctx, sceneId: string): Promise<{ scene: Scene; episode: Episode }> {
  const [row] = await ctx.db
    .select({ scene: scenes, episode: episodes })
    .from(scenes)
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(and(eq(scenes.id, sceneId), eq(episodes.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("Scene not found.");
  return row;
}

/** All scenes of an episode in order, with their cast, dialogue lines and linked media. */
export async function listScenes(ctx: Ctx, episodeId: string): Promise<SceneView[]> {
  const { db } = ctx;
  const rows = await db
    .select({ scene: scenes })
    .from(scenes)
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(and(eq(scenes.episodeId, episodeId), eq(episodes.projectId, ctx.project.id)))
    .orderBy(asc(scenes.position));
  const list = rows.map((r) => r.scene);
  if (!list.length) return [];
  const ids = list.map((s) => s.id);

  const [chars, lines] = await Promise.all([
    db.select().from(sceneCharacters).where(inArray(sceneCharacters.sceneId, ids)),
    db.select().from(dialogueLines).where(inArray(dialogueLines.sceneId, ids)).orderBy(asc(dialogueLines.position)),
  ]);
  const assetIds = [...new Set(list.flatMap((s) => [s.visualAssetId, s.backgroundAssetId, s.clipAssetId]).filter((v): v is string => !!v))];
  const assetRows = assetIds.length ? await db.select().from(assets).where(inArray(assets.id, assetIds)) : [];
  const locIds = [...new Set(list.map((s) => s.locationId).filter((v): v is string => !!v))];
  const locRows = locIds.length ? await db.select({ id: locations.id, name: locations.name }).from(locations).where(inArray(locations.id, locIds)) : [];
  const asset = (id: string | null) => (id ? (assetRows.find((a) => a.id === id) ?? null) : null);

  return list.map((s) => ({
    ...s,
    characterIds: chars.filter((c) => c.sceneId === s.id).map((c) => c.characterId),
    lines: lines.filter((l) => l.sceneId === s.id),
    visual: asset(s.visualAssetId),
    background: asset(s.backgroundAssetId),
    clip: asset(s.clipAssetId),
    locationName: locRows.find((l) => l.id === s.locationId)?.name ?? null,
  }));
}

/** Keeps scene positions dense (0..n-1) after inserts, deletes and reorders. */
export async function renumberScenes(ctx: Ctx, episodeId: string, orderedIds?: string[]) {
  const current = await ctx.db.select({ id: scenes.id }).from(scenes).where(eq(scenes.episodeId, episodeId)).orderBy(asc(scenes.position), asc(scenes.createdAt));
  const order = orderedIds ?? current.map((c) => c.id);
  for (let i = 0; i < order.length; i++) {
    await ctx.db.update(scenes).set({ position: i }).where(and(eq(scenes.id, order[i]), eq(scenes.episodeId, episodeId)));
  }
  await ctx.db.update(episodes).set({ updatedAt: new Date() }).where(eq(episodes.id, episodeId));
}
