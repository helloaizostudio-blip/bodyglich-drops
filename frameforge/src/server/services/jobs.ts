import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { generationJobs, type GenerationJob, type JobKind, type JobStatus } from "@/db/schema";

/**
 * Generation / render job tracking. Every AI generation and every video render is a row here,
 * so the UI can show honest queue status and nothing is ever reported as done unless it is.
 */
export async function createJob(
  ctx: Ctx,
  input: {
    kind: JobKind;
    purpose?: string;
    provider: string;
    model?: string;
    prompt?: string;
    params?: Record<string, unknown>;
    episodeId?: string | null;
    sceneId?: string | null;
    characterId?: string | null;
  },
): Promise<GenerationJob> {
  const [job] = await ctx.db
    .insert(generationJobs)
    .values({
      projectId: ctx.project.id,
      kind: input.kind,
      purpose: input.purpose ?? "",
      provider: input.provider,
      model: input.model ?? "",
      prompt: input.prompt ?? "",
      params: input.params ?? {},
      episodeId: input.episodeId ?? null,
      sceneId: input.sceneId ?? null,
      characterId: input.characterId ?? null,
    })
    .returning();
  return job;
}

export async function updateJob(
  ctx: Ctx,
  id: string,
  patch: Partial<Pick<GenerationJob, "status" | "progress" | "error" | "resultAssetId" | "externalId" | "usage" | "startedAt" | "finishedAt">>,
): Promise<void> {
  await ctx.db
    .update(generationJobs)
    .set(patch)
    .where(and(eq(generationJobs.id, id), eq(generationJobs.projectId, ctx.project.id)));
}

export const markRunning = (ctx: Ctx, id: string) => updateJob(ctx, id, { status: "running", startedAt: new Date(), progress: 0 });
export const markSucceeded = (ctx: Ctx, id: string, resultAssetId?: string | null, usage?: Record<string, unknown>) =>
  updateJob(ctx, id, { status: "succeeded", finishedAt: new Date(), progress: 1, resultAssetId: resultAssetId ?? null, usage });
export const markFailed = (ctx: Ctx, id: string, error: string) =>
  updateJob(ctx, id, { status: "failed", finishedAt: new Date(), error: error.slice(0, 2000) });

export async function getJob(ctx: Ctx, id: string): Promise<GenerationJob | null> {
  const [row] = await ctx.db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, id), eq(generationJobs.projectId, ctx.project.id)))
    .limit(1);
  return row ?? null;
}

export async function listJobs(
  ctx: Ctx,
  f: { kinds?: JobKind[]; episodeId?: string; sceneId?: string; statuses?: JobStatus[]; limit?: number } = {},
): Promise<GenerationJob[]> {
  const where = [eq(generationJobs.projectId, ctx.project.id)];
  if (f.kinds?.length) where.push(inArray(generationJobs.kind, f.kinds));
  if (f.episodeId) where.push(eq(generationJobs.episodeId, f.episodeId));
  if (f.sceneId) where.push(eq(generationJobs.sceneId, f.sceneId));
  if (f.statuses?.length) where.push(inArray(generationJobs.status, f.statuses));
  return ctx.db
    .select()
    .from(generationJobs)
    .where(and(...where))
    .orderBy(desc(generationJobs.createdAt))
    .limit(f.limit ?? 50);
}

/** How long a job of each kind may stay queued/running before it is considered lost. */
const STALE_MINUTES: Record<JobKind, number> = { text: 30, image: 30, voice: 30, video: 180, render: 360 };

/**
 * Jobs run inside the server process (or at a provider). If the process restarted mid-job, the row
 * would stay "running" forever — so anything active for longer than its kind's limit is reported as failed.
 */
export async function failStaleJobs(ctx: Ctx, _legacyMinutes?: number): Promise<void> {
  void _legacyMinutes;
  const active = await listJobs(ctx, { statuses: ["queued", "running"], limit: 100 });
  for (const j of active) {
    const since = (j.startedAt ?? j.createdAt).getTime();
    if (since < Date.now() - STALE_MINUTES[j.kind] * 60_000) {
      await markFailed(ctx, j.id, "The job was interrupted (server restarted or timed out). Please run it again.");
    }
  }
}
