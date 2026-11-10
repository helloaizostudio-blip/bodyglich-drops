import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { generationJobs, type JobKind } from "@/db/schema";

export type UsageSummary = { kind: JobKind; jobs: number; succeeded: number; failed: number; inputTokens: number; outputTokens: number }[];

/** Totals of what was sent to providers in the last 30 days, from the job log. Token counts are reported by the provider. */
export async function textUsageSummary(ctx: Ctx): Promise<UsageSummary> {
  const since = new Date(Date.now() - 30 * 86400_000);
  const rows = await ctx.db
    .select({
      kind: generationJobs.kind,
      jobs: sql<number>`count(*)::int`,
      succeeded: sql<number>`count(*) filter (where ${generationJobs.status} = 'succeeded')::int`,
      failed: sql<number>`count(*) filter (where ${generationJobs.status} = 'failed')::int`,
      inputTokens: sql<number>`coalesce(sum((${generationJobs.usage}->>'inputTokens')::int), 0)::int`,
      outputTokens: sql<number>`coalesce(sum((${generationJobs.usage}->>'outputTokens')::int), 0)::int`,
    })
    .from(generationJobs)
    .where(and(eq(generationJobs.projectId, ctx.project.id), gte(generationJobs.createdAt, since)))
    .groupBy(generationJobs.kind);
  return rows;
}
