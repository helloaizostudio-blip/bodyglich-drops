import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  coreSheetPrompt,
  FULL_GRID,
  fullSheetPrompt,
  defaultCharacter,
  EXPRESSION_GRID,
  expressionSheetPrompt,
  VIEW_GRID,
  viewSheetPrompt,
} from "../characters";
import { assertBudget, recordCost } from "../costs";
import { generateImage, removeBackground } from "../providers/fal";
import { ASSETS_DIR, DATA_DIR, getCharacterDoc, getStore, saveCharacter } from "../store";
import { CHARACTER_ORDER, CORE_EXPRESSIONS, EXTENDED_EXPRESSIONS, type CharacterId, type CharacterProfile, type Expression, type Project, type Settings, type ViewName } from "../types";
import { sliceSheet } from "./sheets";

export type SheetKind = "core" | "expressions" | "views" | "full";

const GRID: Record<SheetKind, { rows: number; cols: number; names: readonly string[] }> = {
  core: { rows: 2, cols: 2, names: ["neutral", "talking", "blink", "surprised"] },
  expressions: { rows: 3, cols: 3, names: EXPRESSION_GRID },
  views: { rows: 1, cols: 3, names: VIEW_GRID },
  /** combined 4x3 reference sheet: 9 expressions + 3 turnaround views */
  full: { rows: 3, cols: 4, names: FULL_GRID },
};

/**
 * Rescale a sprite sliced from another sheet onto the core sprite canvas so that every expression
 * of a character shares the same anchor (feet) and body height.
 */
async function conformToCore(
  png: Buffer,
  from: { x: number; y: number; bodyHeight: number },
  core: { x: number; y: number; bodyHeight: number },
  W: number,
  H: number,
): Promise<Buffer> {
  const f = core.bodyHeight / from.bodyHeight;
  const meta = await sharp(png).metadata();
  const w = Math.max(1, Math.round((meta.width ?? 1) * f));
  const h = Math.max(1, Math.round((meta.height ?? 1) * f));
  const scaled = await sharp(png).resize(w, h).png().toBuffer();
  let left = Math.round(core.x - from.x * f);
  let top = Math.round(core.y - from.y * f);
  // crop whatever falls outside the core canvas
  const cx = Math.max(0, -left),
    cy = Math.max(0, -top);
  const cw = Math.min(w - cx, W - Math.max(0, left));
  const ch = Math.min(h - cy, H - Math.max(0, top));
  const piece = await sharp(scaled).extract({ left: cx, top: cy, width: Math.max(1, cw), height: Math.max(1, ch) }).png().toBuffer();
  left = Math.max(0, left);
  top = Math.max(0, top);
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function getCharacter(id: CharacterId): Promise<CharacterProfile> {
  return (await getCharacterDoc(id)) ?? defaultCharacter(id);
}

export async function getCharacters(): Promise<Record<CharacterId, CharacterProfile>> {
  const out = {} as Record<CharacterId, CharacterProfile>;
  for (const id of CHARACTER_ORDER) out[id] = await getCharacter(id);
  return out;
}

export function hasCoreSprites(c: CharacterProfile) {
  return CORE_EXPRESSIONS.every((e) => c.sprites[e]);
}

/**
 * Import a reference sheet (grid image) into the permanent library: slices it into aligned
 * sprites and stores them. `core` sheets drive animation; `expressions`/`views` extend it.
 */
export async function importSheet(id: CharacterId, file: string, kind: SheetKind): Promise<CharacterProfile> {
  const store = getStore();
  const c = await getCharacter(id);
  const stamp = Date.now();
  const sheetKey = `characters/${id}/sheet-${kind}-${stamp}.png`;
  await store.putFile(sheetKey, file);
  const g = GRID[kind];
  const res = await sliceSheet(file, { rows: g.rows, cols: g.cols, names: [...g.names], referenceName: kind === "views" ? "front" : "neutral" });
  const coreRef = c.sprites.neutral;
  for (const s of res.sprites) {
    const isView = (VIEW_GRID as readonly string[]).includes(s.name);
    const isExtended = (EXTENDED_EXPRESSIONS as readonly string[]).includes(s.name);
    const isCore = (CORE_EXPRESSIONS as readonly string[]).includes(s.name);
    // core sheet owns the animation-critical expressions; other sheets only add to the library
    if (!isView && !(kind === "core" && isCore) && !isExtended && !(isCore && !c.sprites[s.name as Expression])) continue;
    let png = s.png;
    let width = s.width,
      height = s.height;
    if (!isView && kind !== "core" && coreRef && c.anchor) {
      png = await conformToCore(s.png, res.anchor, c.anchor, coreRef.width, coreRef.height);
      width = coreRef.width;
      height = coreRef.height;
    }
    const key = `characters/${id}/${kind}/${s.name}-${stamp}.png`;
    await store.putFile(key, png, "image/png");
    const ref = { key, width, height };
    if (isView) c.views[s.name as ViewName] = ref;
    else c.sprites[s.name as Expression] = ref;
  }
  if (kind === "core") {
    c.anchor = res.anchor;
    c.alignmentScore = Math.min(...Object.values(res.shifts).map((x) => x.score));
  }
  if (kind === "full") c.sheets.expressions = c.sheets.views = sheetKey;
  else c.sheets[kind] = sheetKey;
  await saveCharacter(c);
  return c;
}

/** Generate a reference sheet with fal (style reference + permanent design prompt), then import it. */
export async function generateSheet(s: Settings, id: CharacterId, kind: SheetKind, project: Project | null = null) {
  const c = await getCharacter(id);
  if (c.locked && kind === "core" && hasCoreSprites(c))
    throw new Error(`${c.displayName} is locked; unlock it in the Character Library to regenerate its core sheet.`);
  await assertBudget(project, s, s.costLimits.falImageUsd * 2, `${kind} sheet for ${id}`);
  const prompt =
    kind === "core" ? coreSheetPrompt(c) : kind === "expressions" ? expressionSheetPrompt(c) : kind === "full" ? fullSheetPrompt(c) : viewSheetPrompt(c);
  const tmp = path.join(DATA_DIR, "tmp", `${id}-${kind}-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  // references: the character's existing neutral sprite (consistency) or the global style reference
  const refs: string[] = [];
  if (c.sprites.neutral) refs.push(await getStore().localPath(c.sprites.neutral.key));
  for (const u of c.sheets.uploads.slice(-2)) refs.push(await getStore().localPath(u));
  const style = path.join(ASSETS_DIR, "style-reference.png");
  if (!refs.length && fs.existsSync(style)) refs.push(style);
  const aspect = kind === "views" ? "16:9" : kind === "full" ? "4:3" : "1:1";
  const raw = await generateImage(s, prompt, path.join(tmp, "sheet.png"), { aspectRatio: aspect, referenceFiles: refs });
  const cut = await removeBackground(s, raw, path.join(tmp, "sheet-cut.png"));
  recordCost(project, { provider: "fal", what: `${kind} sheet ${id}`, usd: s.costLimits.falImageUsd * 2 });
  return importSheet(id, cut, kind);
}

/** Make sure all five characters have animation sprites; bundled sheets are imported first. */
export async function ensureCharacterLibrary(s: Settings | null, project: Project | null, log: (m: string) => void) {
  const chars = await getCharacters();
  const fileHash = (f: string) => (fs.existsSync(f) ? crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 16) : "");
  for (const id of CHARACTER_ORDER) {
    let c = chars[id];
    const dir = path.join(ASSETS_DIR, "characters", id);
    const bundledCore = path.join(dir, "sheet-core.png");
    const bundledFull = path.join(dir, "sheet-full.png");
    const coreHash = fileHash(bundledCore);
    const fullHash = fileHash(bundledFull);
    // a changed bundled sheet means the permanent design was updated: rebuild that character
    const designChanged = !!coreHash && c.sheets.bundledCoreHash !== coreHash && !c.locked;
    if (designChanged || !hasCoreSprites(c) || !(await allSpritesPresent(c))) {
      if (coreHash) {
        log(`importing bundled reference sheet for ${c.displayName}`);
        c.sprites = {};
        c.views = {};
        await saveCharacter(c);
        c = await importSheet(id, bundledCore, "core");
        c.sheets.bundledCoreHash = coreHash;
        c.sheets.bundledFullHash = undefined;
      } else if (s) {
        log(`generating reference sheet for ${c.displayName} with fal.ai`);
        c = await generateSheet(s, id, "core", project);
      } else throw new Error(`${c.displayName} has no sprites and no generator is configured`);
    }
    if (fullHash && c.sheets.bundledFullHash !== fullHash) {
      log(`importing bundled expression + turnaround sheet for ${c.displayName}`);
      c = await importSheet(id, bundledFull, "full");
      c.sheets.bundledFullHash = fullHash;
    }
    await saveCharacter(c);
    chars[id] = c;
  }
  return chars;
}

async function allSpritesPresent(c: CharacterProfile) {
  for (const e of CORE_EXPRESSIONS) if (!(await getStore().hasFile(c.sprites[e]!.key))) return false;
  return true;
}

/** Contact sheet PNG of a character's sprites (for the dashboard + QC). */
export async function contactSheet(c: CharacterProfile): Promise<Buffer> {
  const entries = Object.entries(c.sprites).filter(([, v]) => v) as [string, { key: string }][];
  const H = 360;
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  let x = 0;
  for (const [, ref] of entries) {
    const buf = await sharp(await getStore().localPath(ref.key)).resize({ height: H }).png().toBuffer();
    const m = await sharp(buf).metadata();
    tiles.push({ input: buf, left: x, top: 0 });
    x += (m.width ?? 0) + 8;
  }
  return sharp({ create: { width: Math.max(1, x), height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(tiles)
    .png()
    .toBuffer();
}
