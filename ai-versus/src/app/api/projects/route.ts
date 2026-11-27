import { handler, ok } from "@/lib/api";
import { listProjects } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const projects = (await listProjects()).map((p) => ({
    id: p.id,
    topic: p.topic,
    status: p.status,
    stages: Object.fromEntries(Object.entries(p.stages).map(([k, v]) => [k, v.status])),
    duration: p.timeline?.duration,
    qcOk: p.qc?.ok,
    outputKey: p.outputKey,
    spend: p.costs.reduce((a, c) => a + c.usd, 0),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  return ok({ projects });
});
