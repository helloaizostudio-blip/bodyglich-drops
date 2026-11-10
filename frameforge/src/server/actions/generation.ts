"use server";

import { z } from "zod";
import { after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { action, UserError, zId, zText } from "@/server/action";
import { promptTemplates, scenes } from "@/db/schema";
import { createImageJob, IMAGE_PURPOSES, type ImagePurpose } from "@/server/services/imagegen";
import { buildImagePrompt } from "@/server/services/prompts";
import { requireAsset } from "@/server/services/assets";
import { requireScene } from "@/server/services/scenes";
import { ASPECT_RATIOS } from "@/lib/constants";

const zPurpose = z.enum(Object.keys(IMAGE_PURPOSES) as [ImagePurpose, ...ImagePurpose[]]);

/** Builds a prompt from studio data (style guide, consistency profiles, location). No AI call, no cost. */
export const buildGeneratorPrompt = action(
  z.object({ purpose: zPurpose, characterIds: z.array(zId).max(8), locationId: zId.nullable().optional(), idea: zText(4000), aspectRatio: z.enum(ASPECT_RATIOS) }),
  async (input, ctx) => ({ prompt: await buildImagePrompt(ctx, input) }),
  { revalidate: false },
);

/** Starts a real image generation with the connected provider. Billed by the provider to the studio's account. */
export const startImageGeneration = action(
  z.object({
    prompt: z.string().trim().min(10, "Write a prompt first (or tap Build prompt)").max(30000),
    aspectRatio: z.enum(ASPECT_RATIOS),
    purpose: zPurpose,
    characterIds: z.array(zId).max(8),
    referenceAssetIds: z.array(zId).max(8),
    episodeId: zId.nullable().optional(),
    sceneId: zId.nullable().optional(),
  }),
  async (input, ctx) => {
    if (input.sceneId) await requireScene(ctx, input.sceneId);
    const { job, run } = await createImageJob(ctx, input);
    // Keeps running after this response is sent; the page follows it by polling the job.
    after(run);
    return job;
  },
);

/** Explicitly puts a library image on a scene as its visual reference. */
export const useImageForScene = action(z.object({ assetId: zId, sceneId: zId }), async (input, ctx) => {
  const { scene } = await requireScene(ctx, input.sceneId);
  await requireAsset(ctx, input.assetId, "image");
  await ctx.db.update(scenes).set({ visualAssetId: input.assetId, updatedAt: new Date() }).where(eq(scenes.id, scene.id));
  return { sceneId: scene.id };
});

export const savePromptTemplate = action(z.object({ name: z.string().trim().min(1, "Name the prompt").max(80), body: z.string().trim().min(1).max(30000), kind: z.enum(["image", "video", "text"]).default("image") }), async (input, ctx) => {
  const [row] = await ctx.db.insert(promptTemplates).values({ projectId: ctx.project.id, ...input }).returning();
  return row;
});

export const deletePromptTemplate = action(z.object({ id: zId }), async (input, ctx) => {
  const [row] = await ctx.db
    .delete(promptTemplates)
    .where(and(eq(promptTemplates.id, input.id), eq(promptTemplates.projectId, ctx.project.id)))
    .returning();
  if (!row) throw new UserError("Saved prompt not found.");
  return { id: row.id };
});

export const listPromptTemplates = action(
  z.object({ kind: z.enum(["image", "video", "text"]) }),
  async (input, ctx) =>
    ctx.db
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.projectId, ctx.project.id), eq(promptTemplates.kind, input.kind)))
      .orderBy(desc(promptTemplates.createdAt)),
  { revalidate: false },
);
