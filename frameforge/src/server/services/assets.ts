import "server-only";
import path from "node:path";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  assets,
  assetLinks,
  characterReferences,
  characters,
  locationImages,
  locations,
  scenes,
  episodes,
  dialogueLines,
  audioCues,
  publishingRecords,
  type Asset,
  type AssetCategory,
  type AssetKind,
} from "@/db/schema";
import { storage } from "@/server/storage";
import { UserError } from "@/server/action";
import { kindFromMime } from "@/lib/utils";
import { ASSET_CATEGORY_KINDS } from "@/lib/constants";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/webm": ".weba",
};

export function isSupportedMime(mime: string): boolean {
  return mime in EXT_BY_MIME;
}

export function newStorageKey(projectId: string, mimeType: string, originalName = ""): string {
  const ext = EXT_BY_MIME[mimeType] ?? (path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin");
  const month = new Date().toISOString().slice(0, 7);
  return `${projectId}/${month}/${crypto.randomUUID()}${ext}`;
}

export function assertCategoryAccepts(category: AssetCategory, kind: AssetKind) {
  if (!ASSET_CATEGORY_KINDS[category].includes(kind)) {
    throw new UserError(`That category only accepts ${ASSET_CATEGORY_KINDS[category].join(" / ")} files.`);
  }
}

/** Stores bytes produced on the server (generated images, rendered videos) as a library asset. */
export async function saveBufferAsAsset(
  ctx: Ctx,
  input: {
    data: Buffer;
    mimeType: string;
    name: string;
    category: AssetCategory;
    source: "generated" | "render" | "upload";
    jobId?: string;
    width?: number;
    height?: number;
    durationSec?: number;
  },
): Promise<Asset> {
  const key = newStorageKey(ctx.project.id, input.mimeType, input.name);
  await storage().put(key, input.data, input.mimeType);
  const [row] = await ctx.db
    .insert(assets)
    .values({
      projectId: ctx.project.id,
      category: input.category,
      kind: kindFromMime(input.mimeType),
      name: input.name,
      storageKey: key,
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      width: input.width,
      height: input.height,
      durationSec: input.durationSec,
      source: input.source,
      jobId: input.jobId,
    })
    .returning();
  return row;
}

export async function getAsset(ctx: Ctx, id: string): Promise<Asset | null> {
  const [row] = await ctx.db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.projectId, ctx.project.id)))
    .limit(1);
  return row ?? null;
}

export async function requireAsset(ctx: Ctx, id: string, kind?: AssetKind): Promise<Asset> {
  const a = await getAsset(ctx, id);
  if (!a) throw new UserError("That asset no longer exists.");
  if (kind && a.kind !== kind) throw new UserError(`Please choose ${kind === "image" ? "an image" : `a ${kind}`} file.`);
  return a;
}

export type AssetFilter = {
  q?: string;
  category?: AssetCategory;
  categories?: AssetCategory[];
  kind?: AssetKind;
  limit?: number;
};

export async function listAssets(ctx: Ctx, f: AssetFilter = {}): Promise<Asset[]> {
  const where = [eq(assets.projectId, ctx.project.id)];
  if (f.category) where.push(eq(assets.category, f.category));
  if (f.categories?.length) where.push(inArray(assets.category, f.categories));
  if (f.kind) where.push(eq(assets.kind, f.kind));
  if (f.q) where.push(ilike(assets.name, `%${f.q.replace(/[%_]/g, "\\$&")}%`));
  return ctx.db
    .select()
    .from(assets)
    .where(and(...where))
    .orderBy(desc(assets.createdAt))
    .limit(f.limit ?? 500);
}

export async function assetCategoryCounts(ctx: Ctx): Promise<Record<string, number>> {
  const rows = await ctx.db
    .select({ category: assets.category, n: sql<number>`count(*)::int` })
    .from(assets)
    .where(eq(assets.projectId, ctx.project.id))
    .groupBy(assets.category);
  return Object.fromEntries(rows.map((r) => [r.category, r.n]));
}

export type AssetUsage = { label: string; href: string; kind: string };

/** Everywhere an asset is referenced: characters, locations, scenes, audio, publishing, manual links. */
export async function assetUsage(ctx: Ctx, assetId: string): Promise<AssetUsage[]> {
  const { db } = ctx;
  const out: AssetUsage[] = [];

  const refs = await db
    .select({ name: characters.name, id: characters.id, kind: characterReferences.kind })
    .from(characterReferences)
    .innerJoin(characters, eq(characters.id, characterReferences.characterId))
    .where(eq(characterReferences.assetId, assetId));
  for (const r of refs) out.push({ label: `${r.name} — ${r.kind} reference`, href: `/characters/${r.id}`, kind: "character" });

  const locs = await db
    .select({ name: locations.name, id: locations.id })
    .from(locations)
    .leftJoin(locationImages, eq(locationImages.locationId, locations.id))
    .where(or(eq(locations.coverAssetId, assetId), eq(locationImages.assetId, assetId)))
    .groupBy(locations.id, locations.name);
  for (const l of locs) out.push({ label: `Location: ${l.name}`, href: `/world?location=${l.id}`, kind: "location" });

  const sc = await db
    .select({
      id: scenes.id,
      position: scenes.position,
      title: scenes.title,
      episodeId: episodes.id,
      episodeTitle: episodes.title,
      visual: scenes.visualAssetId,
      background: scenes.backgroundAssetId,
      clip: scenes.clipAssetId,
    })
    .from(scenes)
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(or(eq(scenes.visualAssetId, assetId), eq(scenes.backgroundAssetId, assetId), eq(scenes.clipAssetId, assetId)));
  for (const s of sc) {
    const role = s.clip === assetId ? "animation clip" : s.background === assetId ? "background" : "visual reference";
    out.push({
      label: `${s.episodeTitle} · Scene ${s.position + 1}${s.title ? ` “${s.title}”` : ""} — ${role}`,
      href: `/storyboard?episode=${s.episodeId}&scene=${s.id}`,
      kind: "scene",
    });
  }

  const lines = await db
    .select({ sceneId: scenes.id, position: scenes.position, episodeId: episodes.id, episodeTitle: episodes.title })
    .from(dialogueLines)
    .innerJoin(scenes, eq(scenes.id, dialogueLines.sceneId))
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(eq(dialogueLines.audioAssetId, assetId));
  for (const l of lines)
    out.push({ label: `${l.episodeTitle} · Scene ${l.position + 1} — voiceover`, href: `/audio?episode=${l.episodeId}`, kind: "audio" });

  const cues = await db
    .select({ episodeId: episodes.id, episodeTitle: episodes.title, kind: audioCues.kind })
    .from(audioCues)
    .innerJoin(episodes, eq(episodes.id, audioCues.episodeId))
    .where(eq(audioCues.assetId, assetId));
  for (const c of cues)
    out.push({ label: `${c.episodeTitle} — ${c.kind === "music" ? "music" : "sound effect"}`, href: `/audio?episode=${c.episodeId}`, kind: "audio" });

  const pubs = await db
    .select({ episodeId: episodes.id, episodeTitle: episodes.title })
    .from(publishingRecords)
    .innerJoin(episodes, eq(episodes.id, publishingRecords.episodeId))
    .where(or(eq(publishingRecords.thumbnailAssetId, assetId), eq(publishingRecords.videoAssetId, assetId)));
  for (const p of pubs) out.push({ label: `${p.episodeTitle} — publishing package`, href: `/publishing?episode=${p.episodeId}`, kind: "publishing" });

  const covers = await db.select({ id: episodes.id, title: episodes.title }).from(episodes).where(eq(episodes.coverAssetId, assetId));
  for (const e of covers) out.push({ label: `${e.title} — episode cover`, href: `/episodes/${e.id}`, kind: "episode" });

  const links = await db
    .select({
      episodeId: assetLinks.episodeId,
      sceneId: assetLinks.sceneId,
      episodeTitle: episodes.title,
      scenePosition: scenes.position,
    })
    .from(assetLinks)
    .leftJoin(scenes, eq(scenes.id, assetLinks.sceneId))
    .leftJoin(episodes, or(eq(episodes.id, assetLinks.episodeId), eq(episodes.id, scenes.episodeId)))
    .where(eq(assetLinks.assetId, assetId));
  for (const l of links) {
    if (!l.episodeTitle) continue;
    out.push({
      label: l.sceneId ? `${l.episodeTitle} · Scene ${(l.scenePosition ?? 0) + 1} — attached` : `${l.episodeTitle} — attached`,
      href: l.sceneId ? `/storyboard?scene=${l.sceneId}` : `/episodes/${l.episodeId}`,
      kind: "link",
    });
  }
  return out;
}

export async function deleteAssetCompletely(ctx: Ctx, asset: Asset) {
  await ctx.db.delete(assets).where(eq(assets.id, asset.id));
  await storage().delete(asset.storageKey).catch((err) => console.error("[storage delete failed]", err));
}
