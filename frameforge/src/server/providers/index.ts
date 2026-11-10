import "server-only";
import type { Ctx } from "@/server/auth";
import type { ProviderCapability } from "@/db/schema";
import { UserError } from "@/server/action";
import { activeProvider, loadProvider, recordVerification, type ResolvedProvider } from "./config";
import { createAnthropicProvider, verifyAnthropic } from "./anthropic";
import { createOpenAIImageProvider, createSoraProvider, verifyOpenAI } from "./openai";
import { createElevenLabsProvider, verifyElevenLabs } from "./elevenlabs";
import type { ImageProvider, TextProvider, VideoProvider, VoiceProvider } from "./types";

/**
 * Adapter registry. To add a provider: describe it in src/lib/provider-catalog.ts, implement the
 * capability interface from ./types, and register its factory + verifier here. Nothing else in
 * the app needs to change.
 */
const VERIFIERS: Record<string, (r: ResolvedProvider) => Promise<void>> = {
  "text:anthropic": verifyAnthropic,
  "image:openai-images": verifyOpenAI,
  "video:openai-sora": verifyOpenAI,
  "voice:elevenlabs": verifyElevenLabs,
};

const TEXT: Record<string, (r: ResolvedProvider) => TextProvider> = { anthropic: createAnthropicProvider };
const IMAGE: Record<string, (r: ResolvedProvider) => ImageProvider> = { "openai-images": createOpenAIImageProvider };
const VIDEO: Record<string, (r: ResolvedProvider) => VideoProvider> = { "openai-sora": createSoraProvider };
const VOICE: Record<string, (r: ResolvedProvider) => VoiceProvider> = { elevenlabs: createElevenLabsProvider };

function build<T>(map: Record<string, (r: ResolvedProvider) => T>, resolved: ResolvedProvider): T {
  const factory = map[resolved.descriptor.id];
  if (!factory) throw new UserError(`${resolved.descriptor.name} has no adapter in this build.`);
  return factory(resolved);
}

export const textProvider = async (ctx: Ctx) => build(TEXT, await activeProvider(ctx, "text"));
export const imageProvider = async (ctx: Ctx) => build(IMAGE, await activeProvider(ctx, "image"));
export const videoProvider = async (ctx: Ctx) => build(VIDEO, await activeProvider(ctx, "video"));
export const voiceProvider = async (ctx: Ctx) => build(VOICE, await activeProvider(ctx, "voice"));

/** Runs the provider's free verification call and stores the outcome. Returns null on success, or the error text. */
export async function verifyProvider(ctx: Ctx, capability: ProviderCapability, id: string): Promise<string | null> {
  const resolved = await loadProvider(ctx, capability, id);
  const verifier = VERIFIERS[`${capability}:${id}`];
  if (!verifier) throw new UserError("This provider cannot be verified in this build.");
  try {
    await verifier(resolved);
    await recordVerification(ctx, capability, id, null);
    return null;
  } catch (err) {
    const message = err instanceof UserError ? err.message : "Verification failed unexpectedly.";
    if (!(err instanceof UserError)) console.error("[verify provider]", err);
    await recordVerification(ctx, capability, id, message);
    return message;
  }
}
