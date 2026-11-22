import { getSettings } from "@/database/settings";
import { createPin, getPin, getProduct, listPins, updatePinFields } from "@/database/repositories";
import type { Pin } from "@/database/types";
import { audit } from "@/utils/audit";
import { config } from "@/utils/config";
import { CATEGORIES } from "@/services/product-research/categories";
import { getCampaign } from "@/services/trends/seasonal-calendar";
import { boardNames, recommendBoard } from "@/services/pinterest/boards";
import { checkAffiliateLink } from "@/services/amazon/links";
import { createPinImage } from "@/services/image-generation";
import { generateConcepts } from "./generator";
import { applyCompliance, FULL_DISCLOSURE } from "./compliance";

function kickerFor(category: keyof typeof CATEGORIES, campaignKey: string | null): string {
  const c = getCampaign(campaignKey);
  return c ? c.label.split(/[&(]/)[0].trim() : CATEGORIES[category].label;
}

/**
 * Full content pipeline for one product: copy concepts → compliance → images → draft pins
 * in the approval queue. Nothing is published here.
 */
export async function generatePinsForProduct(productId: string, opts: { actor?: "user" | "worker"; count?: number } = {}): Promise<Pin[]> {
  const actor = opts.actor ?? "user";
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  if (product.status === "rejected") throw new Error("Product is rejected; fix the issues and re-score it first");
  const link = checkAffiliateLink(product.affiliate_url, config.amazon.partnerTag, product.asin);
  if (!link.valid) throw new Error(`Cannot create pins without a valid affiliate link: ${link.reason}`);

  const settings = await getSettings();
  const board = recommendBoard(settings.boards, product);
  const existing = await listPins({ productId });
  const startIndex = existing.length ? Math.max(...existing.map((p) => p.concept_index)) + 1 : 0;

  const content = await generateConcepts(product, {
    boards: boardNames(settings.boards),
    recommendedBoard: board.name,
    count: opts.count ?? 3,
  });

  const created: Pin[] = [];
  for (const [i, concept] of content.concepts.entries()) {
    const compliant = applyCompliance({
      title: concept.title,
      description: concept.description,
      headline: concept.headline,
      subheadline: concept.subheadline,
      altText: concept.altText,
      sensitiveCategory: CATEGORIES[product.category].sensitiveClaims,
    });
    const pin = await createPin({
      product_id: product.id,
      concept_index: startIndex + i,
      style: concept.style,
      headline: compliant.headline,
      subheadline: compliant.subheadline,
      title: compliant.title,
      description: compliant.description,
      keywords: concept.keywords,
      board: concept.board,
      link: product.affiliate_url!,
      alt_text: compliant.altText,
      disclosure: FULL_DISCLOSURE,
      campaign: product.campaign,
      image_file: null,
      image_source: null,
      image_prompt: concept.imagePrompt,
      copy_source: content.source,
      compliance_flags: compliant.flags,
    });
    try {
      const img = await createPinImage({
        fileBase: pin.id,
        style: concept.style,
        headline: compliant.headline,
        subheadline: compliant.subheadline,
        kicker: kickerFor(product.category, product.campaign),
        campaignKey: product.campaign,
        imagePrompt: concept.imagePrompt,
        provider: settings.imageProvider,
      });
      await updatePinFields(pin.id, { image_file: img.file, image_source: img.source });
    } catch (err) {
      await updatePinFields(pin.id, { last_error: `Image generation failed: ${(err as Error).message}` });
      await audit("error", actor, "image.generate", `Image failed for pin ${pin.id}: ${(err as Error).message}`, {
        entityType: "pin",
        entityId: pin.id,
      });
    }
    created.push((await getPin(pin.id))!);
  }

  await audit("info", actor, "content.generate", `Created ${created.length} draft pins for ${product.asin} (${content.source} copy)`, {
    entityType: "product",
    entityId: product.id,
    details: { pins: created.map((p) => p.id), board: board.name },
  });
  return created;
}

/** Re-renders a pin's image from its (possibly edited) headline/subheadline. */
export async function regeneratePinImage(pinId: string, actor: "user" | "worker" = "user"): Promise<Pin> {
  const pin = await getPin(pinId);
  if (!pin) throw new Error("Pin not found");
  if (!["draft", "approved", "scheduled", "failed"].includes(pin.status)) throw new Error(`Cannot change image of a ${pin.status} pin`);
  const product = await getProduct(pin.product_id);
  if (!product) throw new Error("Product not found");
  const settings = await getSettings();
  const img = await createPinImage({
    fileBase: pin.id,
    style: pin.style as Parameters<typeof createPinImage>[0]["style"],
    headline: pin.headline,
    subheadline: pin.subheadline,
    kicker: kickerFor(product.category, product.campaign),
    campaignKey: pin.campaign,
    imagePrompt: pin.image_prompt,
    provider: settings.imageProvider,
  });
  await updatePinFields(pin.id, { image_file: img.file, image_source: img.source, last_error: null });
  await audit("info", actor, "image.regenerate", `Re-rendered image for pin ${pin.id} (${img.source})`, { entityType: "pin", entityId: pin.id });
  return (await getPin(pin.id))!;
}
