import "server-only";
import { z } from "zod";
import { eq, inArray, or } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import {
  characterRelationships,
  characters,
  episodes,
  scripts,
  SCRIPT_SECTIONS,
  type Character,
  type Episode,
  type Script,
  type ScriptReview,
  type ScriptSectionKey,
  type ScriptSections,
  type StoryInputs,
} from "@/db/schema";
import { UserError } from "@/server/action";
import { textProvider } from "@/server/providers";
import type { TextProvider, TextUsage } from "@/server/providers/types";
import { createJob, markFailed, markRunning, markSucceeded } from "@/server/services/jobs";
import { charactersByIds } from "@/server/services/characters";
import { studioGuides } from "@/server/services/settings";
import { SCRIPT_SECTION_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Script storage                                                      */
/* ------------------------------------------------------------------ */

export async function getScript(ctx: Ctx, episodeId: string): Promise<Script | null> {
  const [row] = await ctx.db.select().from(scripts).where(eq(scripts.episodeId, episodeId)).limit(1);
  return row ?? null;
}

export async function saveScript(
  ctx: Ctx,
  episode: Episode,
  patch: { sections?: ScriptSections; inputs?: StoryInputs; review?: ScriptReview | null },
): Promise<Script> {
  const existing = await getScript(ctx, episode.id);
  const sections = { ...(existing?.sections ?? {}), ...(patch.sections ?? {}) };
  const values = {
    sections,
    ...(patch.inputs ? { inputs: patch.inputs } : {}),
    ...(patch.review !== undefined ? { review: patch.review } : {}),
  };
  let row: Script;
  if (existing) {
    [row] = await ctx.db.update(scripts).set(values).where(eq(scripts.id, existing.id)).returning();
  } else {
    [row] = await ctx.db.insert(scripts).values({ episodeId: episode.id, ...values }).returning();
  }
  // Keep the episode in step with its script: title follows the script title, idea → script stage.
  const epPatch: Partial<Episode> = { updatedAt: new Date() };
  const title = patch.sections?.title?.trim();
  if (title && title !== episode.title) epPatch.title = title.slice(0, 160);
  if (episode.stage === "idea" && (sections.script ?? "").trim()) epPatch.stage = "script";
  await ctx.db.update(episodes).set(epPatch).where(eq(episodes.id, episode.id));
  return row;
}

/* ------------------------------------------------------------------ */
/* Prompt context                                                      */
/* ------------------------------------------------------------------ */

function characterBrief(c: Character): string {
  const parts = [
    `### ${c.name}${c.tagline ? ` — ${c.tagline}` : ""}`,
    c.mainRole && `Role in stories: ${c.mainRole}`,
    c.description && `Description: ${c.description}`,
    c.personality && `Personality: ${c.personality}`,
    c.voiceDescription && `Voice / way of speaking: ${c.voiceDescription}`,
    c.signatureClothing && `Signature look: ${c.signatureClothing}`,
  ];
  return parts.filter(Boolean).join("\n");
}

export async function castContext(ctx: Ctx, cast: Character[]): Promise<string> {
  if (!cast.length) return "No characters were selected. Invent only minor unnamed background roles if needed.";
  const ids = cast.map((c) => c.id);
  const rels = await ctx.db
    .select()
    .from(characterRelationships)
    .where(or(inArray(characterRelationships.characterId, ids), inArray(characterRelationships.relatedCharacterId, ids)));
  const name = (id: string) => cast.find((c) => c.id === id)?.name;
  const relLines = rels
    .filter((r) => name(r.characterId) && name(r.relatedCharacterId))
    .map((r) => `- ${name(r.characterId)} is ${name(r.relatedCharacterId)}'s ${r.relationship}${r.notes ? ` (${r.notes})` : ""}`);
  return [cast.map(characterBrief).join("\n\n"), relLines.length ? `### Relationships\n${relLines.join("\n")}` : ""].filter(Boolean).join("\n\n");
}

async function systemPrompt(ctx: Ctx): Promise<string> {
  const { storyGuide } = await studioGuides(ctx);
  return [
    `You are the head writer for "${ctx.project.channelName}", a YouTube animation channel. You write scripts that a small animation team will actually produce, so every scene must be filmable with the listed cast in a small number of locations.`,
    storyGuide ? `Channel story and humour guide (follow it):\n${storyGuide}` : "",
    "Stay true to each character's established personality, voice and relationships — these are existing characters with fans, not blank slates. Do not rename them, redesign them or invent new main characters.",
    "Write for viewers, not for an algorithm: a hook in the first seconds that earns attention, clear cause and effect, dialogue that sounds like the characters, and an ending that pays off the setup.",
    "Be honest about quality. Never claim or imply that a story will go viral or is guaranteed to perform — nobody can know that.",
    "Formatting: plain text only, no markdown symbols. In scripts, put each dialogue line on its own line as NAME: line, and stage directions in [square brackets].",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function inputsBrief(inputs: StoryInputs, cast: Character[]): string {
  const words = Math.round((inputs.targetDurationSec / 60) * 140);
  return [
    `Story type: ${inputs.storyType}`,
    `Genre: ${inputs.genre}`,
    `Tone: ${inputs.tone}`,
    `Audience: ${inputs.audience}`,
    `Setting: ${inputs.setting || "writer's choice, keep it producible"}`,
    `Story complexity: ${inputs.complexity}`,
    `Target video length: ${formatDuration(inputs.targetDurationSec)} (roughly ${words} spoken words; ${inputs.targetDurationSec <= 60 ? "this is a vertical Short — one idea, one punchline" : "long-form — give it an arc with a midpoint turn"})`,
    `Characters (${cast.length}): ${cast.map((c) => c.name).join(", ") || "none selected"}`,
    inputs.idea ? `The creator's idea — build on it, do not replace it:\n${inputs.idea}` : "No specific idea was given — pitch your strongest one for this cast.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Job-logged provider calls                                           */
/* ------------------------------------------------------------------ */

async function logged<T>(
  ctx: Ctx,
  purpose: string,
  episodeId: string | null,
  prompt: string,
  fn: (provider: TextProvider) => Promise<{ value: T; usage: TextUsage }>,
): Promise<T> {
  const provider = await textProvider(ctx);
  const job = await createJob(ctx, { kind: "text", purpose, provider: provider.id, model: provider.model, prompt: prompt.slice(0, 4000), episodeId });
  await markRunning(ctx, job.id);
  try {
    const { value, usage } = await fn(provider);
    await markSucceeded(ctx, job.id, null, usage);
    return value;
  } catch (err) {
    await markFailed(ctx, job.id, err instanceof Error ? err.message : "Unknown error");
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const zIdeas = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      hook: z.string().describe("The first 5 seconds: what we see and hear."),
      premise: z.string().describe("Two or three sentences: the situation, the escalation, and the kind of ending."),
      twist: z.string().describe("The unexpected turn."),
    }),
  ),
});
export type StoryIdea = z.infer<typeof zIdeas>["ideas"][number];

export async function generateIdeas(ctx: Ctx, episode: Episode, inputs: StoryInputs): Promise<StoryIdea[]> {
  const cast = await charactersByIds(ctx, inputs.characterIds);
  const prompt = `Pitch 5 distinct episode ideas.\n\n${inputsBrief(inputs, cast)}\n\n## Cast\n${await castContext(ctx, cast)}\n\nMake the five ideas genuinely different from each other (different situations, not variations of one). Each must be producible with this cast.`;
  return logged(ctx, "story ideas", episode.id, prompt, async (p) => {
    const { data, usage } = await p.generateObject({ system: await systemPrompt(ctx), prompt, schema: zIdeas, maxTokens: 8000 });
    return { value: data.ideas, usage };
  });
}

/**
 * A full story is written in stages — an outline, then the script in parts of a few hundred words —
 * instead of one very long request. Each stage is a short call, so it fits hosts that limit how
 * long a request may run, the creator sees progress, and a failed part does not lose the rest.
 */
const zOutline = z.object({
  title: z.string().describe("Episode title, under 70 characters, honest about what happens."),
  hook: z.string().describe("Opening hook: exactly what happens on screen and what is said in the first 5–10 seconds."),
  concept: z.string().describe("Story concept in one short paragraph: setup, escalation, payoff."),
  characterRoles: z.string().describe("One line per character: NAME — what they want in this episode and their function in the story."),
  sceneBreakdown: z.string().describe("Numbered scenes covering the whole episode. For each: location, who is present, what happens, approximate seconds."),
  ending: z.string().describe("How the episode ends and why it pays off the setup. Include the final line or image."),
  thumbnailConcept: z.string().describe("One thumbnail idea: the single image, characters' expressions, and at most 3 words of text."),
});

const WORDS_PER_MINUTE = 140;
const WORDS_PER_PART = 450;

/** How many parts the script is written in for a target length (one part is roughly three minutes of video). */
export function scriptPartCount(targetDurationSec: number): number {
  const words = (targetDurationSec / 60) * WORDS_PER_MINUTE;
  return Math.max(1, Math.min(8, Math.ceil(words / WORDS_PER_PART)));
}

/** Stage 1: the outline. Clears the old script so the parts that follow start from a clean page. */
export async function generateOutline(ctx: Ctx, episode: Episode, inputs: StoryInputs): Promise<{ script: Script; parts: number }> {
  const cast = await charactersByIds(ctx, inputs.characterIds);
  const prompt = `Plan a complete episode. Write everything except the script itself, which comes next.\n\n${inputsBrief(inputs, cast)}\n\n## Cast\n${await castContext(ctx, cast)}\n\nThe scene breakdown must cover the whole episode at the target length, because the script will be written from it.`;
  const outline = await logged(ctx, "story outline", episode.id, prompt, async (p) => {
    const { data, usage } = await p.generateObject({ system: await systemPrompt(ctx), prompt, schema: zOutline, maxTokens: 8000 });
    return { value: data, usage };
  });
  const script = await saveScript(ctx, episode, { sections: { ...outline, script: "", dialogue: "" }, inputs, review: null });
  return { script, parts: scriptPartCount(inputs.targetDurationSec) };
}

/** Spoken lines of a script (NAME: line), in order — what voice actors and Audio Studio work from. */
export function dialogueFromScript(script: string): string {
  return script
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[A-Z][A-Za-z0-9 .'’()&-]{0,40}:\s*\S/.test(l) && !l.startsWith("["))
    .join("\n");
}

/** Stage 2: one part of the script, continuing exactly where the previous part stopped. */
export async function generateScriptPart(ctx: Ctx, episode: Episode, part: number, parts: number): Promise<Script> {
  const existing = await getScript(ctx, episode.id);
  const sections = existing?.sections ?? {};
  const inputs = existing?.inputs;
  if (!inputs || !(sections.sceneBreakdown ?? "").trim()) throw new UserError("Generate the story outline first.");
  const cast = await charactersByIds(ctx, inputs.characterIds);
  const soFar = part === 1 ? "" : (sections.script ?? "").trim();
  const totalWords = Math.round((inputs.targetDurationSec / 60) * WORDS_PER_MINUTE);
  const partWords = Math.max(60, Math.round(totalWords / parts));
  const prompt = [
    `Write part ${part} of ${parts} of the episode's script, about ${partWords} words (the whole script is about ${totalWords} words).`,
    part === 1 ? "Start with the opening hook." : "Continue directly from the last line of the script so far. Do not repeat or summarise anything already written.",
    part === parts ? "This is the final part: bring the story to the planned ending and finish the episode." : "Stop at a natural beat; the story continues in the next part, so do not wrap it up yet.",
    `## Brief\n${inputsBrief(inputs, cast)}`,
    `## Cast\n${await castContext(ctx, cast)}`,
    `## Outline\n${scriptAsText({ ...sections, script: "", dialogue: "" })}`,
    soFar ? `## Script so far\n${soFar}` : "",
    "Reply with the script text for this part only — no heading, no part number, no commentary.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const text = await logged(ctx, `script part ${part}/${parts}`, episode.id, prompt, async (p) => {
    const res = await p.generateText({ system: await systemPrompt(ctx), prompt, maxTokens: 6000 });
    return { value: res.text, usage: res.usage };
  });
  const script = [soFar, text.trim()].filter(Boolean).join("\n\n");
  // The dialogue sheet is derived from the script, so it always matches it exactly.
  return saveScript(ctx, episode, { sections: { script, dialogue: dialogueFromScript(script) } });
}

function scriptAsText(sections: ScriptSections, skip?: ScriptSectionKey): string {
  return SCRIPT_SECTIONS.filter((k) => k !== skip && (sections[k] ?? "").trim())
    .map((k) => `## ${SCRIPT_SECTION_LABELS[k]}\n${sections[k]}`)
    .join("\n\n");
}

/** Rewrites one section while keeping every other section exactly as it is. */
export async function regenerateSection(ctx: Ctx, episode: Episode, key: ScriptSectionKey, instruction: string): Promise<Script> {
  const script = await getScript(ctx, episode.id);
  const sections = script?.sections ?? {};
  const inputs = script?.inputs;
  const cast = inputs ? await charactersByIds(ctx, inputs.characterIds) : [];
  const others = scriptAsText(sections, key);
  if (!others && !inputs && !episode.logline) throw new UserError("Write or generate some of the story first, so there is something to build on.");
  const prompt = [
    `Rewrite ONLY the "${SCRIPT_SECTION_LABELS[key]}" section of this episode. Every other section stays exactly as it is, so your new version must agree with them.`,
    `Episode: ${episode.title}${episode.logline ? `\nIdea: ${episode.logline}` : ""}`,
    inputs ? `## Brief\n${inputsBrief(inputs, cast)}` : "",
    cast.length ? `## Cast\n${await castContext(ctx, cast)}` : "",
    others ? `## The other sections (do not change these)\n${others}` : "",
    (sections[key] ?? "").trim() ? `## Current version of the section you are replacing\n${sections[key]}` : "",
    instruction ? `## What the creator wants changed\n${instruction}` : "The creator wants a fresh take that is clearly different from the current version.",
    `Reply with the new "${SCRIPT_SECTION_LABELS[key]}" text only — no heading, no commentary.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const text = await logged(ctx, `regenerate ${key}`, episode.id, prompt, async (p) => {
    const { text, usage } = await p.generateText({ system: await systemPrompt(ctx), prompt, maxTokens: key === "script" ? 32000 : 8000 });
    return { value: text, usage };
  });
  return saveScript(ctx, episode, { sections: { [key]: text } });
}

/* ------------------------------------------------------------------ */
/* Quality review                                                      */
/* ------------------------------------------------------------------ */

export const REVIEW_CHECKS = [
  { key: "opening", label: "Opening engagement" },
  { key: "clarity", label: "Story clarity" },
  { key: "pacing", label: "Pacing" },
  { key: "characters", label: "Character consistency" },
  { key: "dialogue", label: "Dialogue quality" },
  { key: "ending", label: "Ending strength" },
] as const;

const zReview = z.object({
  summary: z.string().describe("Two or three sentences: the script's biggest strength and the single most valuable fix."),
  checks: z.array(
    z.object({
      key: z.enum(["opening", "clarity", "pacing", "characters", "dialogue", "ending"]),
      score: z.number().describe("Integer 1 to 5. 3 means solid but unremarkable; reserve 5 for work with nothing to fix."),
      notes: z.string().describe("Specific evidence from the script, then one concrete fix."),
    }),
  ),
});

export async function reviewScript(ctx: Ctx, episode: Episode): Promise<Script> {
  const script = await getScript(ctx, episode.id);
  const sections = script?.sections ?? {};
  if (!(sections.script ?? "").trim()) throw new UserError("There is no full script to review yet.");
  const cast = script?.inputs ? await charactersByIds(ctx, script.inputs.characterIds) : [];
  const prompt = [
    "Review this animation script as a tough but constructive script editor. Score each of the six areas and quote or point at specific lines as evidence.",
    "Give one entry for each key: opening (does the first 5–10 seconds earn attention?), clarity (can a viewer follow cause and effect?), pacing (does anything drag or rush for the target length?), characters (does everyone act and speak like their profile?), dialogue (natural, distinct voices, funny where intended?), ending (does it pay off the setup?).",
    "This is craft feedback only. Do not predict views, virality or performance.",
    script?.inputs ? `Target length: ${formatDuration(script.inputs.targetDurationSec)}. Audience: ${script.inputs.audience}. Tone: ${script.inputs.tone}.` : `Target length: ${formatDuration(episode.targetDurationSec)}.`,
    cast.length ? `## Character profiles\n${await castContext(ctx, cast)}` : "",
    `## Script\n${scriptAsText(sections)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const system = `You are an experienced script editor for YouTube animation. You are direct, specific and fair, and you never inflate scores.`;
  const result = await logged(ctx, "script review", episode.id, prompt, async (p) => {
    const { data, usage } = await p.generateObject({ system, prompt, schema: zReview, maxTokens: 8000 });
    return { value: { data, model: p.model }, usage };
  });
  const review: ScriptReview = {
    reviewedAt: new Date().toISOString(),
    model: result.model,
    summary: result.data.summary,
    checks: REVIEW_CHECKS.map((c) => {
      const found = result.data.checks.find((x) => x.key === c.key);
      return { key: c.key, label: c.label, score: Math.max(1, Math.min(5, Math.round(found?.score ?? 0))) || 0, notes: found?.notes ?? "Not assessed." };
    }),
  };
  return saveScript(ctx, episode, { review });
}

export async function episodeCast(ctx: Ctx, ids: string[]): Promise<Character[]> {
  if (!ids.length) return [];
  return ctx.db.select().from(characters).where(inArray(characters.id, ids));
}
