"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { action, UserError, zId, zName } from "@/server/action";
import { assets, assetLinks, characterReferences, characters, episodes, scenes, ASSET_CATEGORIES } from "@/db/schema";
import { storage, maxUploadBytes } from "@/server/storage";
import {
  assertCategoryAccepts,
  assetUsage,
  deleteAssetCompletely,
  isSupportedMime,
  newStorageKey,
  requireAsset,
} from "@/server/services/assets";
import { logActivity } from "@/server/services/activity";
import { kindFromMime, formatBytes } from "@/lib/utils";
import { ASSET_CATEGORY_LABELS } from "@/lib/constants";

const zCategory = z.enum(ASSET_CATEGORIES);

/** Step 1 of an upload: validate and hand the browser a place to PUT the bytes. */
export const beginUpload = action(
  z.object({ name: zName, mimeType: z.string().max(100), sizeBytes: z.number().int().positive(), category: zCategory }),
  async (input, ctx) => {
    if (!isSupportedMime(input.mimeType)) throw new UserError(`“${input.mimeType || "unknown"}” files are not supported.`);
    if (input.sizeBytes > maxUploadBytes()) throw new UserError(`File is larger than the ${formatBytes(maxUploadBytes())} upload limit.`);
    assertCategoryAccepts(input.category, kindFromMime(input.mimeType));
    const key = newStorageKey(ctx.project.id, input.mimeType, input.name);
    const ticket = await storage().createUpload(key, input.mimeType, input.sizeBytes);
    return { key, ticket };
  },
  { revalidate: false },
);

/** Step 2 of an upload: confirm the bytes arrived and record the asset. */
export const completeUpload = action(
  z.object({
    key: z.string().max(300),
    name: zName,
    mimeType: z.string().max(100),
    sizeBytes: z.number().int().positive(),
    category: zCategory,
    width: z.number().int().positive().max(100000).optional(),
    height: z.number().int().positive().max(100000).optional(),
    durationSec: z.number().positive().max(86400).optional(),
    episodeId: zId.optional(),
    sceneId: zId.optional(),
  }),
  async (input, ctx) => {
    if (!input.key.startsWith(`${ctx.project.id}/`)) throw new UserError("Upload does not belong to this studio.");
    if (!isSupportedMime(input.mimeType)) throw new UserError("Unsupported file type.");
    const kind = kindFromMime(input.mimeType);
    assertCategoryAccepts(input.category, kind);
    const stat = await storage().stat(input.key);
    if (!stat) throw new UserError("The upload did not finish. Please try again.");
    const [asset] = await ctx.db
      .insert(assets)
      .values({
        projectId: ctx.project.id,
        category: input.category,
        kind,
        name: input.name,
        storageKey: input.key,
        mimeType: input.mimeType,
        sizeBytes: stat.size,
        width: input.width,
        height: input.height,
        durationSec: input.durationSec,
        source: "upload",
      })
      .returning();
    if (input.episodeId || input.sceneId) {
      await ctx.db.insert(assetLinks).values({ assetId: asset.id, episodeId: input.episodeId, sceneId: input.sceneId });
    }
    await logActivity(ctx, "asset", `Uploaded “${asset.name}” to ${ASSET_CATEGORY_LABELS[asset.category]}`, `/assets?asset=${asset.id}`);
    return asset;
  },
);

export const updateAsset = action(
  z.object({ id: zId, name: zName.optional(), category: zCategory.optional() }),
  async (input, ctx) => {
    const asset = await requireAsset(ctx, input.id);
    if (input.category) assertCategoryAccepts(input.category, asset.kind);
    const [row] = await ctx.db
      .update(assets)
      .set({ name: input.name ?? asset.name, category: input.category ?? asset.category })
      .where(eq(assets.id, asset.id))
      .returning();
    return row;
  },
);

export const getAssetUsage = action(z.object({ id: zId }), async (input, ctx) => {
  await requireAsset(ctx, input.id);
  return assetUsage(ctx, input.id);
}, { revalidate: false });

export const deleteAsset = action(z.object({ id: zId, confirmOriginal: z.boolean().optional() }), async (input, ctx) => {
  const asset = await requireAsset(ctx, input.id);
  // Original character references are protected: they must be removed from Character Lab explicitly.
  const locked = await ctx.db
    .select({ name: characters.name })
    .from(characterReferences)
    .innerJoin(characters, eq(characters.id, characterReferences.characterId))
    .where(and(eq(characterReferences.assetId, asset.id), eq(characterReferences.isLocked, true)));
  if (locked.length) {
    throw new UserError(
      `This is a locked original reference for ${locked.map((l) => l.name).join(", ")}. Unlock it in Character Lab before deleting.`,
    );
  }
  await deleteAssetCompletely(ctx, asset);
  await logActivity(ctx, "asset", `Deleted asset “${asset.name}”`);
  return { id: asset.id };
});

export const attachAsset = action(
  z.object({ assetId: zId, episodeId: zId.optional(), sceneId: zId.optional() }).refine((v) => v.episodeId || v.sceneId, "Choose an episode or scene"),
  async (input, ctx) => {
    await requireAsset(ctx, input.assetId);
    if (input.sceneId) {
      const [scene] = await ctx.db
        .select({ id: scenes.id })
        .from(scenes)
        .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
        .where(and(eq(scenes.id, input.sceneId), eq(episodes.projectId, ctx.project.id)));
      if (!scene) throw new UserError("Scene not found.");
      const existing = await ctx.db
        .select({ id: assetLinks.id })
        .from(assetLinks)
        .where(and(eq(assetLinks.assetId, input.assetId), eq(assetLinks.sceneId, input.sceneId)));
      if (!existing.length) await ctx.db.insert(assetLinks).values({ assetId: input.assetId, sceneId: input.sceneId });
    } else if (input.episodeId) {
      const [ep] = await ctx.db
        .select({ id: episodes.id })
        .from(episodes)
        .where(and(eq(episodes.id, input.episodeId), eq(episodes.projectId, ctx.project.id)));
      if (!ep) throw new UserError("Episode not found.");
      const existing = await ctx.db
        .select({ id: assetLinks.id })
        .from(assetLinks)
        .where(and(eq(assetLinks.assetId, input.assetId), eq(assetLinks.episodeId, input.episodeId), isNull(assetLinks.sceneId)));
      if (!existing.length) await ctx.db.insert(assetLinks).values({ assetId: input.assetId, episodeId: input.episodeId });
    }
    return assetUsage(ctx, input.assetId);
  },
);

export const detachAsset = action(z.object({ assetId: zId, episodeId: zId.optional(), sceneId: zId.optional() }), async (input, ctx) => {
  await requireAsset(ctx, input.assetId);
  if (input.sceneId) {
    await ctx.db.delete(assetLinks).where(and(eq(assetLinks.assetId, input.assetId), eq(assetLinks.sceneId, input.sceneId)));
  } else if (input.episodeId) {
    await ctx.db
      .delete(assetLinks)
      .where(and(eq(assetLinks.assetId, input.assetId), eq(assetLinks.episodeId, input.episodeId), isNull(assetLinks.sceneId)));
  }
  return assetUsage(ctx, input.assetId);
});

export const searchAssets = action(
  z.object({
    q: z.string().max(100).optional(),
    kind: z.enum(["image", "video", "audio", "other"]).optional(),
    categories: z.array(zCategory).optional(),
  }),
  async (input, ctx) => {
    const { listAssets } = await import("@/server/services/assets");
    return listAssets(ctx, { q: input.q, kind: input.kind, categories: input.categories, limit: 200 });
  },
  { revalidate: false },
);

/** Scenes of an episode, for the "attach to scene" control. */
export const episodeScenesBrief = action(
  z.object({ episodeId: zId }),
  async (input, ctx) => {
    return ctx.db
      .select({ id: scenes.id, position: scenes.position, title: scenes.title })
      .from(scenes)
      .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
      .where(and(eq(scenes.episodeId, input.episodeId), eq(episodes.projectId, ctx.project.id)))
      .orderBy(scenes.position);
  },
  { revalidate: false },
);
