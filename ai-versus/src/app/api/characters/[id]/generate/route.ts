import { handler, ok } from "@/lib/api";
import { generateSheet, type SheetKind } from "@/lib/pipeline/library";
import { loadSettings } from "@/lib/store";
import { CHARACTER_ORDER, type CharacterId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Generate a reference sheet with fal.ai (core 2x2, expressions 3x3, or views turnaround). */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!CHARACTER_ORDER.includes(id as CharacterId)) throw new Error("character not found");
  const { kind } = await req.json();
  if (!["core", "expressions", "views", "full"].includes(kind)) throw new Error("kind must be core, expressions, views or full");
  const c = await generateSheet(await loadSettings(), id as CharacterId, kind as SheetKind);
  return ok({ character: c });
});
