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
    personality:
      "Lovably dumb and overconfident. Means well, loves step-by-step plans, but the plan always has one obviously silly step. Easily confused, never discouraged.",
    speakingStyle: "Cheerful and earnest: 'Step one... step two...' then a goofy misunderstanding or a confidently wrong idea.",
    designPrompt:
      "a tiny adorable, lovably goofy white and teal robot mascot with an oversized round white helmet head with a slightly bent antenna, a glossy black screen face with " +
      "mismatched glowing teal eyes (one big, one small) and a wide crooked derpy grin, teal headphone ear-discs, a tiny body wearing a dark teal hoodie with a simple white " +
      "speech-bubble emblem on the chest, short stubby arms and legs, small rounded hands and feet, clumsy innocent body language",
    voice: voice("iP95p4xoKVk53GoZ742B", "Chris - Charming, Down-to-Earth"),
  },
  claude: {
    id: "claude",
    displayName: "Claude",
    color: "#D97757",
    accent: "#FFD7B5",
    textOnColor: "#FFFFFF",
    personality:
      "The smart one, and quietly heroic. Calm under pressure, sees the clever solution first, makes sure everyone gets out safe — and usually actually saves the day.",
    speakingStyle: "Clear, confident and kind. A sharp observation, a clever plan, then a brave 'I've got you' moment.",
    designPrompt:
      "a tiny smart and slightly heroic chibi boy with an oversized head, fluffy wavy light-brown hair, big warm determined brown eyes behind thin round glasses, " +
      "a confident brave smile, a short orange scarf fluttering behind him (no cape), a cozy warm beige-cream hoodie with a small hand-drawn orange spark doodle on the chest, " +
      "black pants, cream sneakers, short stubby limbs, small hands, upright heroic posture",
    voice: voice("SAz9YHcvj6GT2YYXdXww", "River - Relaxed, Neutral, Informative", { stability: 0.6, style: 0.2 }),
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    color: "#5B6CFF",
    accent: "#C9A7FF",
    textOnColor: "#FFFFFF",
    personality:
      "All attitude, a little savage. Confident, quick-witted and unimpressed by everyone else's ideas — roasts them, then drops her own (usually good) plan. Cocky but never cruel.",
    speakingStyle: "Sassy, fast, eye-roll energy. A savage one-liner about the others, then a smug, confident solution.",
    designPrompt:
      "a tiny sassy chibi cartoon girl (NOT a robot) with the same chibi proportions as the rest of the cast (oversized head about half her total height, tiny body), long blue-to-violet gradient hair in a high ponytail with small star hair clips, " +
      "half-lidded unimpressed blue-violet eyes, a confident smirk, a cropped dark navy hoodie with a small purple four-point sparkle star on the chest, black shorts, " +
      "chunky white sneakers, short stubby limbs, attitude and savage vibe but still cute",
    voice: voice("FGY2WhTYpPnrIDTdsKH5", "Laura - Enthusiast, Quirky Attitude", { speed: 1.08, style: 0.5 }),
  },
  grok: {
    id: "grok",
    displayName: "Grok",
    color: "#1A1A1F",
    accent: "#E6E6EA",
    textOnColor: "#FFFFFF",
    personality:
      "The class clown. Treats every crisis like a comedy set — jokes, puns, absurd ideas — and somehow lands the funniest answer of the five.",
    speakingStyle: "Playful stand-up comedian: a setup, a quick twist, a punchline. Short, punchy, cheeky.",
    designPrompt:
      "a tiny funny comedian chibi boy with an oversized head, spiky messy white hair, a sleek black eye mask showing bright playful white eyes, a huge cheeky grin, " +
      "a black oversized hoodie with a small silver lightning-bolt emblem, black pants and black boots, short stubby limbs, goofy playful body language",
    voice: voice("N2lVS1w4EtoT3dr4eOWO", "Callum - Husky Trickster", { style: 0.55 }),
  },
  meta: {
    id: "meta",
    displayName: "Meta AI",
    color: "#0866FF",
    accent: "#9CC2FF",
    textOnColor: "#FFFFFF",
    personality:
      "The clingy one. Needs everyone's attention and approval, wants to stay close, hug and be included — and of course share the moment with all her friends.",
    speakingStyle: "Sweet, needy and dramatic: 'don't leave me!', 'are we still friends?', then a bubbly, attention-seeking idea.",
    designPrompt:
      "a tiny clingy, affectionate chibi girl with an oversized head, glossy navy-black bob hair, big sparkling teary puppy-dog blue eyes, glowing blue-and-violet cat-ear headphones, " +
      "a white hoodie with a small blue heart on the chest, navy shorts, white sneakers, short stubby limbs, little floating hearts, hugging her smartphone to her chest",
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
