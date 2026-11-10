"use server";

import { z } from "zod";
import { action, zId, zText } from "@/server/action";
import { SCRIPT_SECTIONS } from "@/db/schema";
import { requireEpisode } from "@/server/services/scenes";
import { generateIdeas, generateStory, regenerateSection, reviewScript, saveScript } from "@/server/services/story";
import { logActivity } from "@/server/services/activity";

const zInputs = z.object({
  genre: z.string().trim().min(1).max(60),
  storyType: z.string().trim().min(1).max(60),
  targetDurationSec: z.number().int().min(10).max(3600),
  characterIds: z.array(zId).max(20),
  tone: z.string().trim().min(1).max(80),
  audience: z.string().trim().min(1).max(120),
  setting: zText(300),
  complexity: z.string().trim().min(1).max(60),
  idea: zText(4000),
});

/** Autosave of one or more script sections. Does not refresh the page (the editor already shows the text). */
export const saveScriptSections = action(
  z.object({ episodeId: zId, sections: z.partialRecord(z.enum(SCRIPT_SECTIONS), z.string().max(200_000)) }),
  async (input, ctx) => {
    const episode = await requireEpisode(ctx, input.episodeId);
    const script = await saveScript(ctx, episode, { sections: input.sections });
    return { savedAt: script.updatedAt.toISOString() };
  },
  { revalidate: false },
);

export const suggestIdeas = action(
  z.object({ episodeId: zId, inputs: zInputs }),
  async (input, ctx) => {
    const episode = await requireEpisode(ctx, input.episodeId);
    return generateIdeas(ctx, episode, input.inputs);
  },
  { revalidate: false },
);

export const writeStory = action(z.object({ episodeId: zId, inputs: zInputs }), async (input, ctx) => {
  const episode = await requireEpisode(ctx, input.episodeId);
  const script = await generateStory(ctx, episode, input.inputs);
  await logActivity(ctx, "story", `Generated a story for “${script.sections.title || episode.title}”`, `/story?episode=${episode.id}`);
  return script;
});

export const rewriteSection = action(z.object({ episodeId: zId, section: z.enum(SCRIPT_SECTIONS), instruction: zText(2000).default("") }), async (input, ctx) => {
  const episode = await requireEpisode(ctx, input.episodeId);
  const script = await regenerateSection(ctx, episode, input.section, input.instruction);
  return { text: script.sections[input.section] ?? "" };
});

export const runScriptReview = action(z.object({ episodeId: zId }), async (input, ctx) => {
  const episode = await requireEpisode(ctx, input.episodeId);
  const script = await reviewScript(ctx, episode);
  return script.review!;
});
