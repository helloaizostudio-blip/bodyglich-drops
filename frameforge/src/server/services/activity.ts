import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { activity } from "@/db/schema";

export async function logActivity(ctx: Ctx, type: string, message: string, href?: string) {
  await ctx.db.insert(activity).values({ projectId: ctx.project.id, type, message, href });
}

export async function recentActivity(ctx: Ctx, limit = 8) {
  return ctx.db
    .select()
    .from(activity)
    .where(eq(activity.projectId, ctx.project.id))
    .orderBy(desc(activity.createdAt))
    .limit(limit);
}
