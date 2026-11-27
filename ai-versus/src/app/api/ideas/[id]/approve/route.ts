import { handler, ok } from "@/lib/api";
import { newProject } from "@/lib/pipeline/run";
import { enqueueRun } from "@/lib/queue";
import { getIdea, saveIdea, saveProject } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Approving a topic is the only manual step: it creates the project and queues the full pipeline. */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const idea = await getIdea(id);
  if (!idea) throw new Error("idea not found");
  if (idea.projectId) return ok({ projectId: idea.projectId, already: true });
  const p = newProject(idea.question, idea.id);
  await saveProject(p);
  idea.status = "approved";
  idea.projectId = p.id;
  await saveIdea(idea);
  const jobId = await enqueueRun({ projectId: p.id });
  return ok({ projectId: p.id, jobId });
});
