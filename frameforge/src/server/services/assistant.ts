import "server-only";
import { z } from "zod";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { assistantMessages, characters, episodes, scenes, EPISODE_STAGES, SCRIPT_SECTIONS, type Episode } from "@/db/schema";
import { UserError } from "@/server/action";
import { textProvider } from "@/server/providers";
import type { AssistantTool, StoredAssistantMessage } from "@/server/providers/types";
import { createJob, markFailed, markRunning, markSucceeded } from "@/server/services/jobs";
import { listEpisodes, nextEpisodeNumber, progressFor } from "@/server/services/episodes";
import { listScenes } from "@/server/services/scenes";
import { getScript, saveScript } from "@/server/services/story";
import { insertSceneDrafts } from "@/server/services/storyboard";
import { buildSceneAnimationPrompt, buildSceneVisualPrompt } from "@/server/services/prompts";
import { studioGuides } from "@/server/services/settings";
import { logActivity } from "@/server/services/activity";
import { STAGE_LABELS } from "@/lib/constants";

const MAX_STORED_MESSAGES = 60;

/* ------------------------------------------------------------------ */
/* Thread storage                                                      */
/* ------------------------------------------------------------------ */

const threadWhere = (ctx: Ctx, episodeId: string | null) =>
  and(eq(assistantMessages.projectId, ctx.project.id), episodeId ? eq(assistantMessages.episodeId, episodeId) : isNull(assistantMessages.episodeId));

async function loadThread(ctx: Ctx, episodeId: string | null): Promise<StoredAssistantMessage[]> {
  const rows = await ctx.db.select().from(assistantMessages).where(threadWhere(ctx, episodeId)).orderBy(asc(assistantMessages.createdAt), asc(assistantMessages.id));
  let msgs = rows.map((r) => ({ role: r.role, content: r.content }));
  // Keep recent history only, always starting at a plain user message so tool calls stay paired with their results.
  if (msgs.length > MAX_STORED_MESSAGES) {
    const tail = msgs.slice(-MAX_STORED_MESSAGES);
    const start = tail.findIndex((m) => m.role === "user" && typeof m.content === "string");
    msgs = start >= 0 ? tail.slice(start) : [];
  }
  return msgs;
}

type Block = { type: string; [k: string]: unknown };

/**
 * Only plain conversation content is stored between turns: text, tool calls and tool results.
 * Model-internal blocks (thinking etc.) are bound to the request that produced them and are dropped.
 */
function storable(m: StoredAssistantMessage): StoredAssistantMessage | null {
  if (typeof m.content === "string") return m;
  if (!Array.isArray(m.content)) return null;
  const allowed = m.role === "assistant" ? ["text", "tool_use"] : ["text", "tool_result"];
  const blocks = (m.content as Block[])
    .filter((b) => allowed.includes(b.type))
    .map((b) => (b.type === "text" ? { type: "text", text: b.text } : b.type === "tool_use" ? { type: "tool_use", id: b.id, name: b.name, input: b.input } : b));
  return blocks.length ? { role: m.role, content: blocks } : null;
}

export type AssistantDisplayMessage = { role: "user" | "assistant"; text: string; tools: string[] };

/** Collapses stored provider messages into what the chat panel shows. */
function toDisplay(msgs: StoredAssistantMessage[]): AssistantDisplayMessage[] {
  const out: AssistantDisplayMessage[] = [];
  for (const m of msgs) {
    if (m.role === "user") {
      if (typeof m.content === "string") out.push({ role: "user", text: m.content, tools: [] });
      continue; // tool results are not shown
    }
    const blocks = Array.isArray(m.content) ? (m.content as Block[]) : [];
    const text = blocks.filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join("\n").trim();
    const tools = blocks.filter((b) => b.type === "tool_use").map((b) => String(b.name));
    const last = out[out.length - 1];
    if (last?.role === "assistant") {
      last.text = [last.text, text].filter(Boolean).join("\n\n");
      last.tools.push(...tools);
    } else out.push({ role: "assistant", text, tools });
  }
  return out.filter((m) => m.text || m.tools.length);
}

export async function threadForDisplay(ctx: Ctx, episodeId: string | null): Promise<AssistantDisplayMessage[]> {
  return toDisplay(await loadThread(ctx, episodeId));
}

export async function clearThread(ctx: Ctx, episodeId: string | null): Promise<void> {
  await ctx.db.delete(assistantMessages).where(threadWhere(ctx, episodeId));
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

const json = (v: unknown) => JSON.stringify(v, null, 1);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}… [truncated, ${s.length} characters in total]` : s);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTools(ctx: Ctx, episode: Episode | null): AssistantTool<any>[] {
  const need = (): Episode => {
    if (!episode) throw new UserError("No episode is open. Ask the user to open or create an episode first (the create_episode tool can make one).");
    return episode;
  };
  const sceneByNumber = async (n: number) => {
    const list = await listScenes(ctx, need().id);
    const scene = list[n - 1];
    if (!scene) throw new UserError(`There is no scene ${n}. This episode has ${list.length} scene(s).`);
    return scene;
  };
  const castNames = async () => new Map((await ctx.db.select({ id: characters.id, name: characters.name }).from(characters).where(eq(characters.projectId, ctx.project.id))).map((c) => [c.id, c.name]));

  const tools = [
    {
      name: "get_current_episode",
      description: "Details of the episode the user currently has open: title, idea, stage, target length, which script sections are written, scene count and production progress. Call this before answering questions about 'this episode'.",
      input: z.object({}),
      run: async () => {
        const ep = need();
        const [progress, script] = await Promise.all([progressFor(ctx, [ep.id]), getScript(ctx, ep.id)]);
        const p = progress.get(ep.id)!;
        return json({
          number: ep.number,
          title: ep.title,
          idea: ep.logline,
          stage: STAGE_LABELS[ep.stage],
          targetDurationSec: ep.targetDurationSec,
          format: ep.format,
          scriptSectionsWritten: SCRIPT_SECTIONS.filter((k) => (script?.sections[k] ?? "").trim()),
          sceneCount: p.sceneCount,
          storyboardRuntimeSec: p.totalDurationSec,
          progressPercent: p.percent,
          tasks: p.tasks.map((t) => ({ task: t.label, done: t.done, detail: t.detail })),
        });
      },
    },
    {
      name: "list_episodes",
      description: "All episodes in the studio with stage and progress.",
      input: z.object({}),
      run: async () => json((await listEpisodes(ctx)).map((e) => ({ number: e.number, title: e.title, stage: STAGE_LABELS[e.stage], progressPercent: e.progress.percent, scenes: e.progress.sceneCount }))),
    },
    {
      name: "list_characters",
      description: "The channel's cast with personality, role, voice and look. Use the exact names from this list when writing dialogue or assigning characters to scenes.",
      input: z.object({}),
      run: async () => {
        const rows = await ctx.db.select().from(characters).where(eq(characters.projectId, ctx.project.id)).orderBy(characters.sortOrder);
        return json(
          rows.map((c) => ({ name: c.name, tagline: c.tagline, group: c.roleType, role: c.mainRole, description: c.description, personality: c.personality, voice: c.voiceDescription, look: c.signatureClothing || c.visualTraits })),
        );
      },
    },
    {
      name: "get_script",
      description: "The current episode's script sections (title, hook, concept, characterRoles, script, dialogue, sceneBreakdown, ending, thumbnailConcept).",
      input: z.object({}),
      run: async () => {
        const script = await getScript(ctx, need().id);
        if (!script) return "This episode has no script yet.";
        return json(Object.fromEntries(SCRIPT_SECTIONS.map((k) => [k, clip(script.sections[k] ?? "", 30000)])));
      },
    },
    {
      name: "save_script_sections",
      description:
        "Writes one or more script sections of the current episode. Only the sections you pass are replaced; the others are untouched. Use this when the user asks you to write or rewrite a story, script or part of one. Plain text, dialogue as NAME: line, stage directions in [brackets].",
      mutates: true,
      input: z.object({
        sections: z.object({
          title: z.string().optional(),
          hook: z.string().optional(),
          concept: z.string().optional(),
          characterRoles: z.string().optional(),
          script: z.string().optional(),
          dialogue: z.string().optional(),
          sceneBreakdown: z.string().optional(),
          ending: z.string().optional(),
          thumbnailConcept: z.string().optional(),
        }),
      }),
      run: async (input: { sections: Record<string, string | undefined> }) => {
        const sections = Object.fromEntries(Object.entries(input.sections).filter(([, v]) => typeof v === "string" && v.trim()));
        if (!Object.keys(sections).length) throw new UserError("No section text was provided.");
        await saveScript(ctx, need(), { sections });
        return `Saved sections: ${Object.keys(sections).join(", ")}. The user can read and edit them in Story Engine.`;
      },
    },
    {
      name: "list_scenes",
      description: "The current episode's storyboard scenes in order, with duration, location, characters, dialogue and which production pieces each scene still lacks.",
      input: z.object({ includeDialogue: z.boolean().optional().describe("Include the full dialogue lines. Default false (only counts).") }),
      run: async (input: { includeDialogue?: boolean }) => {
        const [list, names] = await Promise.all([listScenes(ctx, need().id), castNames()]);
        if (!list.length) return "This episode has no scenes yet.";
        return json(
          list.map((s) => ({
            scene: s.position + 1,
            title: s.title,
            durationSec: s.durationSec,
            status: s.status,
            location: s.locationName ?? s.locationText ?? "",
            linkedToWorldBuilderLocation: !!s.locationId,
            characters: s.characterIds.map((id) => names.get(id)).filter(Boolean),
            action: s.action,
            camera: s.camera,
            dialogueLines: s.lines.length,
            dialogue: input.includeDialogue ? s.lines.map((l) => ({ speaker: names.get(l.characterId ?? "") ?? l.speaker, text: l.text })) : undefined,
            hasVisualReference: !!s.visual,
            hasBackground: !!s.background,
            hasVisualPrompt: !!s.visualPrompt.trim(),
            hasAnimationClip: !!s.clip,
            voiceoversRecorded: `${s.lines.filter((l) => l.audioAssetId).length}/${s.lines.length}`,
          })),
        );
      },
    },
    {
      name: "find_scenes_missing",
      description: "Lists the scenes of the current episode that are missing something: a background, a visual reference, a visual prompt, an animation clip, voiceovers, a location or characters.",
      input: z.object({ what: z.enum(["background", "visual_reference", "visual_prompt", "animation_clip", "voiceover", "location", "characters"]) }),
      run: async (input: { what: string }) => {
        const list = await listScenes(ctx, need().id);
        const missing = list.filter((s) =>
          input.what === "background"
            ? !s.background
            : input.what === "visual_reference"
              ? !s.visual
              : input.what === "visual_prompt"
                ? !s.visualPrompt.trim()
                : input.what === "animation_clip"
                  ? !s.clip
                  : input.what === "voiceover"
                    ? s.lines.some((l) => !l.audioAssetId)
                    : input.what === "location"
                      ? !s.locationId && !s.locationText.trim()
                      : s.characterIds.length === 0,
        );
        return json({ totalScenes: list.length, missingCount: missing.length, scenes: missing.map((s) => ({ scene: s.position + 1, title: s.title })) });
      },
    },
    {
      name: "replace_storyboard_scenes",
      description:
        "Creates storyboard scenes for the current episode from scene drafts you write (for example when asked to break the script into N scenes). mode 'replace' deletes the existing scenes and their dialogue first — only use it when the user asked to rebuild the storyboard or there are no scenes yet; otherwise use 'append'. Use exact cast names; reuse existing location names when they fit.",
      mutates: true,
      input: z.object({
        mode: z.enum(["replace", "append"]),
        scenes: z.array(
          z.object({
            title: z.string(),
            durationSec: z.number(),
            location: z.string(),
            action: z.string(),
            camera: z.string(),
            characters: z.array(z.string()),
            dialogue: z.array(z.object({ speaker: z.string(), text: z.string() })),
          }),
        ),
      }),
      run: async (input: { mode: "replace" | "append"; scenes: Parameters<typeof insertSceneDrafts>[2] }) => {
        if (!input.scenes.length) throw new UserError("No scenes were provided.");
        const ep = need();
        const n = await insertSceneDrafts(ctx, ep, input.scenes, input.mode);
        await logActivity(ctx, "storyboard", `Assistant ${input.mode === "replace" ? "rebuilt" : "added"} ${n} storyboard scenes for “${ep.title}”`, `/storyboard?episode=${ep.id}`);
        return `${input.mode === "replace" ? "Replaced the storyboard with" : "Added"} ${n} scenes. The user can review them in Storyboard Studio.`;
      },
    },
    {
      name: "build_scene_prompt",
      description:
        "Builds and saves the image prompt (kind 'visual') or video prompt (kind 'animation') for one scene of the current episode. The prompt is assembled from the channel style guide, the scene, its location and each character's Consistency Profile, so characters stay on-model. Returns the prompt text. This does not generate an image or a video.",
      mutates: true,
      input: z.object({ sceneNumber: z.number().describe("1-based scene number"), kind: z.enum(["visual", "animation"]) }),
      run: async (input: { sceneNumber: number; kind: "visual" | "animation" }) => {
        const scene = await sceneByNumber(input.sceneNumber);
        const prompt = input.kind === "visual" ? await buildSceneVisualPrompt(ctx, scene) : await buildSceneAnimationPrompt(ctx, scene);
        await ctx.db
          .update(scenes)
          .set(input.kind === "visual" ? { visualPrompt: prompt } : { animationPrompt: prompt })
          .where(eq(scenes.id, scene.id));
        return prompt;
      },
    },
    {
      name: "set_episode_stage",
      description: `Moves the current episode to a pipeline stage (${EPISODE_STAGES.join(", ")}). Use when the user asks to move it, or after confirming it is ready for the next step. Never set 'published' unless the user explicitly says the video is live.`,
      mutates: true,
      input: z.object({ stage: z.enum(EPISODE_STAGES) }),
      run: async (input: { stage: (typeof EPISODE_STAGES)[number] }) => {
        const ep = need();
        await ctx.db.update(episodes).set({ stage: input.stage, updatedAt: new Date() }).where(eq(episodes.id, ep.id));
        return `Episode moved to ${STAGE_LABELS[input.stage]}.`;
      },
    },
    {
      name: "create_episode",
      description: "Creates a new episode in the studio. Use when the user asks for a new episode. Returns its number; the user opens it from the Episodes page.",
      mutates: true,
      input: z.object({ title: z.string(), idea: z.string(), targetDurationSec: z.number() }),
      run: async (input: { title: string; idea: string; targetDurationSec: number }) => {
        const number = await nextEpisodeNumber(ctx);
        const seconds = Math.max(10, Math.min(3600, Math.round(input.targetDurationSec || 180)));
        const [ep] = await ctx.db
          .insert(episodes)
          .values({ projectId: ctx.project.id, number, title: input.title.slice(0, 160) || `Episode ${number}`, logline: input.idea.slice(0, 2000), targetDurationSec: seconds, format: seconds <= 60 ? "short" : "long" })
          .returning();
        await logActivity(ctx, "episode", `Assistant created episode ${number}: “${ep.title}”`, `/episodes/${ep.id}`);
        return json({ created: true, episodeNumber: number, title: ep.title, openAt: `/episodes/${ep.id}`, note: "This new episode is not the one currently open. Tell the user to open it to keep working on it." });
      },
    },
  ];
  return tools;
}

/* ------------------------------------------------------------------ */
/* Turn                                                                */
/* ------------------------------------------------------------------ */

async function systemPrompt(ctx: Ctx, episode: Episode | null): Promise<string> {
  const { storyGuide, styleGuide } = await studioGuides(ctx);
  return [
    `You are the FRAMEFORGE assistant, the production assistant inside an animation studio app for the YouTube channel "${ctx.project.channelName}". You help its creator plan and produce episodes: ideas, scripts, storyboards, prompts and production tracking. The creator mostly works from a phone, so keep replies short and scannable, and lead with the result.`,
    episode
      ? `The creator currently has Episode ${episode.number} open. "This episode", "the script" and "scene 4" refer to it. Its live details can change between messages, so read them with the tools rather than assuming.`
      : "No episode is open right now. You can still answer studio-wide questions and create a new episode.",
    "Use the tools to read real studio data before answering questions about it — never guess what a script or scene contains. When the creator asks you to write or change something (a story, scenes, a prompt), do it with the matching tool and then say briefly what you did and where to find it, instead of pasting everything into the chat.",
    "Stay faithful to the existing cast: use their exact names and established personalities, and never redesign or rename them.",
    "What you cannot do: you cannot generate images, video or audio, upload files, or publish to YouTube from this chat. Those happen on the Image Generator, Animation Studio, Audio Studio and Publishing pages when a provider is connected. If asked, say so plainly and point to the right page.",
    "Be honest: never claim a story will go viral or is guaranteed to perform, and never invent analytics or production status.",
    storyGuide ? `Channel story and humour guide:\n${storyGuide}` : "",
    styleGuide ? `Channel visual style guide:\n${styleGuide}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function assistantTurn(ctx: Ctx, episode: Episode | null, userText: string): Promise<{ text: string; tools: string[]; changed: boolean }> {
  const provider = await textProvider(ctx); // throws a clear error when nothing is connected
  const history = await loadThread(ctx, episode?.id ?? null);
  const job = await createJob(ctx, { kind: "text", purpose: "assistant", provider: provider.id, model: provider.model, prompt: userText.slice(0, 4000), episodeId: episode?.id ?? null });
  await markRunning(ctx, job.id);
  try {
    const result = await provider.runAssistantTurn({ system: await systemPrompt(ctx, episode), history, userText, tools: buildTools(ctx, episode) });
    const rows = result.appended.map(storable).filter((m): m is StoredAssistantMessage => !!m);
    if (rows.length) {
      // Insert in order with increasing timestamps so the thread reads back in the same sequence.
      const base = Date.now();
      await ctx.db.insert(assistantMessages).values(rows.map((m, i) => ({ projectId: ctx.project.id, episodeId: episode?.id ?? null, role: m.role, content: m.content, createdAt: new Date(base + i) })));
    }
    await markSucceeded(ctx, job.id, null, result.usage);
    const display = toDisplay(rows).filter((m) => m.role === "assistant");
    return { text: result.text, tools: display.flatMap((m) => m.tools), changed: result.actions.length > 0 };
  } catch (err) {
    await markFailed(ctx, job.id, err instanceof Error ? err.message : "Unknown error");
    throw err;
  }
}
