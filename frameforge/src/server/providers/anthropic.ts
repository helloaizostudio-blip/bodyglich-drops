import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { UserError } from "@/server/action";
import type { ResolvedProvider } from "./config";
/**
 * Always talk to Anthropic directly. Hosts such as Netlify inject ANTHROPIC_BASE_URL (their AI gateway),
 * which the SDK would otherwise pick up and send the user's own key to — and the gateway rejects it.
 * FRAMEFORGE_ANTHROPIC_BASE_URL is an explicit override for self-hosters.
 */
const BASE_URL = process.env.FRAMEFORGE_ANTHROPIC_BASE_URL || "https://api.anthropic.com";
import type { AssistantTool, TextProvider, TextUsage } from "./types";

type Effort = "low" | "medium" | "high";

/**
 * Server-side refusal fallback: if the chosen model declines a request for policy reasons the
 * API retries on its default fallback model inside the same call. Models without fallback
 * support simply ignore it.
 */
const fallback = (): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } => ({ betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });

function describe(err: unknown): UserError {
  if (err instanceof UserError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new UserError("Claude rejected the API key. Check it in Settings → AI providers.");
  if (err instanceof Anthropic.PermissionDeniedError) return new UserError("This API key is not allowed to use the selected Claude model.");
  if (err instanceof Anthropic.NotFoundError) return new UserError("The selected Claude model was not found for this account. Pick another model in Settings.");
  if (err instanceof Anthropic.RateLimitError) return new UserError("Claude is rate-limiting this key right now. Wait a moment and try again.");
  if (err instanceof Anthropic.BadRequestError) return new UserError(`Claude rejected the request: ${err.message}`);
  if (err instanceof Anthropic.APIConnectionError) return new UserError("Could not reach the Claude API. Check the server's network connection.");
  if (err instanceof Anthropic.APIError) return new UserError(`Claude API error${err.status ? ` (${err.status})` : ""}. Please try again.`);
  console.error("[anthropic] unexpected error", err);
  return new UserError("Text generation failed unexpectedly.");
}

function usageOf(message: Anthropic.Beta.BetaMessage): TextUsage {
  return { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, model: message.model };
}

function assertUsable(message: Anthropic.Beta.BetaMessage): void {
  if (message.stop_reason === "refusal") {
    throw new UserError("Claude declined this request. Try rephrasing the idea, or change the story details.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new UserError("The response was cut off because it was too long. Try a shorter target duration or regenerate one section at a time.");
  }
}

const textOf = (message: Anthropic.Beta.BetaMessage) =>
  message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

export function createAnthropicProvider(resolved: ResolvedProvider): TextProvider {
  const client = new Anthropic({ apiKey: resolved.apiKey, authToken: null, baseURL: BASE_URL, maxRetries: 2 });
  const model = resolved.config.model;
  const effort = (resolved.config.effort as Effort) ?? "medium";

  return {
    id: "anthropic",
    model,

    async generateText({ system, prompt, maxTokens = 16000 }) {
      try {
        // Streaming avoids HTTP timeouts on long scripts; finalMessage() collects the whole reply.
        const message = await client.beta.messages
          .stream({ model, max_tokens: maxTokens, system, output_config: { effort }, messages: [{ role: "user", content: prompt }], ...fallback() })
          .finalMessage();
        assertUsable(message);
        return { text: textOf(message), usage: usageOf(message) };
      } catch (err) {
        throw describe(err);
      }
    },

    async generateObject<T>({ system, prompt, schema, maxTokens = 32000 }: { system: string; prompt: string; schema: z.ZodType<T>; maxTokens?: number }) {
      try {
        const message = await client.beta.messages
          .stream({
            model,
            max_tokens: maxTokens,
            system,
            output_config: { effort, format: betaZodOutputFormat(schema) },
            messages: [{ role: "user", content: prompt }],
            ...fallback(),
          })
          .finalMessage();
        assertUsable(message);
        const parsed = schema.safeParse(message.parsed_output);
        if (!parsed.success) throw new UserError("Claude returned an answer in an unexpected format. Please try again.");
        return { data: parsed.data, usage: usageOf(message) };
      } catch (err) {
        throw describe(err);
      }
    },

    async runAssistantTurn({ system, history, userText, tools, maxSteps = 12 }) {
      const toolDefs: Anthropic.Beta.BetaToolUnion[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: z.toJSONSchema(t.input) as Anthropic.Beta.BetaTool.InputSchema,
      }));
      const messages: Anthropic.Beta.BetaMessageParam[] = [...(history as Anthropic.Beta.BetaMessageParam[]), { role: "user", content: userText }];
      const appended: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: userText }];
      const usage: TextUsage = { inputTokens: 0, outputTokens: 0, model };
      const actions: string[] = [];

      try {
        for (let step = 0; step < maxSteps; step++) {
          const message = await client.beta.messages
            .stream({
              model,
              max_tokens: 16000,
              // The system prompt is stable per episode, so cache it across the tool loop.
              system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
              output_config: { effort },
              tools: toolDefs,
              messages,
              ...fallback(),
            })
            .finalMessage();
          usage.inputTokens += message.usage.input_tokens;
          usage.outputTokens += message.usage.output_tokens;
          usage.model = message.model;

          // Keep the full content (thinking + tool_use blocks) so the next request stays valid.
          messages.push({ role: "assistant", content: message.content as Anthropic.Beta.BetaContentBlockParam[] });
          appended.push({ role: "assistant", content: message.content });

          if (message.stop_reason === "refusal") {
            return { appended, text: "I can't help with that request. Try asking in a different way.", usage, actions };
          }
          if (message.stop_reason === "pause_turn") continue;

          const calls = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          if (message.stop_reason !== "tool_use" || calls.length === 0) {
            return { appended, text: textOf(message) || "Done.", usage, actions };
          }

          // Run every requested tool and send all results back in ONE user message.
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const call of calls) {
            const tool = tools.find((t) => t.name === call.name) as AssistantTool | undefined;
            if (!tool) {
              results.push({ type: "tool_result", tool_use_id: call.id, content: `Unknown tool: ${call.name}`, is_error: true });
              continue;
            }
            const input = tool.input.safeParse(call.input);
            if (!input.success) {
              results.push({ type: "tool_result", tool_use_id: call.id, content: `Invalid input: ${input.error.issues[0]?.message ?? "validation failed"}`, is_error: true });
              continue;
            }
            try {
              const out = await tool.run(input.data);
              if (tool.mutates) actions.push(tool.name);
              results.push({ type: "tool_result", tool_use_id: call.id, content: out });
            } catch (err) {
              const msg = err instanceof UserError ? err.message : "The tool failed unexpectedly.";
              if (!(err instanceof UserError)) console.error(`[assistant tool ${call.name}]`, err);
              results.push({ type: "tool_result", tool_use_id: call.id, content: msg, is_error: true });
            }
          }
          messages.push({ role: "user", content: results });
          appended.push({ role: "user", content: results });
        }
        return { appended, text: "I stopped after several steps without finishing. Ask me to continue.", usage, actions };
      } catch (err) {
        throw describe(err);
      }
    },
  };
}

/** Free call that confirms the key works and the chosen model is available to it. */
export async function verifyAnthropic(resolved: ResolvedProvider): Promise<void> {
  const client = new Anthropic({ apiKey: resolved.apiKey, authToken: null, baseURL: BASE_URL, maxRetries: 1, timeout: 20_000 });
  try {
    await client.models.retrieve(resolved.config.model);
  } catch (err) {
    throw describe(err);
  }
}
