import "server-only";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  assets,
  characterReferences,
  characterRelationships,
  characters,
  outfits,
  voiceProfiles,
  type Asset,
  type Character,
  type CharacterReference,
  type Outfit,
} from "@/db/schema";

export type CharacterCard = Character & { profileAssetId: string | null; referenceCount: number };

export async function listCharacters(ctx: Ctx): Promise<CharacterCard[]> {
  const rows = await ctx.db.select().from(characters).where(eq(characters.projectId, ctx.project.id)).orderBy(asc(characters.sortOrder), asc(characters.createdAt));
  if (!rows.length) return [];
  const refs = await ctx.db
    .select({ id: characterReferences.id, characterId: characterReferences.characterId, assetId: characterReferences.assetId })
    .from(characterReferences)
    .where(inArray(characterReferences.characterId, rows.map((r) => r.id)));
  return rows.map((c) => {
    const mine = refs.filter((r) => r.characterId === c.id);
    return { ...c, profileAssetId: mine.find((r) => r.id === c.profileReferenceId)?.assetId ?? null, referenceCount: mine.length };
  });
}

export type ReferenceWithAsset = CharacterReference & { asset: Asset };
export type RelationshipView = { id: string; otherId: string; otherName: string; relationship: string; notes: string; direction: "out" | "in" };

export type CharacterDetail = {
  character: Character;
  profileAssetId: string | null;
  references: ReferenceWithAsset[];
  outfits: Outfit[];
  relationships: RelationshipView[];
  voice: { description: string; providerId: string; providerVoiceId: string } | null;
};

export async function getCharacter(ctx: Ctx, id: string): Promise<Character | null> {
  const [row] = await ctx.db
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.projectId, ctx.project.id)))
    .limit(1);
  return row ?? null;
}

export async function getCharacterDetail(ctx: Ctx, id: string): Promise<CharacterDetail | null> {
  const character = await getCharacter(ctx, id);
  if (!character) return null;
  const { db } = ctx;
  const refRows = await db
    .select({ ref: characterReferences, asset: assets })
    .from(characterReferences)
    .innerJoin(assets, eq(assets.id, characterReferences.assetId))
    .where(eq(characterReferences.characterId, id))
    .orderBy(asc(characterReferences.createdAt));
  const references = refRows.map((r) => ({ ...r.ref, asset: r.asset }));
  const outfitRows = await db.select().from(outfits).where(eq(outfits.characterId, id)).orderBy(asc(outfits.createdAt));
  const relRows = await db
    .select()
    .from(characterRelationships)
    .where(or(eq(characterRelationships.characterId, id), eq(characterRelationships.relatedCharacterId, id)));
  const otherIds = [...new Set(relRows.map((r) => (r.characterId === id ? r.relatedCharacterId : r.characterId)))];
  const others = otherIds.length ? await db.select({ id: characters.id, name: characters.name }).from(characters).where(inArray(characters.id, otherIds)) : [];
  const relationships: RelationshipView[] = relRows.map((r) => {
    const out = r.characterId === id;
    const otherId = out ? r.relatedCharacterId : r.characterId;
    return { id: r.id, otherId, otherName: others.find((o) => o.id === otherId)?.name ?? "Unknown", relationship: r.relationship, notes: r.notes, direction: out ? "out" : "in" };
  });
  const [voice] = await db.select().from(voiceProfiles).where(eq(voiceProfiles.characterId, id)).limit(1);
  return {
    character,
    profileAssetId: references.find((r) => r.id === character.profileReferenceId)?.assetId ?? null,
    references,
    outfits: outfitRows,
    relationships,
    voice: voice ? { description: voice.description, providerId: voice.providerId, providerVoiceId: voice.providerVoiceId } : null,
  };
}

/**
 * The Character Consistency Profile as reusable prompt text. Every image / video prompt that
 * features this character starts from this block so the cast stays on-model.
 */
export function consistencyProfileText(c: Character, outfitList: Pick<Outfit, "name" | "description" | "isSignature">[] = []): string {
  const lines: string[] = [];
  lines.push(`CHARACTER: ${c.name}${c.tagline ? ` (${c.tagline})` : ""}`);
  if (c.description) lines.push(`Who they are: ${c.description}`);
  if (c.visualTraits) lines.push(`Visual characteristics: ${c.visualTraits}`);
  const signature = outfitList.find((o) => o.isSignature);
  if (c.signatureClothing) lines.push(`Signature clothing: ${c.signatureClothing}`);
  else if (signature) lines.push(`Signature clothing: ${signature.name}${signature.description ? ` — ${signature.description}` : ""}`);
  if (c.palette.length) lines.push(`Colour palette: ${c.palette.join(", ")}`);
  if (c.personality) lines.push(`Personality (drives pose and expression): ${c.personality}`);
  if (c.consistencyRules) lines.push(`Always keep: ${c.consistencyRules}`);
  if (c.avoidRules) lines.push(`Never change: ${c.avoidRules}`);
  lines.push("Match the attached original reference image exactly — same face, proportions, hair and art style. Do not redesign the character.");
  return lines.join("\n");
}

export async function charactersByIds(ctx: Ctx, ids: string[]): Promise<Character[]> {
  if (!ids.length) return [];
  return ctx.db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, ctx.project.id), inArray(characters.id, ids)));
}
