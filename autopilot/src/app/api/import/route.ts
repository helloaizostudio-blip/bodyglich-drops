import { NextResponse } from "next/server";
import { z } from "zod";
import { importManualProduct } from "@/services/amazon/manual-import";
import { generatePinsForProduct } from "@/services/content-generation/pipeline";
import { listPins } from "@/database/repositories";
import { checkApiToken } from "@/utils/api-token";
import { audit } from "@/utils/audit";

/**
 * Token-protected import endpoint for adding products without the dashboard
 * (e.g. an assistant preparing products from links you send it).
 *
 *   POST /api/import
 *   Authorization: Bearer <IMPORT_API_TOKEN>
 *   { "products": [ { asin, title, category, affiliate_url, price, rating, review_count, ... } ],
 *     "createPins": true }
 *
 * Disabled unless IMPORT_API_TOKEN is set. Same validation and scoring as manual import;
 * created pins land in the approval queue (or are auto-approved only if you turned that on).
 */
const Body = z.object({
  products: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
  createPins: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const auth = checkApiToken(req);
  if (auth === "disabled") return NextResponse.json({ error: "import API disabled" }, { status: 404 });
  if (auth === "denied") {
    await audit("warn", "system", "import_api.denied", "Rejected import API call with a bad token");
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid body", detail: (err as Error).message }, { status: 400 });
  }

  const results: Record<string, unknown>[] = [];
  for (const raw of body.products) {
    try {
      const p = await importManualProduct(raw, "worker");
      let pins = 0;
      if (body.createPins && p.status !== "rejected" && (await listPins({ productId: p.id, limit: 1 })).length === 0) {
        try {
          pins = (await generatePinsForProduct(p.id, { actor: "worker" })).length;
        } catch (err) {
          results.push({ asin: p.asin, status: p.status, score: p.score, pins: 0, pinError: (err as Error).message });
          continue;
        }
      }
      results.push({ asin: p.asin, status: p.status, score: p.score, rejection: p.rejection_reasons, flags: p.flags, pins });
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : (err as Error).message;
      results.push({ asin: (raw as { asin?: string }).asin ?? null, error: msg });
    }
  }
  await audit("info", "system", "import_api.import", `Import API: ${results.length} products processed`, { details: results });
  return NextResponse.json({ results });
}
