import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { config } from "@/utils/config";
import { renderSvg, PIN_WIDTH, type TemplateInput } from "./templates";

function fontFiles(): string[] {
  const dir = path.resolve(process.cwd(), "assets/fonts");
  return fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /\.(otf|ttf)$/i.test(f)).map((f) => path.join(dir, f))
    : [];
}

let cachedFonts: string[] | null = null;

export function renderPinPng(input: TemplateInput): Buffer {
  cachedFonts ??= fontFiles();
  const svg = renderSvg(input);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: PIN_WIDTH },
    font: { fontFiles: cachedFonts, loadSystemFonts: cachedFonts.length === 0, defaultFontFamily: "Inter" },
    background: "#ffffff",
  });
  return Buffer.from(resvg.render().asPng());
}

const SAFE_NAME = /^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/;

export function saveMedia(fileName: string, data: Buffer): string {
  if (!SAFE_NAME.test(fileName)) throw new Error(`Unsafe media filename: ${fileName}`);
  fs.mkdirSync(config.mediaDir, { recursive: true });
  fs.writeFileSync(path.join(config.mediaDir, fileName), data);
  return fileName;
}

export function readMedia(fileName: string): Buffer | null {
  if (!SAFE_NAME.test(fileName)) return null;
  const p = path.join(config.mediaDir, fileName);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

export function mediaUrl(fileName: string | null): string | null {
  return fileName ? `${config.publicBaseUrl}/api/media/${fileName}` : null;
}
