import type { ProviderCapability } from "@/db/schema";

/**
 * Catalogue of provider adapters that ship with this build. This file is safe to import in
 * the browser — it contains no secrets, only descriptions and setup instructions.
 *
 * `verifiedFrom` records where the adapter's request shapes were taken from. No adapter in this
 * list has been exercised against a live, paid API by the developers of this build: each one stays
 * "Not connected" until the studio owner adds a key and the free verification call succeeds.
 */
export type ProviderConfigField = { key: string; label: string; hint?: string; default: string; options?: { value: string; label: string }[] };

export type ProviderDescriptor = {
  id: string;
  capability: ProviderCapability;
  name: string;
  vendor: string;
  description: string;
  /** Environment variable that can supply the key instead of saving it in Settings. */
  envVar: string;
  keyPlaceholder: string;
  docsUrl: string;
  keysUrl: string;
  verifiedFrom: string;
  billing: string;
  setup: string[];
  fields: ProviderConfigField[];
};

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: "anthropic",
    capability: "text",
    name: "Claude",
    vendor: "Anthropic",
    description: "Writes stories and scripts, reviews script quality, and powers the FRAMEFORGE assistant.",
    envVar: "ANTHROPIC_API_KEY",
    keyPlaceholder: "sk-ant-…",
    docsUrl: "https://platform.claude.com/docs",
    keysUrl: "https://platform.claude.com/settings/keys",
    verifiedFrom: "Official Anthropic TypeScript SDK (Messages API).",
    billing: "Pay-as-you-go per token on your Anthropic account. Verifying the key is free.",
    setup: [
      "Create an account at platform.claude.com and add billing credit.",
      "Open Settings → API keys and create a key.",
      "Paste the key here, save, then tap Verify.",
    ],
    fields: [
      {
        key: "model",
        label: "Model",
        default: "claude-opus-5-5",
        hint: "Opus writes the best stories. Sonnet and Haiku are faster and cheaper.",
        options: [
          { value: "claude-opus-5-5", label: "Claude Opus 5.5 (recommended)" },
          { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (faster, cheaper)" },
          { value: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest, cheapest)" },
          { value: "claude-fable-5-2", label: "Claude Fable 5.2 (most capable, highest cost)" },
        ],
      },
      {
        key: "effort",
        label: "Thinking effort",
        default: "medium",
        hint: "Higher effort thinks longer and costs more.",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
    ],
  },
  {
    id: "openai-images",
    capability: "image",
    name: "GPT Image",
    vendor: "OpenAI",
    description: "Generates character variations, expressions, environments, props, scene illustrations and thumbnails. Your original character references are sent along as image inputs.",
    envVar: "OPENAI_API_KEY",
    keyPlaceholder: "sk-…",
    docsUrl: "https://platform.openai.com/docs/guides/image-generation",
    keysUrl: "https://platform.openai.com/api-keys",
    verifiedFrom: "OpenAI's published OpenAPI specification (POST /v1/images/generations and /v1/images/edits).",
    billing: "Charged per image on your OpenAI account. Verifying the key is free.",
    setup: [
      "Create an API key at platform.openai.com (image models may require organisation verification).",
      "Paste the key here, save, then tap Verify.",
    ],
    fields: [
      {
        key: "model",
        label: "Model",
        default: "gpt-image-2.5-flare",
        options: [
          { value: "gpt-image-2.5-flare", label: "gpt-image-2.5-flare" },
          { value: "gpt-image-2.5-sunburst", label: "gpt-image-2.5-sunburst" },
          { value: "gpt-image-2", label: "gpt-image-2" },
          { value: "gpt-image-1.5", label: "gpt-image-1.5" },
          { value: "gpt-image-1-mini", label: "gpt-image-1-mini (cheapest)" },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        default: "medium",
        hint: "Higher quality costs more per image.",
        options: [
          { value: "low", label: "Low (drafts)" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
    ],
  },
  {
    id: "openai-sora",
    capability: "video",
    name: "Sora 2",
    vendor: "OpenAI",
    description: "Generates 4, 8 or 12 second animated clips from a prompt and an optional reference image.",
    envVar: "OPENAI_API_KEY",
    keyPlaceholder: "sk-…",
    docsUrl: "https://platform.openai.com/docs/guides/video-generation",
    keysUrl: "https://platform.openai.com/api-keys",
    verifiedFrom: "OpenAI's published OpenAPI specification (POST /v1/videos, GET /v1/videos/{id}, GET /v1/videos/{id}/content).",
    billing: "Charged per second of generated video on your OpenAI account. Verifying the key is free.",
    setup: [
      "Create an API key at platform.openai.com with access to the Sora video models.",
      "Paste the key here, save, then tap Verify.",
      "Supported output sizes: 1280x720 and 720x1280 (sora-2), plus 1792x1024 and 1024x1792 (sora-2-pro).",
    ],
    fields: [
      {
        key: "model",
        label: "Model",
        default: "sora-2",
        options: [
          { value: "sora-2", label: "sora-2" },
          { value: "sora-2-pro", label: "sora-2-pro (higher quality, higher cost)" },
        ],
      },
    ],
  },
  {
    id: "elevenlabs",
    capability: "voice",
    name: "ElevenLabs",
    vendor: "ElevenLabs",
    description: "Turns dialogue lines into voiceovers using the voice assigned to each character's voice profile.",
    envVar: "ELEVENLABS_API_KEY",
    keyPlaceholder: "sk_…",
    docsUrl: "https://elevenlabs.io/docs/api-reference/text-to-speech/convert",
    keysUrl: "https://elevenlabs.io/app/settings/api-keys",
    verifiedFrom: "Official ElevenLabs JavaScript SDK source (POST /v1/text-to-speech/{voice_id}, GET /v1/voices).",
    billing: "Uses characters from your ElevenLabs plan. Verifying the key is free.",
    setup: [
      "Create an API key in your ElevenLabs account settings.",
      "Paste the key here, save, then tap Verify.",
      "In Audio Studio, give each character a voice profile with an ElevenLabs voice ID. Only use voices you are authorised to use.",
    ],
    fields: [
      {
        key: "model",
        label: "Model",
        default: "eleven_multilingual_v2",
        options: [
          { value: "eleven_multilingual_v2", label: "eleven_multilingual_v2" },
          { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5 (faster)" },
          { value: "eleven_flash_v2_5", label: "eleven_flash_v2_5 (fastest)" },
        ],
      },
    ],
  },
];

export const CAPABILITY_LABELS: Record<ProviderCapability, { title: string; usedBy: string }> = {
  text: { title: "Text generation", usedBy: "Story Engine · Script review · AI assistant" },
  image: { title: "Image generation", usedBy: "Image generation workspace · Storyboard visuals" },
  video: { title: "Video generation", usedBy: "Animation Studio" },
  voice: { title: "Voice generation", usedBy: "Audio Studio" },
  render: { title: "Video rendering", usedBy: "Video Editor" },
  youtube: { title: "YouTube publishing", usedBy: "Publishing Center · Analytics" },
};

export const providersFor = (capability: ProviderCapability) => PROVIDERS.filter((p) => p.capability === capability);
export const providerById = (capability: ProviderCapability, id: string) => PROVIDERS.find((p) => p.capability === capability && p.id === id);
