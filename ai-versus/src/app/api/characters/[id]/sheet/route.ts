import fs from "node:fs";
import path from "node:path";
import { handler, ok } from "@/lib/api";
import { getCharacter, importSheet, type SheetKind } from "@/lib/pipeline/library";
import { DATA_DIR, getStore, saveCharacter } from "@/lib/store";
import { CHARACTER_ORDER, type CharacterId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Upload a reference sheet. multipart form: file, kind = core | expressions | views | reference.
 * core/expressions/views are sliced into sprites; "reference" is stored as a style/identity reference
 * for future generations.
 */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!CHARACTER_ORDER.includes(id as CharacterId)) throw new Error("character not found");
  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "reference");
  if (!(file instanceof File)) throw new Error("missing file");
  if (file.size > 25 * 1024 * 1024) throw new Error("file too large (25 MB max)");
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("upload a PNG, JPEG or WebP image");
  const tmp = path.join(DATA_DIR, "tmp", `${id}-${Date.now()}${path.extname(file.name) || ".png"}`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));
  if (kind === "core" || kind === "expressions" || kind === "views" || kind === "full") {
    const c = await importSheet(id as CharacterId, tmp, kind as SheetKind);
    return ok({ character: c });
  }
  const c = await getCharacter(id as CharacterId);
  const key = `characters/${id}/uploads/${Date.now()}-${path.basename(tmp)}`;
  await getStore().putFile(key, tmp);
  c.sheets.uploads.push(key);
  await saveCharacter(c);
  return ok({ character: c });
});
