import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  assets,
  characters,
  episodes,
  locationCharacters,
  locationImages,
  locations,
  scenes,
  type Asset,
  type Location,
} from "@/db/schema";
import { UserError } from "@/server/action";
import { LOCATION_CATEGORY_LABELS } from "@/lib/constants";

/**
 * A location as shown in the World Builder grid. `coverAssetId` is the cover the user picked,
 * falling back to the first background image when no cover is set.
 */
export type LocationCard = Location & { imageCount: number; characterIds: string[]; sceneCount: number };

export async function listLocations(ctx: Ctx): Promise<LocationCard[]> {
  const { db } = ctx;
  const rows = await db.select().from(locations).where(eq(locations.projectId, ctx.project.id)).orderBy(asc(locations.name), asc(locations.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [images, cast, sceneAgg] = await Promise.all([
    db
      .select({ locationId: locationImages.locationId, assetId: locationImages.assetId })
      .from(locationImages)
      .where(inArray(locationImages.locationId, ids))
      .orderBy(asc(locationImages.createdAt)),
    db.select().from(locationCharacters).where(inArray(locationCharacters.locationId, ids)),
    db
      .select({ locationId: scenes.locationId, n: sql<number>`count(*)::int` })
      .from(scenes)
      .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
      .where(and(inArray(scenes.locationId, ids), eq(episodes.projectId, ctx.project.id)))
      .groupBy(scenes.locationId),
  ]);
  return rows.map((l) => {
    const mine = images.filter((i) => i.locationId === l.id);
    return {
      ...l,
      coverAssetId: l.coverAssetId ?? mine[0]?.assetId ?? null,
      imageCount: mine.length,
      characterIds: cast.filter((c) => c.locationId === l.id).map((c) => c.characterId),
      sceneCount: sceneAgg.find((s) => s.locationId === l.id)?.n ?? 0,
    };
  });
}

export async function getLocation(ctx: Ctx, id: string): Promise<Location | null> {
  const [row] = await ctx.db
    .select()
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.projectId, ctx.project.id)))
    .limit(1);
  return row ?? null;
}

export async function requireLocation(ctx: Ctx, id: string): Promise<Location> {
  const row = await getLocation(ctx, id);
  if (!row) throw new UserError("Location not found.");
  return row;
}

export type LocationImageView = { id: string; label: string; asset: Asset };
export type LocationUsage = { sceneId: string; position: number; sceneTitle: string; episodeId: string; episodeNumber: number; episodeTitle: string };

export type LocationDetail = {
  /** `coverAssetId` falls back to the first background image when no cover is set. */
  location: Location;
  images: LocationImageView[];
  characterIds: string[];
  usage: LocationUsage[];
  promptText: string;
};

/** Every scene that is set in this location, in episode / scene order. */
export async function locationUsage(ctx: Ctx, locationId: string): Promise<LocationUsage[]> {
  return ctx.db
    .select({
      sceneId: scenes.id,
      position: scenes.position,
      sceneTitle: scenes.title,
      episodeId: episodes.id,
      episodeNumber: episodes.number,
      episodeTitle: episodes.title,
    })
    .from(scenes)
    .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
    .where(and(eq(scenes.locationId, locationId), eq(episodes.projectId, ctx.project.id)))
    .orderBy(asc(episodes.number), asc(scenes.position));
}

export async function getLocationDetail(ctx: Ctx, id: string): Promise<LocationDetail | null> {
  const location = await getLocation(ctx, id);
  if (!location) return null;
  const { db } = ctx;
  const [imageRows, castRows, usage] = await Promise.all([
    db
      .select({ image: locationImages, asset: assets })
      .from(locationImages)
      .innerJoin(assets, eq(assets.id, locationImages.assetId))
      .where(and(eq(locationImages.locationId, id), eq(assets.projectId, ctx.project.id)))
      .orderBy(asc(locationImages.createdAt)),
    db
      .select({ characterId: locationCharacters.characterId })
      .from(locationCharacters)
      .innerJoin(characters, eq(characters.id, locationCharacters.characterId))
      .where(and(eq(locationCharacters.locationId, id), eq(characters.projectId, ctx.project.id))),
    locationUsage(ctx, id),
  ]);
  const images = imageRows.map((r) => ({ id: r.image.id, label: r.image.label, asset: r.asset }));
  return {
    location: { ...location, coverAssetId: location.coverAssetId ?? images[0]?.asset.id ?? null },
    images,
    characterIds: castRows.map((r) => r.characterId),
    usage,
    promptText: locationPromptText(location),
  };
}

/**
 * A location as reusable prompt text. Image and animation prompts for scenes set here start
 * from this block so the environment looks the same every time it appears.
 */
export function locationPromptText(
  l: Pick<Location, "name" | "category" | "description" | "lighting" | "timeOfDay" | "palette" | "consistencyNotes">,
): string {
  const lines: string[] = [];
  lines.push(`LOCATION: ${l.name} (${LOCATION_CATEGORY_LABELS[l.category]})`);
  if (l.description) lines.push(`Description: ${l.description}`);
  if (l.lighting) lines.push(`Lighting: ${l.lighting}`);
  if (l.timeOfDay) lines.push(`Time of day: ${l.timeOfDay}`);
  if (l.palette.length) lines.push(`Colour palette: ${l.palette.join(", ")}`);
  if (l.consistencyNotes) lines.push(`Always keep: ${l.consistencyNotes}`);
  lines.push("Keep this environment the same every time it appears — same layout, architecture, colours and art style. Do not redesign the location.");
  return lines.join("\n");
}

export async function locationsByIds(ctx: Ctx, ids: string[]): Promise<Location[]> {
  if (!ids.length) return [];
  return ctx.db
    .select()
    .from(locations)
    .where(and(eq(locations.projectId, ctx.project.id), inArray(locations.id, ids)));
}
