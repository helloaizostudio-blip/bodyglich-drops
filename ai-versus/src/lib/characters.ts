import type { CharacterId, CharacterProfile, VoiceProfile } from "./types";

/**
 * Permanent character bible. These descriptions are reused for every (re)generation so the
 * designs never drift between topics. They are original mascots *inspired by* each assistant's
 * colour identity — no logos are reproduced.
 */
export const STYLE_PROMPT =
  "cute chibi 2D anime sticker art style, oversized head, tiny body, short stubby arms and legs, big expressive eyes, " +
  "rounded shapes, thick smooth outlines, soft cel shading, vibrant colors, NO text, NO letters, NO logos, NO watermark";

const voice = (voiceId: string, voiceName: string, o: Partial<VoiceProfile> = {}): VoiceProfile => ({
  voiceId,
  voiceName,
  stability: 0.45,
  similarityBoost: 0.8,
  style: 0.35,
  speed: 1.0,
  ...o,
});

/** Narrator voice is project-wide (not a character). */
export const NARRATOR_VOICE: VoiceProfile = voice("TX3LPaxmHKxFdv7VOQHJ", "Liam - Energetic, Social Media Creator", {
  style: 0.5,
});

type Seed = Omit<CharacterProfile, "sprites" | "sheets" | "views" | "locked" | "updatedAt" | "anchor">;

export const CHARACTER_SEEDS: Record<CharacterId, Seed> = {
  chatgpt: {
    id: "chatgpt",
    displayName: "ChatGPT",
    color: "#10A37F",
    accent: "#7CF5D9",
    textOnColor: "#FFFFFF",
    personality: "Friendly, confident, organised and helpful. Loves step-by-step plans and checklists.",
    speakingStyle: "Upbeat and structured: 'Step one... step two...'. Reassuring, a little over-prepared.",
    designPrompt:
      "a tiny adorable white and teal robot mascot with an oversized round white helmet head, a glossy black screen face with glowing teal eyes, " +
      "teal headphone ear-discs, a tiny body wearing a dark teal hoodie with a simple white speech-bubble emblem on the chest, short stubby arms and legs, small rounded hands and feet",
    voice: voice("iP95p4xoKVk53GoZ742B", "Chris - Charming, Down-to-Earth"),
  },
  claude: {
    id: "claude",
    displayName: "Claude",
    color: "#D97757",
    accent: "#FFD7B5",
    textOnColor: "#FFFFFF",
    personality: "Calm, gentle, thoughtful and caring. Checks on everyone first, then reasons carefully.",
    speakingStyle: "Soft, measured, kind. Asks a caring question, then gives a considered plan.",
    designPrompt:
      "a tiny gentle thoughtful chibi boy with an oversized head, fluffy wavy light-brown hair, big warm brown eyes, a cozy warm beige-cream hoodie " +
      "with a small hand-drawn orange spark doodle on the chest, black pants, cream sneakers, short stubby limbs, small hands",
    voice: voice("SAz9YHcvj6GT2YYXdXww", "River - Relaxed, Neutral, Informative", { stability: 0.6, style: 0.2 }),
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    color: "#5B6CFF",
    accent: "#C9A7FF",
    textOnColor: "#FFFFFF",
    personality: "Energetic, curious, fast. Instantly 'looks things up' and rattles off facts.",
    speakingStyle: "Quick, excited, fact-dense bursts. Lists data points, then a bright conclusion.",
    designPrompt:
      "a tiny energetic futuristic robot mascot, glossy white body with blue and violet glowing accents, oversized round head with small antenna nubs and blue-violet ear lights, " +
      "glossy dark navy screen face with big glowing blue-violet eyes, a small purple four-point sparkle star emblem on the chest, short stubby limbs, small rounded hands and feet",
    voice: voice("FGY2WhTYpPnrIDTdsKH5", "Laura - Enthusiast, Quirky Attitude", { speed: 1.08, style: 0.5 }),
  },
  grok: {
    id: "grok",
    displayName: "Grok",
    color: "#1A1A1F",
    accent: "#E6E6EA",
    textOnColor: "#FFFFFF",
    personality: "Mischievous, confident, sarcastic. Unexpected, funny answers with deadpan swagger.",
    speakingStyle: "Dry, smug one-liners and a punchline. Short sentences.",
    designPrompt:
      "a tiny mischievous confident chibi boy with an oversized head, spiky messy white hair, a sleek black eye mask showing bright white eyes, " +
      "a black oversized hoodie with a small silver lightning-bolt emblem, black pants and black boots, short stubby limbs",
    voice: voice("N2lVS1w4EtoT3dr4eOWO", "Callum - Husky Trickster", { style: 0.55 }),
  },
  meta: {
    id: "meta",
    displayName: "Meta AI",
    color: "#0866FF",
    accent: "#9CC2FF",
    textOnColor: "#FFFFFF",
    personality: "Friendly, social, expressive. Wants to share the moment with friends, then helps.",
    speakingStyle: "Bubbly and conversational, social-media flavoured, ends on a helpful note.",
    designPrompt:
      "a tiny friendly expressive chibi girl with an oversized head, glossy navy-black bob hair, big sparkling blue eyes, glowing blue-and-violet cat-ear headphones, " +
      "a white hoodie with a small blue wave doodle on the chest, navy shorts, white sneakers, short stubby limbs",
    voice: voice("cgSgspJ2msm6clMCkdW9", "Jessica - Playful, Bright, Warm"),
  },
};

export function defaultCharacter(id: CharacterId): CharacterProfile {
  return {
    ...CHARACTER_SEEDS[id],
    sprites: {},
    sheets: { uploads: [] },
    views: {},
    locked: false,
    updatedAt: new Date().toISOString(),
  };
}

/** Prompt for the 2x2 core animation sheet (neutral / talking / blink / surprised). */
export function coreSheetPrompt(c: Pick<CharacterProfile, "designPrompt">): string {
  return (
    `Character expression sheet, 2x2 grid of four equal panels on a plain flat pure white background, ${STYLE_PROMPT}. ` +
    "The SAME single character appears in all four panels at the EXACT same size, same full-body front-view standing pose, same position, centered in each panel, " +
    `arms relaxed at sides, feet at the same height. Character: ${c.designPrompt}. ` +
    "Panels: top-left = neutral friendly, eyes open, small closed smile; top-right = talking, identical but mouth wide open as if speaking; " +
    "bottom-left = blinking, identical to top-left but eyes closed; bottom-right = surprised worried reaction, eyes wide, small open 'o' mouth. Only the face changes between panels."
  );
}

/** Prompt for the 3x3 extended expression sheet. Order matches EXPRESSION_GRID below. */
export const EXPRESSION_GRID = [
  "happy",
  "sad",
  "angry",
  "confused",
  "surprised",
  "talking",
  "thinking",
  "neutral",
  "blink",
] as const;
export function expressionSheetPrompt(c: Pick<CharacterProfile, "designPrompt">): string {
  return (
    `Character expression reference sheet, 3x3 grid of nine equal panels on a plain flat pure white background, ${STYLE_PROMPT}. ` +
    `The SAME character in every panel, same size, same full-body front view, centered. Character: ${c.designPrompt}. ` +
    "Panels left-to-right, top-to-bottom: happy (big smile), sad (teary, frown), angry (furrowed brows, small anger mark), confused (tilted head, question mark), " +
    "surprised (wide eyes, 'o' mouth), talking (mouth open mid-speech), thinking (hand on chin, eyes up), neutral (calm smile), blinking (eyes closed)."
  );
}

export const VIEW_GRID = ["front", "three_quarter", "side"] as const;
export function viewSheetPrompt(c: Pick<CharacterProfile, "designPrompt">): string {
  return (
    `Character turnaround reference sheet, three equal panels side by side on a plain flat pure white background, ${STYLE_PROMPT}. ` +
    `The SAME character, same size and height in every panel, neutral standing pose. Character: ${c.designPrompt}. ` +
    "Panels left-to-right: front view, three-quarter view facing left, full side profile view facing left."
  );
}

/** Combined 4x3 sheet: nine expressions + three turnaround views. Order matches FULL_GRID. */
export const FULL_GRID = [
  "happy",
  "sad",
  "angry",
  "confused",
  "surprised",
  "talking",
  "thinking",
  "neutral",
  "blink",
  "front",
  "three_quarter",
  "side",
] as const;
export function fullSheetPrompt(c: Pick<CharacterProfile, "designPrompt">): string {
  return (
    `Character reference sheet, 4 columns x 3 rows grid of twelve equal panels on a plain flat pure white background, ${STYLE_PROMPT}, NO grid lines. ` +
    `The SAME character in every panel, same size, full body. Character: ${c.designPrompt}. ` +
    "Row 1: happy (big joyful smile), sad (teary frown), angry (furrowed brow, small anger mark), confused (tilted head, question mark). " +
    "Row 2: surprised (wide eyes, 'o' mouth), talking (mouth open), thinking (hand on chin, eyes up), neutral (calm smile). " +
    "Row 3: blinking (eyes closed), front view standing, three-quarter view facing left, full side profile view facing left."
  );
}
