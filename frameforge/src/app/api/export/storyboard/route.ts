import type { NextRequest } from "next/server";
import { getCtx } from "@/server/auth";
import { getEpisode } from "@/server/services/episodes";
import { listScenes } from "@/server/services/scenes";
import { listCharacters } from "@/server/services/characters";

/** Machine-readable storyboard export (scenes, dialogue, prompts, asset links). */
export async function GET(req: NextRequest) {
  const ctx = await getCtx();
  if (!ctx) return Response.json({ error: "Signed out" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("episode") ?? "";
  const episode = await getEpisode(ctx, id);
  if (!episode) return Response.json({ error: "Episode not found" }, { status: 404 });
  const [scenes, characters] = await Promise.all([listScenes(ctx, episode.id), listCharacters(ctx)]);
  const name = (cid: string | null) => characters.find((c) => c.id === cid)?.name ?? null;
  const origin = req.nextUrl.origin;
  const file = (assetId: string | null) => (assetId ? `${origin}/api/files/${assetId}` : null);

  const body = {
    exportedAt: new Date().toISOString(),
    channel: ctx.project.channelName,
    episode: { number: episode.number, title: episode.title, logline: episode.logline, targetDurationSec: episode.targetDurationSec },
    totalDurationSec: scenes.reduce((s, x) => s + x.durationSec, 0),
    scenes: scenes.map((s) => ({
      number: s.position + 1,
      title: s.title,
      durationSec: s.durationSec,
      status: s.status,
      aspectRatio: s.aspectRatio,
      location: s.locationName ?? s.locationText,
      characters: s.characterIds.map(name).filter(Boolean),
      action: s.action,
      camera: s.camera,
      motion: s.motion,
      dialogue: s.lines.map((l) => ({ speaker: name(l.characterId) ?? (l.speaker || "Narrator"), text: l.text })),
      visualPrompt: s.visualPrompt,
      visualReference: file(s.visualAssetId),
      backgroundReference: file(s.backgroundAssetId),
      notes: s.notes,
    })),
  };
  const slug = episode.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "episode";
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="storyboard-ep${episode.number}-${slug}.json"` },
  });
}
