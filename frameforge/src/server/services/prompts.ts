import "server-only";
import { eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { characters, locations, outfits, type Location } from "@/db/schema";
import { consistencyProfileText } from "@/server/services/characters";
import { studioGuides } from "@/server/services/settings";
import type { SceneView } from "@/server/services/scenes";

/** Reusable description of a location for visual prompts. */
export function locationBrief(l: Location): string {
  return [
    `LOCATION: ${l.name}`,
    l.description && `Description: ${l.description}`,
    l.timeOfDay && `Time of day: ${l.timeOfDay}`,
    l.lighting && `Lighting: ${l.lighting}`,
    l.palette.length ? `Colour palette: ${l.palette.join(", ")}` : "",
    l.consistencyNotes && `Keep consistent: ${l.consistencyNotes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sceneContext(ctx: Ctx, scene: SceneView) {
  const [{ styleGuide }, cast, loc] = await Promise.all([
    studioGuides(ctx),
    scene.characterIds.length ? ctx.db.select().from(characters).where(inArray(characters.id, scene.characterIds)) : Promise.resolve([]),
    scene.locationId ? ctx.db.select().from(locations).where(eq(locations.id, scene.locationId)).limit(1) : Promise.resolve([]),
  ]);
  const outfitRows = cast.length ? await ctx.db.select().from(outfits).where(inArray(outfits.characterId, cast.map((c) => c.id))) : [];
  const castBlocks = cast.map((c) => consistencyProfileText(c, outfitRows.filter((o) => o.characterId === c.id)));
  const location = loc[0] ? locationBrief(loc[0]) : scene.locationText ? `LOCATION: ${scene.locationText}` : "";
  const lines = scene.lines
    .filter((l) => l.text.trim())
    .map((l) => `${cast.find((c) => c.id === l.characterId)?.name ?? (l.speaker || "Narrator")}: ${l.text}`);
  return { styleGuide, castBlocks, location, lines };
}

/**
 * Builds a still-image prompt for a scene from studio data only — the channel style guide, the
 * location profile and each character's Consistency Profile. It is deterministic and needs no AI
 * provider, so it always works; the user can edit the result freely.
 */
export async function buildSceneVisualPrompt(ctx: Ctx, scene: SceneView): Promise<string> {
  const { styleGuide, castBlocks, location, lines } = await sceneContext(ctx, scene);
  return [
    styleGuide ? `ART STYLE (applies to everything):\n${styleGuide}` : "",
    `SCENE ${scene.position + 1}${scene.title ? ` — ${scene.title}` : ""}`,
    scene.action ? `What is happening: ${scene.action}` : "",
    location,
    scene.camera ? `CAMERA: ${scene.camera}` : "",
    castBlocks.length ? `CHARACTERS IN FRAME (${castBlocks.length}) — reproduce each exactly as described and as shown in their reference image:\n\n${castBlocks.join("\n\n")}` : "No named characters in this frame.",
    lines.length ? `Moment to capture — the expressions should fit this line: "${lines[0]}"` : "",
    `OUTPUT: one single storyboard frame, aspect ratio ${scene.aspectRatio}. One clear moment, readable silhouettes. No text, captions, speech bubbles, logos or watermarks in the image.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Builds a video-generation prompt for a scene (action, motion and camera movement over time). */
export async function buildSceneAnimationPrompt(ctx: Ctx, scene: SceneView): Promise<string> {
  const { styleGuide, castBlocks, location, lines } = await sceneContext(ctx, scene);
  return [
    styleGuide ? `ART STYLE: ${styleGuide}` : "",
    `SHOT: ${scene.title || `Scene ${scene.position + 1}`} (${scene.durationSec}s, ${scene.aspectRatio})`,
    scene.action ? `ACTION: ${scene.action}` : "",
    scene.motion ? `CHARACTER MOTION: ${scene.motion}` : "",
    scene.camera ? `CAMERA: ${scene.camera}` : "CAMERA: steady, simple framing.",
    location,
    castBlocks.length ? `CHARACTERS — keep each exactly on-model, matching the reference frame:\n\n${castBlocks.join("\n\n")}` : "",
    lines.length ? `DIALOGUE HAPPENING IN THIS SHOT (animate mouths and reactions to match; do not render subtitles):\n${lines.join("\n")}` : "No dialogue in this shot.",
    "Keep the same art style, proportions and colours from the first frame to the last. No text, captions or watermarks.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const PURPOSE_BRIEF: Record<string, string> = {
  scene: "A finished scene illustration: one clear story moment with the characters acting, in their environment.",
  storyboard: "A clean storyboard frame: simple, readable staging of one story moment.",
  character_variation: "A new pose or angle of the SAME character. The design, proportions, outfit and colours must be identical to the reference — only the pose or angle changes.",
  expression: "The SAME character from the reference showing a different facial expression, head-and-shoulders framing on a plain background. Nothing about the design changes except the expression.",
  environment: "An empty environment / background plate with no characters in it, composed so characters can be placed in front.",
  prop: "A single prop on a plain, uncluttered background, in the channel's art style.",
  thumbnail: "A YouTube thumbnail concept: one bold focal moment, big readable expressions, strong contrast, generous empty space for a title. Do not render any text.",
};

/** Deterministic prompt for the image generator, built from the style guide and Consistency Profiles. */
export async function buildImagePrompt(ctx: Ctx, input: { purpose: string; characterIds: string[]; locationId?: string | null; idea: string; aspectRatio: string }): Promise<string> {
  const [{ styleGuide }, cast, loc] = await Promise.all([
    studioGuides(ctx),
    input.characterIds.length ? ctx.db.select().from(characters).where(inArray(characters.id, input.characterIds)) : Promise.resolve([]),
    input.locationId ? ctx.db.select().from(locations).where(eq(locations.id, input.locationId)).limit(1) : Promise.resolve([]),
  ]);
  const mine = cast.filter((c) => c.projectId === ctx.project.id);
  const outfitRows = mine.length ? await ctx.db.select().from(outfits).where(inArray(outfits.characterId, mine.map((c) => c.id))) : [];
  return [
    styleGuide ? `ART STYLE (applies to everything):\n${styleGuide}` : "",
    `WHAT TO MAKE: ${PURPOSE_BRIEF[input.purpose] ?? PURPOSE_BRIEF.scene}`,
    input.idea.trim() ? `DETAILS: ${input.idea.trim()}` : "",
    loc[0] && loc[0].projectId === ctx.project.id ? locationBrief(loc[0]) : "",
    mine.length
      ? `CHARACTERS (${mine.length}) — the attached reference images are the source of truth. Reproduce each exactly:\n\n${mine.map((c) => consistencyProfileText(c, outfitRows.filter((o) => o.characterId === c.id))).join("\n\n")}`
      : "",
    `OUTPUT: one image, aspect ratio ${input.aspectRatio}. No text, captions, logos or watermarks.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
