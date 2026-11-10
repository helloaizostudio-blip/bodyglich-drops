"use server";

import { z } from "zod";
import { action, zId } from "@/server/action";
import { getEpisode } from "@/server/services/episodes";
import { assistantTurn, clearThread, threadForDisplay } from "@/server/services/assistant";
import { capabilityReady } from "@/server/providers/config";

const zEpisodeRef = z.object({ episodeId: zId.nullable() });

/** Opens the assistant panel: connection state, which episode it is working on, and the saved conversation. */
export const openAssistant = action(
  zEpisodeRef,
  async (input, ctx) => {
    const episode = input.episodeId ? await getEpisode(ctx, input.episodeId) : null;
    const [ready, messages] = await Promise.all([capabilityReady(ctx, "text"), threadForDisplay(ctx, episode?.id ?? null)]);
    return { ready, episode: episode ? { id: episode.id, number: episode.number, title: episode.title } : null, messages };
  },
  { revalidate: false },
);

export const askAssistant = action(z.object({ episodeId: zId.nullable(), message: z.string().trim().min(1, "Type a message").max(8000) }), async (input, ctx) => {
  const episode = input.episodeId ? await getEpisode(ctx, input.episodeId) : null;
  return assistantTurn(ctx, episode, input.message);
});

export const resetAssistant = action(
  zEpisodeRef,
  async (input, ctx) => {
    const episode = input.episodeId ? await getEpisode(ctx, input.episodeId) : null;
    await clearThread(ctx, episode?.id ?? null);
    return { ok: true };
  },
  { revalidate: false },
);
