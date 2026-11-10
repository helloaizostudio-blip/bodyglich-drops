"use server";

import { z } from "zod";
import { and, eq, or, sql } from "drizzle-orm";
import { action, UserError, zId, zName, zPalette, zText } from "@/server/action";
import {
  characterReferences,
  characterRelationships,
  characters,
  outfits,
  CHARACTER_ROLE_TYPES,
  REFERENCE_KINDS,
} from "@/db/schema";
import { getCharacter } from "@/server/services/characters";
import { requireAsset, deleteAssetCompletely, getAsset } from "@/server/services/assets";
import { logActivity } from "@/server/services/activity";

const profileFields = {
  name: zName,
  tagline: zText(120).default(""),
  roleType: z.enum(CHARACTER_ROLE_TYPES).default("main"),
  mainRole: zText(200).default(""),
  description: zText(4000).default(""),
  personality: zText(4000).default(""),
  signatureClothing: zText(2000).default(""),
  visualTraits: zText(4000).default(""),
  voiceDescription: zText(2000).default(""),
  palette: zPalette.default([]),
  consistencyRules: zText(4000).default(""),
  avoidRules: zText(4000).default(""),
};

async function requireCharacter(ctx: Parameters<typeof getCharacter>[0], id: string) {
  const c = await getCharacter(ctx, id);
  if (!c) throw new UserError("Character not found.");
  return c;
}

export const createCharacter = action(z.object({ ...profileFields, profileAssetId: zId.optional() }), async (input, ctx) => {
  const { profileAssetId, ...values } = input;
  const [{ max }] = await ctx.db
    .select({ max: sql<number>`coalesce(max(${characters.sortOrder}), 0)::int` })
    .from(characters)
    .where(eq(characters.projectId, ctx.project.id));
  const [c] = await ctx.db
    .insert(characters)
    .values({ ...values, projectId: ctx.project.id, sortOrder: max + 1 })
    .returning();
  if (profileAssetId) {
    await requireAsset(ctx, profileAssetId, "image");
    const [ref] = await ctx.db
      .insert(characterReferences)
      .values({ characterId: c.id, assetId: profileAssetId, kind: "original", label: "Original reference", isLocked: true })
      .returning();
    await ctx.db.update(characters).set({ profileReferenceId: ref.id }).where(eq(characters.id, c.id));
  }
  await logActivity(ctx, "character", `Added character “${c.name}”`, `/characters/${c.id}`);
  return c;
});

export const updateCharacter = action(
  z.object({ id: zId, ...Object.fromEntries(Object.entries(profileFields).map(([k, v]) => [k, v.optional()])) } as {
    id: typeof zId;
  } & { [K in keyof typeof profileFields]: z.ZodOptional<(typeof profileFields)[K]> }),
  async (input, ctx) => {
    await requireCharacter(ctx, input.id);
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(characters)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();
    return row;
  },
);

export const deleteCharacter = action(z.object({ id: zId, deleteImages: z.boolean().default(false) }), async (input, ctx) => {
  const c = await requireCharacter(ctx, input.id);
  const refs = await ctx.db.select().from(characterReferences).where(eq(characterReferences.characterId, c.id));
  await ctx.db.delete(characters).where(eq(characters.id, c.id));
  if (input.deleteImages) {
    for (const r of refs) {
      const asset = await getAsset(ctx, r.assetId);
      if (asset) await deleteAssetCompletely(ctx, asset);
    }
  }
  await logActivity(ctx, "character", `Deleted character “${c.name}”`);
  return { id: c.id };
});

/** Seeds the eight cast members named in the Blockheads brief as empty, fully editable profiles (no artwork). */
export const addStarterCast = action(z.object({}), async (_input, ctx) => {
  const existing = await ctx.db.select({ id: characters.id }).from(characters).where(eq(characters.projectId, ctx.project.id)).limit(1);
  if (existing.length) throw new UserError("Your Character Lab already has characters.");
  const cast: { name: string; tagline: string; roleType: "main" | "supporting" }[] = [
    { name: "Zash", tagline: "Main Protagonist", roleType: "main" },
    { name: "Potato", tagline: "The Goofy One", roleType: "main" },
    { name: "Alex", tagline: "The Smart One", roleType: "main" },
    { name: "Bacon", tagline: "The Funny Guy", roleType: "main" },
    { name: "Riya", tagline: "The Chill One", roleType: "supporting" },
    { name: "Dev", tagline: "The Gamer", roleType: "supporting" },
    { name: "Mr. Block", tagline: "The Teacher", roleType: "supporting" },
    { name: "The Cook", tagline: "The Chef", roleType: "supporting" },
  ];
  await ctx.db.insert(characters).values(cast.map((c, i) => ({ ...c, projectId: ctx.project.id, sortOrder: i + 1 })));
  await logActivity(ctx, "character", "Added the Blockheads starter cast (names only — upload your own art)", "/characters");
  return { count: cast.length };
});

/* ---------------- reference images ---------------- */

export const addCharacterReference = action(
  z.object({
    characterId: zId,
    assetId: zId,
    kind: z.enum(REFERENCE_KINDS),
    label: zText(120).default(""),
    outfitId: zId.optional(),
  }),
  async (input, ctx) => {
    const c = await requireCharacter(ctx, input.characterId);
    await requireAsset(ctx, input.assetId, "image");
    const [ref] = await ctx.db
      .insert(characterReferences)
      .values({
        characterId: c.id,
        assetId: input.assetId,
        kind: input.kind,
        label: input.label,
        outfitId: input.outfitId,
        // Originals are locked the moment they are added so nothing can silently replace them.
        isLocked: input.kind === "original",
      })
      .returning();
    // The very first original becomes the profile image. Later uploads never change it automatically.
    if (!c.profileReferenceId && input.kind === "original") {
      await ctx.db.update(characters).set({ profileReferenceId: ref.id }).where(eq(characters.id, c.id));
    }
    return ref;
  },
);

async function requireReference(ctx: Parameters<typeof getCharacter>[0], id: string) {
  const [row] = await ctx.db
    .select({ ref: characterReferences, character: characters })
    .from(characterReferences)
    .innerJoin(characters, eq(characters.id, characterReferences.characterId))
    .where(and(eq(characterReferences.id, id), eq(characters.projectId, ctx.project.id)))
    .limit(1);
  if (!row) throw new UserError("Reference image not found.");
  return row;
}

export const updateCharacterReference = action(
  z.object({ id: zId, label: zText(120).optional(), isLocked: z.boolean().optional(), kind: z.enum(REFERENCE_KINDS).optional(), outfitId: zId.nullable().optional() }),
  async (input, ctx) => {
    await requireReference(ctx, input.id);
    const { id, ...patch } = input;
    const [row] = await ctx.db.update(characterReferences).set(patch).where(eq(characterReferences.id, id)).returning();
    return row;
  },
);

/** Explicit, user-initiated change of the profile image. Only original references are eligible. */
export const setProfileReference = action(z.object({ referenceId: zId }), async (input, ctx) => {
  const { ref, character } = await requireReference(ctx, input.referenceId);
  if (ref.kind !== "original") {
    throw new UserError("Only an original reference can be the profile image. Change this image's type to “Original reference” first.");
  }
  await ctx.db.update(characters).set({ profileReferenceId: ref.id }).where(eq(characters.id, character.id));
  await logActivity(ctx, "character", `Changed ${character.name}'s profile image`, `/characters/${character.id}`);
  return { id: ref.id };
});

export const removeCharacterReference = action(z.object({ id: zId, deleteFile: z.boolean().default(false) }), async (input, ctx) => {
  const { ref, character } = await requireReference(ctx, input.id);
  if (ref.isLocked) throw new UserError("This reference is locked. Unlock it first if you really want to remove it.");
  await ctx.db.delete(characterReferences).where(eq(characterReferences.id, ref.id));
  if (character.profileReferenceId === ref.id) {
    await ctx.db.update(characters).set({ profileReferenceId: null }).where(eq(characters.id, character.id));
  }
  if (input.deleteFile) {
    const asset = await getAsset(ctx, ref.assetId);
    if (asset) await deleteAssetCompletely(ctx, asset);
  }
  return { id: ref.id };
});

/* ---------------- outfits ---------------- */

export const saveOutfit = action(
  z.object({ id: zId.optional(), characterId: zId, name: zName, description: zText(2000).default(""), isSignature: z.boolean().default(false) }),
  async (input, ctx) => {
    await requireCharacter(ctx, input.characterId);
    if (input.isSignature) await ctx.db.update(outfits).set({ isSignature: false }).where(eq(outfits.characterId, input.characterId));
    if (input.id) {
      const [row] = await ctx.db
        .update(outfits)
        .set({ name: input.name, description: input.description, isSignature: input.isSignature })
        .where(and(eq(outfits.id, input.id), eq(outfits.characterId, input.characterId)))
        .returning();
      if (!row) throw new UserError("Outfit not found.");
      return row;
    }
    const [row] = await ctx.db
      .insert(outfits)
      .values({ characterId: input.characterId, name: input.name, description: input.description, isSignature: input.isSignature })
      .returning();
    return row;
  },
);

export const deleteOutfit = action(z.object({ id: zId, characterId: zId }), async (input, ctx) => {
  await requireCharacter(ctx, input.characterId);
  await ctx.db.delete(outfits).where(and(eq(outfits.id, input.id), eq(outfits.characterId, input.characterId)));
  return { id: input.id };
});

/* ---------------- relationships ---------------- */

export const addRelationship = action(
  z.object({ characterId: zId, relatedCharacterId: zId, relationship: z.string().trim().min(1, "Describe the relationship").max(120), notes: zText(1000).default("") }),
  async (input, ctx) => {
    if (input.characterId === input.relatedCharacterId) throw new UserError("Choose a different character.");
    await requireCharacter(ctx, input.characterId);
    await requireCharacter(ctx, input.relatedCharacterId);
    const [row] = await ctx.db.insert(characterRelationships).values(input).returning();
    return row;
  },
);

export const deleteRelationship = action(z.object({ id: zId, characterId: zId }), async (input, ctx) => {
  await requireCharacter(ctx, input.characterId);
  await ctx.db
    .delete(characterRelationships)
    .where(
      and(
        eq(characterRelationships.id, input.id),
        or(eq(characterRelationships.characterId, input.characterId), eq(characterRelationships.relatedCharacterId, input.characterId)),
      ),
    );
  return { id: input.id };
});
