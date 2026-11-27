import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CHARACTER_SEEDS } from "../characters";
import { anthropicCost, assertBudget, recordCost } from "../costs";
import { resolveCredentials } from "../settings";
import { CHARACTER_ORDER, type CharacterId, type Idea, type Project, type Script, type ScriptLine, type Settings } from "../types";
import { stripTags } from "../audio/voice";

/**
 * Claude is the scriptwriting / orchestration engine. Every reply it writes is a *fictional,
 * comedic interpretation* of how each assistant might answer — never presented as a real output.
 */

function client(s: Settings) {
  const key = resolveCredentials(s).anthropicApiKey;
  if (!key) throw new Error("Anthropic API key missing: set ANTHROPIC_API_KEY or add it in Settings.");
  return new Anthropic({ apiKey: key });
}

const BANNED =
  /\b(superman|batman|spider-?man|iron ?man|avengers?|marvel|dc comics|superhero|super-hero|justice league|hulk|thor|captain america|wonder woman|movie clip|trailer)\b/i;

export function containsBannedContent(text: string): string | null {
  const m = text.match(BANNED);
  return m ? m[0] : null;
}

const HAZARDS = ["water", "fire", "zombies", "space", "snow", "sand", "none"] as const;
const MOODS = ["calm", "excited", "smug", "worried", "cheerful", "thoughtful"] as const;
const REACTIONS = ["none", "surprised", "happy", "confused"] as const;

const roster = CHARACTER_ORDER.map((id) => {
  const c = CHARACTER_SEEDS[id];
  return `- ${c.displayName} (id "${id}"): ${c.personality} Speaking style: ${c.speakingStyle}`;
}).join("\n");

const SYSTEM = `You are the head writer of a short-form animated comedy series: "What would different AIs do if...?".
Five tiny chibi mascots — original cartoon characters inspired by popular AI assistants — face the SAME situation, and each answers in its own personality.

Cast (always in this order):
${roster}

Rules:
- These are fictional, playful creative interpretations of how each assistant MIGHT respond. Never claim or imply they are real outputs of the products, and never quote real product output.
- Each answer must be meaningfully different: a different approach, priority or punchline. Never repeat another character's solution.
- Keep it family-friendly, kind and clever. Light teasing is fine; no insults about real companies or people, no politics.
- No superheroes, no movie or TV characters, no celebrities, no copyrighted characters, no other brands. The video ends after the last AI answers — do not write any extra ending scene.
- Everything must be understandable with zero context and fit a 30–50 second vertical video.`;

// ---------------------------------------------------------------------------------------------

const IdeaSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().describe("short catchy title, e.g. 'Flooding Elevator'"),
      question: z.string().describe("the full 'What would five AIs do if...?' question"),
      setting: z.string().describe("one-sentence description of the single environment all five are in"),
      visualHook: z.string().describe("what makes the first frame instantly readable and visually interesting"),
      hazard: z.enum(HAZARDS),
      visual: z.number().int().describe("1-10 visual potential"),
      story: z.number().int().describe("1-10 storytelling potential: room for five distinct answers"),
      humor: z.number().int().describe("1-10 comedic potential"),
      clarity: z.number().int().describe("1-10 how instantly the premise is understood"),
      rationale: z.string().describe("one sentence on why this works"),
    }),
  ),
});

export async function generateIdeas(s: Settings, opts: { count?: number; avoid?: string[]; theme?: string } = {}) {
  const count = opts.count ?? 10;
  await assertBudget(null, s, 0.05, "idea generation");
  const res = await client(s).beta.messages.parse({
    model: s.providers.anthropicModel,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(IdeaSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Propose ${count} fresh situations for new episodes. Mix survival, absurd, sci-fi and everyday-chaos scenarios. ` +
          `Each must take place in ONE visually distinctive environment that can be drawn as a single background, with all five characters present. ` +
          `Score honestly (not everything is a 9).` +
          (opts.theme ? `\nTheme request from the producer: ${opts.theme}` : "") +
          (opts.avoid?.length ? `\nAvoid repeating these existing topics:\n${opts.avoid.map((a) => `- ${a}`).join("\n")}` : "") +
          `\nWrite in ${s.language.scriptLanguage}.`,
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to generate ideas.");
  const out = res.parsed_output;
  if (!out) throw new Error("Idea generation returned unparseable output.");
  const cost = anthropicCost(s.providers.anthropicModel, res.usage.input_tokens, res.usage.output_tokens);
  const now = new Date().toISOString();
  const ideas: Idea[] = out.ideas
    .filter((i) => !containsBannedContent(`${i.title} ${i.question} ${i.setting}`))
    .map((i) => {
      const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
      const scores = { visual: clamp(i.visual), story: clamp(i.story), humor: clamp(i.humor), clarity: clamp(i.clarity), overall: 0 };
      scores.overall = Math.round(((scores.visual * 0.3 + scores.story * 0.25 + scores.humor * 0.25 + scores.clarity * 0.2) * 10)) / 10;
      return {
        id: crypto.randomUUID(),
        title: i.title,
        question: i.question,
        setting: i.setting,
        visualHook: i.visualHook,
        hazard: i.hazard,
        scores,
        rationale: i.rationale,
        source: "claude" as const,
        status: "proposed" as const,
        createdAt: now,
      };
    });
  return { ideas, costUsd: cost };
}

// ---------------------------------------------------------------------------------------------

const LineSchema = z.object({
  characterId: z.enum(CHARACTER_ORDER),
  text: z
    .string()
    .describe("spoken line, 12-20 words, may start with ONE ElevenLabs v3 delivery tag like [excited] or [sarcastic]"),
  emphasis: z.array(z.string()).describe("1-3 exact words from the line to highlight in captions"),
  mood: z.enum(MOODS),
  listenerReaction: z.enum(REACTIONS).describe("how the other four react while this one talks"),
});

const ScriptSchema = z.object({
  title: z.string(),
  hookTop: z.string().describe("on-screen title line 1, max 5 words, e.g. 'WHAT WOULD 5 AIs DO'"),
  hookBottom: z.string().describe("on-screen title line 2, max 9 words, e.g. 'IF THEY WERE TRAPPED IN A FLOODING ELEVATOR?'"),
  narratorIntro: z
    .string()
    .describe("narrator opening, 12-20 words, must set the scene and end with the question; may start with one delivery tag"),
  environmentPrompt: z
    .string()
    .describe(
      "detailed image prompt for the single 9:16 background: the environment only, NO characters, NO people, NO text; open floor space in the lower middle for small characters",
    ),
  hazard: z.enum(HAZARDS),
  palette: z.string().describe("2-4 dominant colors of the environment"),
  lines: z.array(LineSchema).describe("exactly five lines, in cast order"),
  narratorOutro: z.string().describe("short closing question, max 8 words, e.g. 'So... which AI had the best answer?'"),
  endingCaption: z.string().describe("on-screen ending caption, max 7 words, e.g. 'WHICH AI HAD THE BEST ANSWER?'"),
});

const DISCLAIMER = "Fictional parody · not real AI outputs";

function toScript(o: z.infer<typeof ScriptSchema>): Script {
  const byId = new Map(o.lines.map((l) => [l.characterId, l]));
  const lines: ScriptLine[] = CHARACTER_ORDER.map((id) => {
    const l = byId.get(id);
    if (!l) throw new Error(`Script is missing a line for ${id}`);
    return { ...l, caption: stripTags(l.text) };
  });
  return {
    title: o.title,
    hookTop: o.hookTop,
    hookBottom: o.hookBottom,
    narratorIntro: o.narratorIntro,
    narratorOutro: o.narratorOutro,
    endingCaption: o.endingCaption,
    environment: { prompt: o.environmentPrompt, hazard: o.hazard, palette: o.palette },
    lines,
    disclaimer: DISCLAIMER,
  };
}

export function validateScript(sc: Script): string[] {
  const problems: string[] = [];
  const words = (t: string) => stripTags(t).split(/\s+/).filter(Boolean).length;
  if (sc.lines.length !== 5) problems.push("script must have exactly five lines");
  CHARACTER_ORDER.forEach((id, i) => {
    if (sc.lines[i]?.characterId !== id) problems.push(`line ${i + 1} must be ${id}`);
  });
  for (const l of sc.lines) {
    const n = words(l.text);
    if (n < 6 || n > 30) problems.push(`${l.characterId} line has ${n} words (6-30 allowed)`);
  }
  const total = words(sc.narratorIntro) + words(sc.narratorOutro) + sc.lines.reduce((a, l) => a + words(l.text), 0);
  if (total > 150) problems.push(`script has ${total} words; too long for 50 seconds`);
  const all = [sc.title, sc.hookTop, sc.hookBottom, sc.narratorIntro, sc.narratorOutro, sc.endingCaption, ...sc.lines.map((l) => l.text)].join(" ");
  const banned = containsBannedContent(all);
  if (banned) problems.push(`script mentions banned content: "${banned}"`);
  return problems;
}

export async function generateScript(s: Settings, project: Project, idea: { question: string; setting: string; hazard?: string }) {
  await assertBudget(project, s, 0.08, "script generation");
  const c = client(s);
  let feedback = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await c.beta.messages.parse({
      model: s.providers.anthropicModel,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(ScriptSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content:
            `Write the complete script for this episode.\nQuestion: ${idea.question}\nSetting: ${idea.setting}\n` +
            (idea.hazard ? `Hazard type: ${idea.hazard}\n` : "") +
            `Structure: narrator intro (all five visible) -> ChatGPT -> Claude -> Gemini -> Grok -> Meta AI -> narrator outro question. ` +
            `Grok may be sarcastic or absurd. Total spoken words should be about 110-125. Write in ${s.language.scriptLanguage}.` +
            feedback,
        },
      ],
    });
    recordCost(project, {
      provider: "anthropic",
      what: `script attempt ${attempt + 1}`,
      usd: anthropicCost(s.providers.anthropicModel, res.usage.input_tokens, res.usage.output_tokens),
    });
    if (res.stop_reason === "refusal") throw new Error("Claude declined to write this script; pick another topic.");
    if (!res.parsed_output) {
      feedback = "\nYour previous answer could not be parsed. Follow the schema exactly.";
      continue;
    }
    const script = toScript(res.parsed_output);
    const problems = validateScript(script);
    if (!problems.length) return script;
    feedback = `\nYour previous draft had problems; fix them:\n${problems.map((p) => `- ${p}`).join("\n")}`;
  }
  throw new Error(`Script failed validation after 3 attempts${feedback}`);
}

/** Rewrite one character's answer while keeping the rest of the script. */
export async function regenerateLine(s: Settings, project: Project, characterId: CharacterId, note?: string): Promise<ScriptLine> {
  const sc = project.script;
  if (!sc) throw new Error("project has no script yet");
  await assertBudget(project, s, 0.03, "line rewrite");
  const others = sc.lines
    .filter((l) => l.characterId !== characterId)
    .map((l) => `${CHARACTER_SEEDS[l.characterId].displayName}: ${l.caption}`)
    .join("\n");
  const res = await client(s).beta.messages.parse({
    model: s.providers.anthropicModel,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(LineSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Episode: ${project.topic}\nNarrator: ${stripTags(sc.narratorIntro)}\nThe other answers are:\n${others}\n\n` +
          `Write a NEW answer for ${CHARACTER_SEEDS[characterId].displayName} (characterId "${characterId}") that is different from all of the above and from its previous answer: "${sc.lines.find((l) => l.characterId === characterId)?.caption}".` +
          (note ? `\nProducer note: ${note}` : ""),
      },
    ],
  });
  recordCost(project, {
    provider: "anthropic",
    what: `rewrite ${characterId}`,
    usd: anthropicCost(s.providers.anthropicModel, res.usage.input_tokens, res.usage.output_tokens),
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("line rewrite failed");
  const l = res.parsed_output;
  if (containsBannedContent(l.text)) throw new Error("rewrite contained banned content");
  return { ...l, characterId, caption: stripTags(l.text) };
}
