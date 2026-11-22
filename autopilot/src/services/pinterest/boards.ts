import type { AppSettings, BoardConfig } from "@/database/types";
import type { CategoryKey } from "@/services/product-research/categories";
import { CATEGORIES } from "@/services/product-research/categories";

/**
 * Picks the best board for a product: a board mapped to the product's seasonal
 * campaign wins, then a board mapped to its category, then the category default.
 */
export function recommendBoard(
  boards: AppSettings["boards"],
  product: { category: CategoryKey; campaign: string | null; title: string },
): BoardConfig {
  const scored = boards.map((b) => {
    let s = 0;
    if (product.campaign && b.campaigns.includes(product.campaign)) s += 10;
    if (b.categories.includes(product.category)) s += 5;
    const nameWords = b.name.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    if (nameWords.some((w) => product.title.toLowerCase().includes(w))) s += 1;
    return { b, s };
  });
  const best = scored.sort((a, b) => b.s - a.s)[0];
  if (best && best.s > 0) return best.b;
  const fallbackName = CATEGORIES[product.category]?.defaultBoard;
  return boards.find((b) => b.name === fallbackName) ?? boards[0] ?? { name: fallbackName ?? "Lifestyle Inspiration", pinterestBoardId: null, categories: [], campaigns: [] };
}

export function boardNames(boards: AppSettings["boards"]): string[] {
  return boards.map((b) => b.name);
}
