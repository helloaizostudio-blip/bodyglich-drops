import { handler, ok } from "@/lib/api";
import { getIdea, saveIdea } from "@/lib/store";

export const runtime = "nodejs";

export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const idea = await getIdea(id);
  if (!idea) throw new Error("idea not found");
  idea.status = "rejected";
  await saveIdea(idea);
  return ok({ idea });
});
