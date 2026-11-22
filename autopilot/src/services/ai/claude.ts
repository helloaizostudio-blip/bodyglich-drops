import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { config } from "@/utils/config";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!config.claude.apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ apiKey: config.claude.apiKey, timeout: 120_000, maxRetries: 2 });
  return client;
}

export class ClaudeRefusalError extends Error {}

/**
 * Calls Claude with a JSON schema-constrained response and returns the parsed object.
 * Uses server-side refusal fallbacks so a policy decline on the primary model is
 * retried on a fallback model inside the same call.
 */
export async function generateStructured<T extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<T>> {
  const response = await getClient().beta.messages.parse({
    model: config.claude.model,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: { effort: opts.effort ?? "medium", format: zodOutputFormat(opts.schema) },
  });
  if (response.stop_reason === "refusal") {
    throw new ClaudeRefusalError("Claude declined to generate this content");
  }
  if (response.parsed_output === null || response.parsed_output === undefined) {
    throw new Error(`Claude returned no parsable output (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output as z.infer<T>;
}
