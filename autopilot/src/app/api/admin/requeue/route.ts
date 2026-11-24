import { NextResponse } from "next/server";
import { checkApiToken } from "@/utils/api-token";
import { audit } from "@/utils/audit";
import { requeueUnconfirmed } from "@/services/scheduler/publisher";

/**
 * POST /api/admin/requeue  { "sentBefore": "<ISO date>" }
 * Authorization: Bearer <IMPORT_API_TOKEN>
 *
 * Re-sends pins that went to Zapier before `sentBefore` but were never confirmed —
 * for recovering after a Zap problem.
 */
export async function POST(req: Request) {
  const auth = checkApiToken(req);
  if (auth === "disabled") return NextResponse.json({ error: "admin API disabled" }, { status: 404 });
  if (auth === "denied") {
    await audit("warn", "system", "admin_api.denied", "Rejected requeue call with a bad token");
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { sentBefore?: string };
    if (!body.sentBefore) return NextResponse.json({ error: "sentBefore is required" }, { status: 400 });
    return NextResponse.json(await requeueUnconfirmed(body.sentBefore, "worker"));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
