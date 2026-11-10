"use server";

import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { action, UserError, zId, zName, zPalette, zText } from "@/server/action";
import type { Ctx } from "@/server/auth";
import { characters, locationCharacters, locationImages, locations, LOCATION_CATEGORIES } from "@/db/schema";
import { locationUsage, requireLocation } from "@/server/services/locations";
import { requireAsset } from "@/server/services/assets";
import { logActivity } from "@/server/services/activity";

const zCategory = z.enum(LOCATION_CATEGORIES);
const zCharacterIds = z.array(zId).max(100);

/** Replaces the characters associated with a location (only characters of this project are kept). */
async function setLocationCharacters(ctx: Ctx, locationId: string, characterIds: string[]) {
  await ctx.db.delete(locationCharacters).where(eq(locationCharacters.locationId, locationId));
  const unique = [...new Set(characterIds)];
  if (!unique.length) return;
  const valid = await ctx.db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.projectId, ctx.project.id), inArray(characters.id, unique)));
  if (valid.length) await ctx.db.insert(locationCharacters).values(valid.map((c) => ({ locationId, characterId: c.id })));
}

export const createLocation = action(
  z.object({
    name: zName,
    category: zCategory.default("other"),
    description: zText(4000).default(""),
    lighting: zText(1000).default(""),
    timeOfDay: zText(120).default(""),
    palette: zPalette.default([]),
    consistencyNotes: zText(4000).default(""),
    characterIds: zCharacterIds.default([]),
  }),
  async (input, ctx) => {
    const { characterIds, ...values } = input;
    const [row] = await ctx.db
      .insert(locations)
      .values({ ...values, projectId: ctx.project.id })
      .returning();
    await setLocationCharacters(ctx, row.id, characterIds);
    await logActivity(ctx, "location", `Added location “${row.name}”`, `/world?location=${row.id}`);
    return row;
  },
);

export const updateLocation = action(
  z.object({
    id: zId,
    name: zName.optional(),
    category: zCategory.optional(),
    description: zText(4000).optional(),
    lighting: zText(1000).optional(),
    timeOfDay: zText(120).optional(),
    palette: zPalette.optional(),
    consistencyNotes: zText(4000).optional(),
    characterIds: zCharacterIds.optional(),
  }),
  async (input, ctx) => {
    await requireLocation(ctx, input.id);
    const { id, characterIds, ...patch } = input;
    const [row] = await ctx.db
      .update(locations)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    if (characterIds) await setLocationCharacters(ctx, id, characterIds);
    return row;
  },
);

/** Deletes the location. Its background images stay in the Asset Library; scenes set here lose the link. */
export const deleteLocation = action(z.object({ id: zId }), async (input, ctx) => {
  const location = await requireLocation(ctx, input.id);
  const usage = await locationUsage(ctx, location.id);
  await ctx.db.delete(locations).where(eq(locations.id, location.id));
  await logActivity(ctx, "location", `Deleted location “${location.name}”`);
  return { id: location.id, unlinkedScenes: usage.length };
});

/* ---------------- background images ---------------- */

export const addLocationImages = action(z.object({ locationId: zId, assetIds: z.array(zId).min(1).max(50) }), async (input, ctx) => {
  const location = await requireLocation(ctx, input.locationId);
  const existing = await ctx.db
    .select({ assetId: locationImages.assetId })
    .from(locationImages)
    .where(eq(locationImages.locationId, location.id))
    .orderBy(asc(locationImages.createdAt));
  const have = new Set(existing.map((e) => e.assetId));
  const fresh = [...new Set(input.assetIds)].filter((id) => !have.has(id));
  for (const assetId of fresh) await requireAsset(ctx, assetId, "image");
  if (fresh.length) {
    // One timestamp per image keeps the gallery in the order the files were added.
    const now = Date.now();
    await ctx.db.insert(locationImages).values(fresh.map((assetId, i) => ({ locationId: location.id, assetId, createdAt: new Date(now + i) })));
  }
  // The first image becomes the cover. Later uploads never change the cover on their own.
  const coverAssetId = location.coverAssetId ?? existing[0]?.assetId ?? fresh[0] ?? null;
  await ctx.db.update(locations).set({ coverAssetId, updatedAt: new Date() }).where(eq(locations.id, location.id));
  return { added: fresh.length, skipped: input.assetIds.length - fresh.length };
});

/** Unlinks an image from the location. The file itself stays in the Asset Library. */
export const removeLocationImage = action(z.object({ id: zId }), async (input, ctx) => {
  const [row] = await ctx.db
    .select({ image: locationImages, location: locations })
    .from(locationImages)
    .innerJoin(locations, eq(locations.id, locationImages.locationId))
    .where(and(eq(locationImages.id, input.id), eq(locations.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("Image not found.");
  await ctx.db.delete(locationImages).where(eq(locationImages.id, row.image.id));
  const remaining = await ctx.db
    .select({ assetId: locationImages.assetId })
    .from(locationImages)
    .where(eq(locationImages.locationId, row.location.id))
    .orderBy(asc(locationImages.createdAt));
  const coverStillThere = remaining.some((r) => r.assetId === row.location.coverAssetId);
  await ctx.db
    .update(locations)
    .set({ coverAssetId: coverStillThere ? row.location.coverAssetId : (remaining[0]?.assetId ?? null), updatedAt: new Date() })
    .where(eq(locations.id, row.location.id));
  return { id: row.image.id };
});

/** Explicit, user-initiated change of the cover. Only one of the location's own images can be the cover. */
export const setLocationCover = action(z.object({ locationId: zId, assetId: zId }), async (input, ctx) => {
  const location = await requireLocation(ctx, input.locationId);
  const [image] = await ctx.db
    .select({ id: locationImages.id })
    .from(locationImages)
    .where(and(eq(locationImages.locationId, location.id), eq(locationImages.assetId, input.assetId)))
    .limit(1);
  if (!image) throw new UserError("Add that image to this location before making it the cover.");
  await ctx.db.update(locations).set({ coverAssetId: input.assetId, updatedAt: new Date() }).where(eq(locations.id, location.id));
  return { assetId: input.assetId };
});
