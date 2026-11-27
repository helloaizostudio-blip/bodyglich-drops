import { resolveCredentials } from "../settings";
import type { Settings, VoiceProfile } from "../types";
import { stripTags } from "../audio/voice";

const BASE = "https://api.elevenlabs.io/v1";

function key(s: Settings) {
  const k = resolveCredentials(s).elevenLabsApiKey;
  if (!k) throw new Error("ElevenLabs API key missing: set ELEVENLABS_API_KEY or add it in Settings.");
  return k;
}

export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Models that understand inline audio tags such as [excited]. */
const TAG_MODELS = /eleven_v3|eleven_v4/;

/**
 * Text-to-speech with character-level timestamps (used for caption + mouth sync).
 * Returns MP3 bytes and the alignment.
 */
export async function synthesize(
  s: Settings,
  text: string,
  v: VoiceProfile,
): Promise<{ audio: Buffer; alignment: Alignment | null; chars: number }> {
  const model = s.providers.elevenLabsModel;
  const input = TAG_MODELS.test(model) ? text : stripTags(text);
  const res = await fetch(`${BASE}/text-to-speech/${encodeURIComponent(v.voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(s), "content-type": "application/json" },
    body: JSON.stringify({
      text: input,
      model_id: model,
      language_code: s.language.ttsLanguageCode || undefined,
      voice_settings: {
        stability: v.stability,
        similarity_boost: v.similarityBoost,
        style: v.style,
        speed: v.speed,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const j = (await res.json()) as { audio_base64: string; alignment?: Alignment; normalized_alignment?: Alignment };
  return { audio: Buffer.from(j.audio_base64, "base64"), alignment: j.alignment ?? j.normalized_alignment ?? null, chars: input.length };
}

export interface VoiceListing {
  voiceId: string;
  name: string;
  category: string;
  previewUrl: string | null;
  labels: Record<string, string>;
}

export async function listVoices(s: Settings): Promise<VoiceListing[]> {
  const res = await fetch(`${BASE}/voices`, { headers: { "xi-api-key": key(s) } });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { voices: any[] };
  return j.voices.map((v) => ({
    voiceId: v.voice_id,
    name: v.name,
    category: v.category,
    previewUrl: v.preview_url ?? null,
    labels: v.labels ?? {},
  }));
}
