/**
 * Research categories. `searchIndex` values are Amazon.in search indexes used with
 * the Creators API `searchItems` operation; unknown indexes fall back to "All".
 */
export const CATEGORY_KEYS = [
  "fashion",
  "skincare_beauty",
  "personal_care",
  "home_decor",
  "kitchen",
  "gadgets",
  "gifts",
  "seasonal",
  "christmas",
  "festive",
  "problem_solvers",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  searchIndex: string;
  defaultBoard: string;
  seedKeywords: string[];
  /** Health/beauty categories get stricter claim checks. */
  sensitiveClaims: boolean;
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  fashion: {
    key: "fashion",
    label: "Fashion & clothing",
    searchIndex: "Fashion",
    defaultBoard: "Fashion Finds",
    seedKeywords: ["women co-ord set", "men linen shirt", "minimalist tote bag", "oversized hoodie", "ethnic kurta set"],
    sensitiveClaims: false,
  },
  skincare_beauty: {
    key: "skincare_beauty",
    label: "Skincare & beauty",
    searchIndex: "Beauty",
    defaultBoard: "Skincare & Beauty Finds",
    seedKeywords: ["sunscreen spf 50", "lip tint", "makeup brush set", "face serum niacinamide", "hair claw clips"],
    sensitiveClaims: true,
  },
  personal_care: {
    key: "personal_care",
    label: "Personal care",
    searchIndex: "HealthPersonalCare",
    defaultBoard: "Everyday Useful Products",
    seedKeywords: ["electric toothbrush", "hair dryer", "travel toiletry kit", "body trimmer", "massage gun"],
    sensitiveClaims: true,
  },
  home_decor: {
    key: "home_decor",
    label: "Home decoration",
    searchIndex: "HomeAndKitchen",
    defaultBoard: "Home Essentials",
    seedKeywords: ["fairy lights", "wall shelf", "ceramic vase", "cushion covers", "scented candles"],
    sensitiveClaims: false,
  },
  kitchen: {
    key: "kitchen",
    label: "Kitchen accessories",
    searchIndex: "HomeAndKitchen",
    defaultBoard: "Kitchen Finds",
    seedKeywords: ["spice organiser", "air fryer accessories", "glass storage jars", "vegetable chopper", "coffee mug set"],
    sensitiveClaims: false,
  },
  gadgets: {
    key: "gadgets",
    label: "Gadgets & accessories",
    searchIndex: "Electronics",
    defaultBoard: "Everyday Useful Products",
    seedKeywords: ["desk organiser", "phone stand", "power bank", "bluetooth tracker", "cable organiser"],
    sensitiveClaims: false,
  },
  gifts: {
    key: "gifts",
    label: "Gift ideas",
    searchIndex: "All",
    defaultBoard: "Lifestyle Inspiration",
    seedKeywords: ["gift hamper", "personalised gift", "gift for her", "gift for him", "desk gift"],
    sensitiveClaims: false,
  },
  seasonal: {
    key: "seasonal",
    label: "Seasonal products",
    searchIndex: "All",
    defaultBoard: "Lifestyle Inspiration",
    seedKeywords: [],
    sensitiveClaims: false,
  },
  christmas: {
    key: "christmas",
    label: "Christmas decor & gifts",
    searchIndex: "HomeAndKitchen",
    defaultBoard: "Christmas Gift Ideas",
    seedKeywords: ["christmas tree decoration", "secret santa gift", "christmas fairy lights", "christmas stocking"],
    sensitiveClaims: false,
  },
  festive: {
    key: "festive",
    label: "Festive shopping",
    searchIndex: "All",
    defaultBoard: "Lifestyle Inspiration",
    seedKeywords: ["diwali decoration", "festive gift box", "rangoli stencils", "brass diya"],
    sensitiveClaims: false,
  },
  problem_solvers: {
    key: "problem_solvers",
    label: "Everyday problem-solvers",
    searchIndex: "All",
    defaultBoard: "Everyday Useful Products",
    seedKeywords: ["drawer organiser", "lint remover", "cable clips", "door draft stopper", "shoe rack organiser"],
    sensitiveClaims: false,
  },
};

export function isCategoryKey(v: unknown): v is CategoryKey {
  return typeof v === "string" && (CATEGORY_KEYS as readonly string[]).includes(v);
}

export function categoryLabel(key: string): string {
  return isCategoryKey(key) ? CATEGORIES[key].label : key;
}
