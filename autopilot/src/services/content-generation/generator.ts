import { z } from "zod";
import type { Product } from "@/database/types";
import { CATEGORIES } from "@/services/product-research/categories";
import { getCampaign } from "@/services/trends/seasonal-calendar";
import { generateStructured } from "@/services/ai/claude";
import { config } from "@/utils/config";
import { PIN_STYLES, type PinStyle } from "@/services/image-generation/styles";

export interface PinConcept {
  style: PinStyle;
  headline: string;
  subheadline: string | null;
  title: string;
  description: string;
  keywords: string[];
  board: string;
  altText: string;
  imagePrompt: string;
}

export interface GeneratedContent {
  concepts: PinConcept[];
  source: "claude" | "template";
}

const ConceptSchema = z.object({
  style: z.enum(PIN_STYLES),
  headline: z.string().describe("On-image headline, max 6 words, no prices"),
  subheadline: z.string().describe("On-image supporting line, max 12 words, no prices"),
  title: z.string().describe("Pinterest pin title, keyword-rich, max 100 characters"),
  description: z.string().describe("Pinterest description, 2-3 natural sentences, max 380 characters, no disclosure, no URL"),
  keywords: z.array(z.string()).describe("6-10 Pinterest search keywords"),
  board: z.string().describe("Exactly one of the provided board names"),
  alt_text: z.string().describe("Accessible description of the pin graphic"),
  image_prompt: z
    .string()
    .describe("Prompt for an AI background scene: mood, setting, props, lighting. Must NOT depict the product itself, logos or text."),
});

const OutputSchema = z.object({ concepts: z.array(ConceptSchema) });

const SYSTEM = `You write Pinterest marketing copy for an Amazon.in affiliate publisher in India.

Hard rules:
- Use ONLY the product facts provided. Never invent ratings, review counts, sales numbers, discounts, awards, materials, sizes or features.
- Never mention prices, discounts or "deal" language: prices change and pins live for months.
- Never make health, medical, skincare or cosmetic effectiveness claims (no "clinically proven", "removes acne", "anti-ageing", "whitening", "guaranteed results"). Describe what the product is and how it fits a routine or occasion instead.
- No superlatives you cannot back up ("best", "#1", "top-rated") unless they are in the provided facts.
- Do not add an affiliate disclosure or hashtags like #ad: the system appends the required disclosure.
- Write in natural Indian English for Indian shoppers. Inspirational and useful, not spammy. No ALL CAPS, at most one emoji per description.
- Pinterest SEO: put the main search phrase near the start of the title and description; keywords should be phrases people actually search on Pinterest.
- Each concept must use a different style and a different angle (e.g. gift idea, problem solved, aesthetic/inspiration, seasonal).`;

function factsFor(p: Product) {
  return {
    title: p.title,
    brand: p.brand,
    category: CATEGORIES[p.category].label,
    features: p.features,
    rating: p.rating,
    review_count: p.review_count,
    availability: p.availability,
    notes: p.notes,
  };
}

export async function generateConcepts(
  product: Product,
  opts: { boards: string[]; recommendedBoard: string; count?: number },
): Promise<GeneratedContent> {
  const count = Math.min(Math.max(opts.count ?? 3, 2), 3);
  if (!config.claude.configured) return { concepts: templateConcepts(product, opts.recommendedBoard, count), source: "template" };

  const campaign = getCampaign(product.campaign);
  const prompt = `Create ${count} Pinterest pin concepts for this Amazon.in product.

Product facts (the only facts you may use):
${JSON.stringify(factsFor(product), null, 2)}

Seasonal campaign: ${campaign ? `${campaign.label} — angle "${campaign.copyHook}"` : "none"}
Available boards: ${opts.boards.join(" | ")}
Recommended board: ${opts.recommendedBoard}
Available visual styles: ${PIN_STYLES.join(", ")}

Return exactly ${count} concepts with different styles.`;

  const out = await generateStructured({ system: SYSTEM, prompt, schema: OutputSchema, effort: "medium" });
  const usedStyles = new Set<PinStyle>();
  const concepts = out.concepts.slice(0, count).map((c): PinConcept => {
    let style = c.style;
    if (usedStyles.has(style)) style = PIN_STYLES.find((s) => !usedStyles.has(s)) ?? style;
    usedStyles.add(style);
    return {
      style,
      headline: c.headline,
      subheadline: c.subheadline || null,
      title: c.title,
      description: c.description,
      keywords: c.keywords.slice(0, 10),
      board: opts.boards.includes(c.board) ? c.board : opts.recommendedBoard,
      altText: c.alt_text || `Pinterest graphic: ${c.headline}`,
      imagePrompt: c.image_prompt,
    };
  });
  if (concepts.length < 2) return { concepts: templateConcepts(product, opts.recommendedBoard, count), source: "template" };
  return { concepts, source: "claude" };
}

// ─── Template fallback (no AI key) ───────────────────────────────────
const SMALL_WORDS = new Set(["a", "an", "and", "for", "of", "the", "to", "in", "on", "with", "at", "by", "or"]);

function shortName(title: string): string {
  // "Brand X Cotton Hoodie for Men, Size M" → "Brand X Cotton Hoodie for Men"
  const main = title.split(/[,|(\[]| - | – /)[0].trim();
  const words = main.split(/\s+/).slice(0, 7);
  while (words.length > 2 && SMALL_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(" ");
}

function titleCase(s: string) {
  return s
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** "this Christmas" → "for Christmas"; "for the summer heat" stays. */
function occasion(hook: string): string {
  return hook.startsWith("this ") ? `for ${hook.slice(5)}` : hook;
}

export function templateConcepts(product: Product, board: string, count = 3): PinConcept[] {
  const name = shortName(product.title);
  const cat = CATEGORIES[product.category];
  const campaign = getCampaign(product.campaign);
  // Avoid "…for Christmas this Christmas" when the product name already names the occasion.
  const hookWord = campaign?.copyHook.split(" ").pop()?.toLowerCase() ?? "";
  const hookRepeats = Boolean(hookWord) && name.toLowerCase().includes(hookWord);
  const hook = campaign && !hookRepeats ? campaign.copyHook : "";
  const catPhrase = cat.label.replace(/&/g, "and").toLowerCase();
  const baseKeywords = [
    name.toLowerCase(),
    `${catPhrase} ideas`,
    ...(campaign ? campaign.keywords.slice(0, 3) : cat.seedKeywords.slice(0, 3)),
    "amazon finds india",
    "useful finds",
  ];
  const featureLine = product.features[0] ? ` ${product.features[0].replace(/\.$/, "")}.` : "";
  const sp = (s: string) => s.replace(/\s+/g, " ").trim();
  const all: PinConcept[] = [
    {
      style: campaign ? "seasonal" : "editorial",
      headline: campaign ? titleCase(`Save this ${occasion(campaign.copyHook)}`) : "The Edit: Worth a Look",
      subheadline: name,
      title: sp(hook ? `${name} ${hook}` : `${name}: Worth Saving`).slice(0, 100),
      description: sp(
        `${campaign ? `Planning ahead ${occasion(campaign.copyHook)}?` : `New ${catPhrase} idea.`} ${name} is worth saving to your board.${featureLine} Tap through to check the details and current availability on Amazon.in.`,
      ),
      keywords: baseKeywords,
      board,
      altText: `Pinterest graphic with the headline and the product name ${name}`,
      imagePrompt: `Soft editorial still life evoking ${catPhrase} ${hook}, warm natural light, empty space at top for text, no products, no logos, no text`,
    },
    {
      style: "minimal",
      headline: "Simple. Useful. Saved.",
      subheadline: name,
      title: `${name}: A Simple Find Worth Saving`.slice(0, 100),
      description: sp(`A clean, practical pick: ${name}.${featureLine} Save this pin for later and check the product details on Amazon.in before you buy.`),
      keywords: [...baseKeywords.slice(0, 4), "minimalist finds", "aesthetic essentials"],
      board,
      altText: `Minimal graphic with the words Simple, Useful, Saved and the product name ${name}`,
      imagePrompt: "Minimal neutral backdrop, soft shadows, beige and white tones, generous negative space, no products, no logos, no text",
    },
    {
      style: "lifestyle",
      headline: titleCase(hook ? `Small upgrades ${occasion(hook)}` : "Small upgrades, big difference").slice(0, 40),
      subheadline: name,
      title: `${cat.label} idea: ${name}`.slice(0, 100),
      description: sp(`Small upgrades make a big difference${hook ? ` ${hook}` : ""}. One to consider: ${name}.${featureLine} See the full listing, ratings and availability on Amazon.in.`),
      keywords: [...baseKeywords.slice(0, 5), "lifestyle inspiration"],
      board,
      altText: `Lifestyle graphic featuring the product name ${name}`,
      imagePrompt: `Cosy Indian home lifestyle scene ${hook}, natural light, plants, textured fabrics, no faces, no products, no logos, no text`,
    },
  ];
  return all.slice(0, count);
}
