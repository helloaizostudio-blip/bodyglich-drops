import { handler, ok } from "@/lib/api";
import { enqueueRun } from "@/lib/queue";
import { getProject, saveProject } from "@/lib/store";
import { AUDIO_ROLES, CHARACTER_ORDER, STAGES, type AudioRole, type CharacterId, type StageName } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Regenerate part of a project. body (all optional):
 *  { from: StageName, rewriteLine: { characterId, note? }, revoice: AudioRole[], newBackground: boolean }
 */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const p = await getProject(id);
  if (!p) throw new Error("project not found");
  const b = await req.json().catch(() => ({}));
  const from = STAGES.includes(b.from) ? (b.from as StageName) : undefined;
  const rewriteLine =
    b.rewriteLine && CHARACTER_ORDER.includes(b.rewriteLine.characterId)
      ? { characterId: b.rewriteLine.characterId as CharacterId, note: b.rewriteLine.note ? String(b.rewriteLine.note).slice(0, 500) : undefined }
      : undefined;
  const revoice = Array.isArray(b.revoice) ? (b.revoice.filter((r: string) => AUDIO_ROLES.includes(r as AudioRole)) as AudioRole[]) : undefined;
  p.status = "queued";
  await saveProject(p);
  const jobId = await enqueueRun({ projectId: id, from, rewriteLine, revoice, newBackground: !!b.newBackground });
  return ok({ jobId });
});
