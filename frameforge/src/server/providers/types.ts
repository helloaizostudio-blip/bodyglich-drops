import type { z } from "zod";

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export type TextUsage = { inputTokens: number; outputTokens: number; model: string };

export type AssistantTool<I = unknown> = {
  name: string;
  description: string;
  input: z.ZodType<I>;
  /** True when the tool changes studio data (reported back to the UI so it can refresh). */
  mutates?: boolean;
  run: (input: I) => Promise<string>;
};

export type StoredAssistantMessage = { role: "user" | "assistant"; content: unknown };

export interface TextProvider {
  readonly id: string;
  readonly model: string;
  generateText(req: { system: string; prompt: string; maxTokens?: number }): Promise<{ text: string; usage: TextUsage }>;
  generateObject<T>(req: { system: string; prompt: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<{ data: T; usage: TextUsage }>;
  /** One assistant turn with tool use. `history` and `appended` are provider-native message objects. */
  runAssistantTurn(req: {
    system: string;
    history: StoredAssistantMessage[];
    userText: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: AssistantTool<any>[];
    maxSteps?: number;
  }): Promise<{ appended: StoredAssistantMessage[]; text: string; usage: TextUsage; actions: string[] }>;
}

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */

export type BinaryInput = { data: Buffer; mimeType: string; name: string };

export interface ImageProvider {
  readonly id: string;
  readonly model: string;
  /** Aspect ratios this provider/model can produce, e.g. "16:9". */
  supportedAspectRatios(): string[];
  generate(req: { prompt: string; aspectRatio: string; references: BinaryInput[] }): Promise<{ data: Buffer; mimeType: string; width: number; height: number; usage?: Record<string, unknown> }>;
}

/* ------------------------------------------------------------------ */
/* Video                                                               */
/* ------------------------------------------------------------------ */

export type VideoJobState = { status: "queued" | "running" | "succeeded" | "failed"; progress: number | null; error: string | null };

export interface VideoProvider {
  readonly id: string;
  readonly model: string;
  supportedAspectRatios(): string[];
  supportedDurations(): number[];
  /** Output pixel size for an aspect ratio (reference images must be fitted to it). */
  outputSize(aspectRatio: string): { width: number; height: number };
  submit(req: { prompt: string; aspectRatio: string; seconds: number; reference?: BinaryInput }): Promise<{ externalId: string }>;
  poll(externalId: string): Promise<VideoJobState>;
  download(externalId: string): Promise<{ data: Buffer; mimeType: string }>;
}

/* ------------------------------------------------------------------ */
/* Voice                                                               */
/* ------------------------------------------------------------------ */

export type VoiceOption = { id: string; name: string; category: string };

export interface VoiceProvider {
  readonly id: string;
  readonly model: string;
  listVoices(): Promise<VoiceOption[]>;
  synthesize(req: { text: string; voiceId: string }): Promise<{ data: Buffer; mimeType: string }>;
}
