import "server-only";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { characters, dialogueLines, episodes, locations, sceneCharacters, scenes, type Episode } from "@/db/schema";
import { UserError } from "@/server/action";
import { textProvider } from "@/server/providers";
import { createJob, markFailed, markRunning, markSucceeded } from "@/server/services/jobs";
import { getScript } from "@/server/services/story";
import { listScenes, renumberScenes } from "@/server/services/scenes";
import { formatDuration } from "@/lib/utils";

export type SceneDraft = {
  title: string;
  durationSec: number;
  location: string;
  action: string;
  camera: string;
  characters: string[];
  dialogue: { speaker: string; text: string }[];
};

/** Inserts scene drafts into an episode, matching character and location names to the library. */
export async function insertSceneDrafts(ctx: Ctx, episode: Episode, drafts: SceneDraft[], mode: "replace" | "append"): Promise<number> {
  const { db } = ctx;
  const [cast, locs, existing] = await Promise.all([
    db.select({ id: characters.id, name: characters.name }).from(characters).where(eq(characters.projectId, ctx.project.id)),
    db.select({ id: locations.id, name: locations.name }).from(locations).where(eq(locations.projectId, ctx.project.id)),
    listScenes(ctx, episode.id),
  ]);
  const norm = (s: string) => s.trim().toLowerCase();
  const findChar = (name: string) => cast.find((c) => norm(c.name) === norm(name))?.id ?? null;
  const findLoc = (name: string) => locs.find((l) => norm(l.name) === norm(name))?.id ?? null;

  if (mode === "replace") await db.delete(scenes).where(eq(scenes.episodeId, episode.id));
  let position = mode === "replace" ? 0 : existing.length;

  for (const d of drafts) {
    const locationId = d.location ? findLoc(d.location) : null;
    const [scene] = await db
      .insert(scenes)
      .values({
        episodeId: episode.id,
        position: position++,
        title: d.title.slice(0, 200),
        durationSec: Math.max(1, Math.min(600, Math.round(d.durationSec || 5))),
        locationId,
        locationText: locationId ? "" : d.location.slice(0, 300),
        action: d.action,
        camera: d.camera,
        aspectRatio: episode.format === "short" ? "9:16" : "16:9",
      })
      .returning();
    const ids = [...new Set([...d.characters, ...d.dialogue.map((l) => l.speaker)].map(findChar).filter((v): v is string => !!v))];
    if (ids.length) await db.insert(sceneCharacters).values(ids.map((characterId) => ({ sceneId: scene.id, characterId })));
    if (d.dialogue.length) {
      await db.insert(dialogueLines).values(
        d.dialogue.map((l, i) => {
          const characterId = findChar(l.speaker);
          return { sceneId: scene.id, position: i, characterId, speaker: characterId ? "" : l.speaker.slice(0, 80), text: l.text };
        }),
      );
    }
  }
  await renumberScenes(ctx, episode.id);
  if (episode.stage === "idea" || episode.stage === "script") {
    await db.update(episodes).set({ stage: "storyboard" }).where(eq(episodes.id, episode.id));
  }
  return drafts.length;
}

const zBreakdown = z.object({
  scenes: z.array(
    z.object({
      title: z.string().describe("Short scene title, 2–5 words."),
      durationSec: z.number().describe("Seconds this scene should run on screen."),
      location: z.string().describe("Where it happens. Reuse an existing location name exactly when one fits."),
      action: z.string().describe("What we see happen, in one or two sentences."),
      camera: z.string().describe("Shot size, angle and any movement, e.g. 'Medium two-shot, slow push in'."),
      characters: z.array(z.string()).describe("Names of the characters visible, spelled exactly as in the cast list."),
      dialogue: z.array(z.object({ speaker: z.string(), text: z.string() })).describe("Spoken lines in this scene, in order, copied from the script."),
    }),
  ),
});

/** Uses the connected text provider to break the episode's script into storyboard scenes. */
export async function scenesFromScript(ctx: Ctx, episode: Episode, opts: { sceneCount?: number; mode: "replace" | "append" }): Promise<number> {
  const script = await getScript(ctx, episode.id);
  const s = script?.sections ?? {};
  const source = [s.script && `## Full script\n${s.script}`, s.sceneBreakdown && `## Writer's scene breakdown\n${s.sceneBreakdown}`].filter(Boolean).join("\n\n");
  if (!source.trim()) throw new UserError("This episode has no script yet. Write or generate one in Story Engine first.");

  const [cast, locs] = await Promise.all([
    ctx.db.select({ name: characters.name }).from(characters).where(eq(characters.projectId, ctx.project.id)),
    ctx.db.select({ name: locations.name }).from(locations).where(eq(locations.projectId, ctx.project.id)),
  ]);
  const provider = await textProvider(ctx);
  const prompt = [
    `Break this animation script into storyboard scenes${opts.sceneCount ? ` — exactly ${opts.sceneCount} scenes` : ""}. A new scene starts whenever the location, time or camera setup changes. Cover the whole script in order and keep every spoken line, assigned to the scene it belongs to.`,
    `Target total length: ${formatDuration(episode.targetDurationSec)}. Scene durations should add up to roughly that.`,
    `Cast names (use these spellings): ${cast.map((c) => c.name).join(", ") || "none defined"}`,
    `Existing locations (reuse these names when they fit): ${locs.map((l) => l.name).join(", ") || "none defined yet"}`,
    source,
  ].join("\n\n");
  const system = "You are a storyboard artist's assistant for a YouTube animation channel. You turn scripts into clear, producible shot lists and never invent story beats that are not in the script.";

  const job = await createJob(ctx, { kind: "text", purpose: "script to scenes", provider: provider.id, model: provider.model, prompt: prompt.slice(0, 4000), episodeId: episode.id });
  await markRunning(ctx, job.id);
  try {
    const { data, usage } = await provider.generateObject({ system, prompt, schema: zBreakdown, maxTokens: 32000 });
    if (!data.scenes.length) throw new UserError("No scenes could be identified in the script.");
    const n = await insertSceneDrafts(ctx, episode, data.scenes, opts.mode);
    await markSucceeded(ctx, job.id, null, usage);
    return n;
  } catch (err) {
    await markFailed(ctx, job.id, err instanceof Error ? err.message : "Unknown error");
    throw err;
  }
}
