import "server-only";
import { UserError } from "@/server/action";
import type { ResolvedProvider } from "./config";
import type { VoiceOption, VoiceProvider } from "./types";
import { providerFetch } from "./http";

/**
 * ElevenLabs adapter. Shapes follow the official ElevenLabs SDK:
 *   GET  /v1/voices                                   (header xi-api-key) → { voices: [{ voice_id, name, category }] }
 *   POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128   body { text, model_id } → audio/mpeg bytes
 */
// ELEVENLABS_BASE_URL selects a data-residency endpoint (e.g. https://api.eu.residency.elevenlabs.io) or a proxy.
const BASE = (process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(/\/+$/, "");

export function createElevenLabsProvider(resolved: ResolvedProvider): VoiceProvider {
  const headers = { "xi-api-key": resolved.apiKey };
  const model = resolved.config.model;
  return {
    id: "elevenlabs",
    model,
    async listVoices(): Promise<VoiceOption[]> {
      const res = await providerFetch("ElevenLabs", `${BASE}/v1/voices`, { headers, timeoutMs: 20_000 });
      const body = (await res.json()) as { voices?: { voice_id: string; name: string; category?: string }[] };
      return (body.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, category: v.category ?? "" }));
    },
    async synthesize({ text, voiceId }) {
      if (!voiceId.trim()) throw new UserError("This character has no ElevenLabs voice ID. Set one in their voice profile.");
      const res = await providerFetch("ElevenLabs", `${BASE}/v1/text-to-speech/${encodeURIComponent(voiceId.trim())}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: model }),
        timeoutMs: 120_000,
      });
      const data = Buffer.from(await res.arrayBuffer());
      if (!data.length) throw new UserError("ElevenLabs returned an empty audio file.");
      return { data, mimeType: "audio/mpeg" };
    },
  };
}

/** Free call: listing voices confirms the key works. */
export async function verifyElevenLabs(resolved: ResolvedProvider): Promise<void> {
  await providerFetch("ElevenLabs", `${BASE}/v1/voices`, { headers: { "xi-api-key": resolved.apiKey }, timeoutMs: 20_000 });
}
