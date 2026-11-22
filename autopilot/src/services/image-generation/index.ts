import { config } from "@/utils/config";
import { audit } from "@/utils/audit";
import { generateBackground } from "./higgsfield";
import { renderPinPng, saveMedia } from "./renderer";
import type { PinStyle } from "./styles";

function mimeOf(buf: Buffer): string {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return "application/octet-stream";
}

export interface PinImageRequest {
  fileBase: string; // e.g. pin id
  style: PinStyle;
  headline: string;
  subheadline: string | null;
  kicker: string;
  campaignKey: string | null;
  imagePrompt: string | null;
  provider: "template" | "higgsfield";
}

export interface PinImageResult {
  file: string;
  source: "template" | "higgsfield";
}

/**
 * Creates the pin image. With the Higgsfield provider, an AI scene is generated and the
 * typographic design is composited on top; on any provider failure we fall back to the
 * fully local template so the pipeline never blocks.
 */
export async function createPinImage(req: PinImageRequest): Promise<PinImageResult> {
  let backgroundDataUri: string | null = null;
  let source: PinImageResult["source"] = "template";

  if (req.provider === "higgsfield" && config.higgsfield.configured && req.imagePrompt) {
    try {
      const bg = await generateBackground(req.imagePrompt);
      const mime = mimeOf(bg);
      if (mime === "image/png" || mime === "image/jpeg") {
        backgroundDataUri = `data:${mime};base64,${bg.toString("base64")}`;
        source = "higgsfield";
      } else {
        await audit("warn", "system", "image.higgsfield", `Unsupported image format from Higgsfield (${mime}); using template`);
      }
    } catch (err) {
      await audit("warn", "system", "image.higgsfield", `Higgsfield failed, using template: ${(err as Error).message}`);
    }
  }

  const png = renderPinPng({
    style: req.style,
    headline: req.headline,
    subheadline: req.subheadline,
    kicker: req.kicker,
    campaignKey: req.campaignKey,
    seed: req.fileBase,
    backgroundDataUri,
  });
  const file = saveMedia(`${req.fileBase}-${Date.now().toString(36)}.png`, png);
  return { file, source };
}
