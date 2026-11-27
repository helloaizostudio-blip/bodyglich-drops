import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  coreSheetPrompt,
  defaultCharacter,
  EXPRESSION_GRID,
  expressionSheetPrompt,
  VIEW_GRID,
  viewSheetPrompt,
} from "../characters";
import { assertBudget, recordCost } from "../costs";
import { generateImage, removeBackground } from "../providers/fal";
import { ASSETS_DIR, DATA_DIR, getCharacterDoc, getStore, saveCharacter } from "../store";
import { CHARACTER_ORDER, CORE_EXPRESSIONS, type CharacterId, type CharacterProfile, type Expression, type Project, type Settings, type ViewName } from "../types";
import { sliceSheet } from "./sheets";

export type SheetKind = "core" | "expressions" | "views";

const GRID: Record<SheetKind, { rows: number; cols: number; names: readonly string[] }> = {
  core: { rows: 2, cols: 2, names: ["neutral", "talking", "blink", "surprised"] },
  expressions: { rows: 3, cols: 3, names: EXPRESSION_GRID },
  views: { rows: 1, cols: 3, names: VIEW_GRID },
};

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
  for (const s of res.sprites) {
    const key = `characters/${id}/${kind}/${s.name}-${stamp}.png`;
    await store.putFile(key, s.png, "image/png");
    const ref = { key, width: s.width, height: s.height };
    if (kind === "views") c.views[s.name as ViewName] = ref;
    // core sheet wins for the animation-critical expressions
    else if (kind === "core" || !CORE_EXPRESSIONS.includes(s.name as never) || !c.sprites[s.name as Expression])
      c.sprites[s.name as Expression] = ref;
  }
  if (kind === "core") {
    c.anchor = res.anchor;
    c.alignmentScore = Math.min(...Object.values(res.shifts).map((x) => x.score));
  }
  c.sheets[kind] = sheetKey;
  await saveCharacter(c);
  return c;
}

/** Generate a reference sheet with fal (style reference + permanent design prompt), then import it. */
export async function generateSheet(s: Settings, id: CharacterId, kind: SheetKind, project: Project | null = null) {
  const c = await getCharacter(id);
  if (c.locked && kind === "core" && hasCoreSprites(c))
    throw new Error(`${c.displayName} is locked; unlock it in the Character Library to regenerate its core sheet.`);
  await assertBudget(project, s, s.costLimits.falImageUsd * 2, `${kind} sheet for ${id}`);
  const prompt = kind === "core" ? coreSheetPrompt(c) : kind === "expressions" ? expressionSheetPrompt(c) : viewSheetPrompt(c);
  const tmp = path.join(DATA_DIR, "tmp", `${id}-${kind}-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  // references: the character's existing neutral sprite (consistency) or the global style reference
  const refs: string[] = [];
  if (c.sprites.neutral) refs.push(await getStore().localPath(c.sprites.neutral.key));
  for (const u of c.sheets.uploads.slice(-2)) refs.push(await getStore().localPath(u));
  const style = path.join(ASSETS_DIR, "style-reference.png");
  if (!refs.length && fs.existsSync(style)) refs.push(style);
  const aspect = kind === "views" ? "16:9" : "1:1";
  const raw = await generateImage(s, prompt, path.join(tmp, "sheet.png"), { aspectRatio: aspect, referenceFiles: refs });
  const cut = await removeBackground(s, raw, path.join(tmp, "sheet-cut.png"));
  recordCost(project, { provider: "fal", what: `${kind} sheet ${id}`, usd: s.costLimits.falImageUsd * 2 });
  return importSheet(id, cut, kind);
}

/** Make sure all five characters have animation sprites; bundled sheets are imported first. */
export async function ensureCharacterLibrary(s: Settings | null, project: Project | null, log: (m: string) => void) {
  const chars = await getCharacters();
  for (const id of CHARACTER_ORDER) {
    let c = chars[id];
    if (hasCoreSprites(c) && (await allSpritesPresent(c))) continue;
    const bundled = path.join(ASSETS_DIR, "characters", id, "sheet-core.png");
    if (fs.existsSync(bundled)) {
      log(`importing bundled reference sheet for ${c.displayName}`);
      c = await importSheet(id, bundled, "core");
    } else if (s) {
      log(`generating reference sheet for ${c.displayName} with fal.ai`);
      c = await generateSheet(s, id, "core", project);
    } else throw new Error(`${c.displayName} has no sprites and no generator is configured`);
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
