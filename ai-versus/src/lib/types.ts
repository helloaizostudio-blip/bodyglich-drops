// Shared domain types for the AI-versus video generator.

export const CHARACTER_ORDER = ["chatgpt", "claude", "gemini", "grok", "meta"] as const;
export type CharacterId = (typeof CHARACTER_ORDER)[number];

/** Expressions the renderer can use. The first four are required for animation. */
export const CORE_EXPRESSIONS = ["neutral", "talking", "blink", "surprised"] as const;
export const EXTENDED_EXPRESSIONS = ["happy", "sad", "angry", "confused", "thinking"] as const;
export const VIEW_NAMES = ["front", "side", "three_quarter"] as const;
export type CoreExpression = (typeof CORE_EXPRESSIONS)[number];
export type ExtendedExpression = (typeof EXTENDED_EXPRESSIONS)[number];
export type Expression = CoreExpression | ExtendedExpression;
export type ViewName = (typeof VIEW_NAMES)[number];

export type Mood = "calm" | "excited" | "smug" | "worried" | "cheerful" | "thoughtful";
export type ListenerReaction = "none" | "surprised" | "happy" | "confused";
export type Hazard = "water" | "fire" | "zombies" | "space" | "snow" | "sand" | "none";

export interface VoiceProfile {
  /** ElevenLabs voice id. */
  voiceId: string;
  voiceName: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}

export interface SpriteRef {
  /** storage key of a transparent PNG; every expression of a character shares the same canvas size */
  key: string;
  width: number;
  height: number;
}

export interface CharacterProfile {
  id: CharacterId;
  displayName: string;
  /** brand-ish primary color used for cards, captions, transitions */
  color: string;
  accent: string;
  textOnColor: string;
  personality: string;
  speakingStyle: string;
  /** Visual description used for any (re)generation; keeps the design permanent. */
  designPrompt: string;
  voice: VoiceProfile;
  /** aligned sprites keyed by expression */
  sprites: Partial<Record<Expression, SpriteRef>>;
  /** feet anchor in sprite pixels (bottom-centre of the body) */
  anchor?: { x: number; y: number; bodyHeight: number };
  /** worst body-overlap score between expression sprites after registration (1 = identical) */
  alignmentScore?: number;
  /** reference sheet images (storage keys) */
  sheets: { core?: string; expressions?: string; views?: string; uploads: string[]; bundledCoreHash?: string; bundledFullHash?: string };
  views: Partial<Record<ViewName, SpriteRef>>;
  locked: boolean;
  updatedAt: string;
}

export interface IdeaScores {
  visual: number;
  story: number;
  humor: number;
  clarity: number;
  overall: number;
}

export interface Idea {
  id: string;
  title: string;
  question: string;
  setting: string;
  visualHook: string;
  hazard: Hazard;
  scores: IdeaScores;
  rationale: string;
  source: "claude" | "manual";
  status: "proposed" | "approved" | "rejected";
  projectId?: string;
  createdAt: string;
}

export interface ScriptLine {
  characterId: CharacterId;
  /** Text sent to TTS (may contain ElevenLabs v3 audio tags like [excited]). */
  text: string;
  /** Plain caption text (no tags). */
  caption: string;
  emphasis: string[];
  mood: Mood;
  listenerReaction: ListenerReaction;
}

export interface Script {
  title: string;
  hookTop: string;
  hookBottom: string;
  narratorIntro: string;
  narratorOutro: string;
  endingCaption: string;
  environment: { prompt: string; hazard: Hazard; palette: string };
  lines: ScriptLine[];
  /** always shown on screen: these replies are fictional */
  disclaimer: string;
}

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export type AudioRole = "narrator_intro" | "narrator_outro" | CharacterId;
export const AUDIO_ROLES: AudioRole[] = ["narrator_intro", ...CHARACTER_ORDER, "narrator_outro"];

export interface AudioClip {
  role: AudioRole;
  /** processed (trimmed, normalised, tempo-fitted) wav */
  key: string;
  rawKey: string;
  /** ElevenLabs character alignment JSON for the raw file, when available */
  alignmentKey?: string;
  source: "elevenlabs" | "import";
  duration: number;
  words: WordTiming[];
  /** RMS envelope at the video fps, 0..1 */
  envelope: number[];
  alignment: "elevenlabs" | "estimated";
  text: string;
  voiceId: string;
  tempo: number;
}

export type StageName =
  | "script"
  | "characters"
  | "background"
  | "voices"
  | "timeline"
  | "render"
  | "qc"
  | "export";
export const STAGES: StageName[] = [
  "script",
  "characters",
  "background",
  "voices",
  "timeline",
  "render",
  "qc",
  "export",
];

export interface StageState {
  status: "pending" | "running" | "done" | "failed" | "skipped";
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  log: string[];
}

export type SceneKind = "intro" | "response" | "ending";

export interface Scene {
  index: number;
  kind: SceneKind;
  /** speaking character for response scenes */
  characterId?: CharacterId;
  audioRole: AudioRole;
  start: number;
  end: number;
  /** absolute time the voice starts / ends */
  voiceStart: number;
  voiceEnd: number;
  words: WordTiming[]; // absolute times
  emphasis: string[];
  mood: Mood;
  listenerReaction: ListenerReaction;
}

export interface Timeline {
  fps: number;
  width: number;
  height: number;
  duration: number;
  scenes: Scene[];
  seed: number;
}

export interface QcCheck {
  name: string;
  ok: boolean;
  detail: string;
  scene?: number;
}

export interface QcReport {
  ok: boolean;
  checks: QcCheck[];
  failedScenes: number[];
  checkedAt: string;
}

export interface CostEntry {
  provider: "anthropic" | "elevenlabs" | "fal";
  what: string;
  usd: number;
  at: string;
}

export interface Project {
  id: string;
  ideaId?: string;
  topic: string;
  slug: string;
  status: "queued" | "running" | "done" | "failed";
  stages: Record<StageName, StageState>;
  script?: Script;
  background?: { key: string; videoKey?: string; source: "fal" | "import" | "procedural"; procedural?: string };
  audio: Partial<Record<AudioRole, AudioClip>>;
  timeline?: Timeline;
  sceneRenders: Record<number, { key: string; frames: number; renderedAt: string; hash: string }>;
  renderedSprites?: Record<string, string[]>;
  mix?: { peak: number; dialogIntervals: [number, number][] };
  outputKey?: string;
  qc?: QcReport;
  costs: CostEntry[];
  attempts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  credentials: {
    anthropicApiKey: string;
    elevenLabsApiKey: string;
    falKey: string;
  };
  providers: {
    anthropicModel: string;
    elevenLabsModel: string;
    falImageModel: string;
    falEditModel: string;
    falBackgroundRemovalModel: string;
    falVideoModel: string;
    useImageToVideoBackground: boolean;
  };
  costLimits: {
    perVideoUsd: number;
    monthlyUsd: number;
    elevenLabsUsdPer1kChars: number;
    falImageUsd: number;
    falVideoUsd: number;
  };
  video: {
    width: number;
    height: number;
    fps: number;
    crf: number;
    preset: string;
    minDurationSec: number;
    maxDurationSec: number;
    music: boolean;
    musicVolumeDb: number;
    sfx: boolean;
    showDisclaimer: boolean;
  };
  language: {
    scriptLanguage: string;
    ttsLanguageCode: string;
  };
}
