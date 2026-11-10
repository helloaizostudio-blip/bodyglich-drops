import { and, eq, inArray } from "drizzle-orm";
import { requireCtx } from "@/server/auth";
import { listCharacters } from "@/server/services/characters";
import { listJobs, failStaleJobs } from "@/server/services/jobs";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { listScenes } from "@/server/services/scenes";
import { originalReferencesFor } from "@/server/services/imagegen";
import { capabilityReady } from "@/server/providers/config";
import { imageProvider } from "@/server/providers";
import { assets, locations, promptTemplates, scenes, episodes } from "@/db/schema";
import { ASPECT_RATIOS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { ImageGenerator } from "./image-generator";

export const metadata = { title: "Image Generator" };
export const maxDuration = 300;

export default async function ImageGeneratorPage({ searchParams }: { searchParams: Promise<{ scene?: string; episode?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  await failStaleJobs(ctx);

  // When opened from a scene, generation is tied to that scene and its episode.
  const [sceneRow] = sp.scene
    ? await ctx.db
        .select({ scene: scenes, episode: episodes })
        .from(scenes)
        .innerJoin(episodes, eq(episodes.id, scenes.episodeId))
        .where(and(eq(scenes.id, sp.scene), eq(episodes.projectId, ctx.project.id)))
        .limit(1)
    : [];
  const { current, all } = await resolveCurrentEpisode(ctx, sceneRow?.episode.id ?? sp.episode);
  const sceneView = sceneRow ? (await listScenes(ctx, sceneRow.episode.id)).find((s) => s.id === sceneRow.scene.id) : undefined;

  const [characters, ready, jobs, locs, templates] = await Promise.all([
    listCharacters(ctx),
    capabilityReady(ctx, "image"),
    listJobs(ctx, { kinds: ["image"], limit: 24 }),
    ctx.db.select({ id: locations.id, name: locations.name }).from(locations).where(eq(locations.projectId, ctx.project.id)).orderBy(locations.name),
    ctx.db.select().from(promptTemplates).where(and(eq(promptTemplates.projectId, ctx.project.id), eq(promptTemplates.kind, "image"))),
  ]);
  const originals = await originalReferencesFor(ctx, characters.map((c) => c.id));
  const resultIds = jobs.map((j) => j.resultAssetId).filter((v): v is string => !!v);
  const results = resultIds.length ? await ctx.db.select().from(assets).where(inArray(assets.id, resultIds)) : [];
  let aspects: string[] = [...ASPECT_RATIOS];
  if (ready.ready) {
    try {
      aspects = (await imageProvider(ctx)).supportedAspectRatios();
    } catch {
      /* fall back to the full list */
    }
  }

  return (
    <>
      <PageHeader
        title="Image Generator"
        subtitle="Generate on-model visuals from your character references."
        actions={
          <LinkButton href="/assets" variant="secondary" size="sm">
            Back to Asset Library
          </LinkButton>
        }
      />
      <ImageGenerator
        ai={ready}
        aspects={aspects}
        cast={characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId, hasOriginal: originals.some((o) => o.characterId === c.id) }))}
        locations={locs}
        episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title }))}
        defaultEpisodeId={current?.id ?? null}
        scene={
          sceneView
            ? {
                id: sceneView.id,
                label: `Scene ${sceneView.position + 1}${sceneView.title ? ` · ${sceneView.title}` : ""}`,
                episodeId: sceneView.episodeId,
                prompt: sceneView.visualPrompt,
                aspectRatio: sceneView.aspectRatio,
                characterIds: sceneView.characterIds,
                backgroundAssetId: sceneView.backgroundAssetId,
                visualAssetId: sceneView.visualAssetId,
              }
            : null
        }
        jobs={jobs}
        results={results}
        templates={templates.map((t) => ({ id: t.id, name: t.name, body: t.body }))}
      />
    </>
  );
}
