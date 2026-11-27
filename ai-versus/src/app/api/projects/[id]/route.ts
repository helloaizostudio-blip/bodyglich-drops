import { handler, ok } from "@/lib/api";
import { getProject } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const p = await getProject(id);
  if (!p) throw new Error("project not found");
  // envelopes are large; the dashboard only needs a summary
  const audio = Object.fromEntries(
    Object.entries(p.audio).map(([k, c]) => [k, c && { ...c, envelope: undefined, envelopeFrames: c.envelope.length }]),
  );
  return ok({ project: { ...p, audio } });
});
