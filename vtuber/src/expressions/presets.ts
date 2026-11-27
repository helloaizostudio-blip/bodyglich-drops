/**
 * The app's emotion vocabulary, expressed as weights over VRM 1.0 preset
 * expressions (VRM 0.x models are auto-mapped by three-vrm: joy→happy,
 * sorrow→sad, fun→relaxed, etc.).
 *
 * If a model ships a *custom* expression whose name matches the emotion
 * (e.g. "excited", "confused", "laughing"), that clip is preferred.
 */
export const EXPRESSION_NAMES = [
  'neutral',
  'happy',
  'excited',
  'surprised',
  'confused',
  'sad',
  'angry',
  'laughing',
] as const;
export type ExpressionName = (typeof EXPRESSION_NAMES)[number];

export interface ExpressionPreset {
  label: string;
  emoji: string;
  /** VRM preset expression weights. */
  weights: Record<string, number>;
  /** Fallback weights when the primary ones aren't supported by the model. */
  fallback?: Record<string, number>;
  /** Head pose offset (radians) layered on top of idle motion. */
  head?: { x?: number; y?: number; z?: number };
  /** Procedural motion while the expression is active. */
  motion?: 'bounce' | 'laugh' | 'tilt' | 'droop' | 'shake';
  /** Auto-return to neutral after N seconds (one-shot reactions). */
  holdSeconds?: number;
}

export const EXPRESSIONS: Record<ExpressionName, ExpressionPreset> = {
  neutral: { label: 'Neutral', emoji: '😐', weights: {} },
  happy: { label: 'Happy', emoji: '😊', weights: { happy: 0.75 }, head: { z: 0.04, x: -0.02 } },
  excited: {
    label: 'Excited',
    emoji: '🤩',
    weights: { happy: 0.9, surprised: 0.3, aa: 0.15 },
    head: { x: -0.05 },
    motion: 'bounce',
  },
  surprised: {
    label: 'Surprised',
    emoji: '😲',
    weights: { surprised: 1 },
    head: { x: -0.08 },
    holdSeconds: 0,
  },
  confused: {
    label: 'Confused',
    emoji: '😕',
    weights: { sad: 0.25, surprised: 0.25, ih: 0.15 },
    fallback: { relaxed: 0.3 },
    head: { z: 0.16, y: 0.06 },
    motion: 'tilt',
  },
  sad: { label: 'Sad', emoji: '😢', weights: { sad: 1 }, head: { x: 0.1, z: -0.04 }, motion: 'droop' },
  angry: { label: 'Angry', emoji: '😠', weights: { angry: 1 }, head: { x: 0.06 }, motion: 'shake' },
  laughing: {
    label: 'Laughing',
    emoji: '😆',
    weights: { happy: 1, aa: 0.45 },
    head: { x: -0.1, z: 0.05 },
    motion: 'laugh',
  },
};

/** Mouth (viseme) presets driven by lip-sync. */
export const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'] as const;
export type Viseme = (typeof VISEMES)[number];

/** Emotion presets known to the VRM spec. */
export const VRM_EMOTION_PRESETS = ['happy', 'angry', 'sad', 'relaxed', 'surprised'] as const;
