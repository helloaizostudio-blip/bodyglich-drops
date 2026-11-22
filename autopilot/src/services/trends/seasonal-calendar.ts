import type { CategoryKey } from "@/services/product-research/categories";

/**
 * Seasonal buying calendar for Amazon.in shoppers.
 * Windows are month/day ranges in the local calendar. Festivals that move each year
 * (Holi, Raksha Bandhan, Navratri, Diwali) use a wide window; edit them each year if
 * you want tighter targeting.
 *
 * Pinterest users plan ahead, so campaigns become relevant before their window opens
 * (see `lookaheadDays` in settings).
 */
export interface Campaign {
  key: string;
  label: string;
  /** [month, day] inclusive. May wrap across the new year. */
  start: [number, number];
  end: [number, number];
  categories: CategoryKey[];
  keywords: string[];
  board?: string;
  /** Short phrase used in copy, e.g. "this Christmas". */
  copyHook: string;
}

export const CAMPAIGNS: Campaign[] = [
  {
    key: "new_year_organisation",
    label: "New Year organisation & home refresh",
    start: [12, 26],
    end: [1, 31],
    categories: ["problem_solvers", "home_decor", "kitchen"],
    keywords: ["drawer organiser", "wardrobe organiser", "desk organiser", "fridge storage containers", "planner 2027"],
    board: "Home Essentials",
    copyHook: "for a fresh start this year",
  },
  {
    key: "fitness_january",
    label: "January fitness accessories",
    start: [12, 28],
    end: [2, 10],
    categories: ["gadgets", "personal_care"],
    keywords: ["yoga mat", "resistance bands", "smart water bottle", "gym bag", "fitness tracker"],
    copyHook: "for your new-year routine",
  },
  {
    key: "home_refresh",
    label: "Home refresh",
    start: [1, 5],
    end: [2, 28],
    categories: ["home_decor", "kitchen"],
    keywords: ["cushion covers", "table runner", "wall art", "bedsheet set", "plant pots"],
    board: "Home Essentials",
    copyHook: "for an easy home refresh",
  },
  {
    key: "valentines",
    label: "Valentine's Day gifts",
    start: [1, 25],
    end: [2, 14],
    categories: ["gifts", "fashion", "skincare_beauty"],
    keywords: ["valentine gift for her", "valentine gift for him", "couple gifts", "jewellery box", "perfume gift set"],
    board: "Lifestyle Inspiration",
    copyHook: "this Valentine's Day",
  },
  {
    key: "holi",
    label: "Holi",
    start: [2, 20],
    end: [3, 25],
    categories: ["festive", "skincare_beauty", "personal_care"],
    keywords: ["holi colours organic", "hair oil", "white kurta", "waterproof phone pouch"],
    copyHook: "for Holi",
  },
  {
    key: "summer_essentials",
    label: "Summer essentials",
    start: [3, 1],
    end: [5, 31],
    categories: ["fashion", "skincare_beauty", "gadgets", "kitchen"],
    keywords: ["sunscreen spf 50", "linen shirt", "cotton co-ord set", "portable neck fan", "insulated water bottle", "sunglasses"],
    copyHook: "for the summer heat",
  },
  {
    key: "mothers_day",
    label: "Mother's Day gifts",
    start: [4, 20],
    end: [5, 12],
    categories: ["gifts", "home_decor", "skincare_beauty"],
    keywords: ["gift for mom", "saree organiser", "aroma diffuser", "photo frame"],
    copyHook: "for Mother's Day",
  },
  {
    key: "monsoon",
    label: "Monsoon essentials",
    start: [6, 1],
    end: [8, 31],
    categories: ["problem_solvers", "fashion", "gadgets"],
    keywords: ["umbrella compact", "raincoat", "waterproof backpack", "shoe dryer", "dehumidifier"],
    copyHook: "for monsoon days",
  },
  {
    key: "back_to_college",
    label: "Back to college",
    start: [6, 15],
    end: [7, 31],
    categories: ["gadgets", "fashion", "problem_solvers"],
    keywords: ["laptop backpack", "desk lamp", "hostel essentials", "noise cancelling earbuds"],
    copyHook: "for the new semester",
  },
  {
    key: "raksha_bandhan",
    label: "Raksha Bandhan",
    start: [7, 20],
    end: [8, 25],
    categories: ["gifts", "festive"],
    keywords: ["rakhi gift for sister", "rakhi gift for brother", "chocolate hamper", "personalised gift"],
    copyHook: "this Raksha Bandhan",
  },
  {
    key: "navratri_durga_puja",
    label: "Navratri & Durga Puja",
    start: [9, 10],
    end: [10, 25],
    categories: ["fashion", "festive"],
    keywords: ["chaniya choli", "oxidised jewellery", "ethnic kurta set", "dandiya sticks"],
    copyHook: "for the festive season",
  },
  {
    key: "diwali",
    label: "Diwali & festive shopping",
    start: [10, 1],
    end: [11, 15],
    categories: ["festive", "home_decor", "gifts", "kitchen"],
    keywords: ["diwali decoration lights", "brass diya", "rangoli", "diwali gift hamper", "dinner set", "torans"],
    copyHook: "this Diwali",
  },
  {
    key: "wedding_season",
    label: "Wedding season",
    start: [11, 1],
    end: [2, 28],
    categories: ["fashion", "gifts", "skincare_beauty"],
    keywords: ["wedding gift", "ethnic wear men", "potli bag", "makeup kit", "jewellery organiser"],
    copyHook: "for wedding season",
  },
  {
    key: "winter_fashion",
    label: "Winter fashion",
    start: [11, 1],
    end: [1, 31],
    categories: ["fashion", "personal_care"],
    keywords: ["winter jacket women", "puffer jacket men", "wool scarf", "thermal wear", "winter boots", "lip balm"],
    board: "Winter Fashion",
    copyHook: "this winter",
  },
  {
    key: "christmas",
    label: "Christmas decorations & gifting",
    start: [11, 15],
    end: [12, 25],
    categories: ["christmas", "gifts", "home_decor"],
    keywords: ["christmas tree", "christmas decorations", "secret santa gift", "christmas fairy lights", "advent calendar", "gift hamper"],
    board: "Christmas Gift Ideas",
    copyHook: "this Christmas",
  },
];

const DAY = 86_400_000;

function windowFor(c: Campaign, ref: Date): { start: Date; end: Date } {
  // Pick the window occurrence whose end is on/after ref (so upcoming or active).
  const y = ref.getUTCFullYear();
  for (const year of [y - 1, y, y + 1]) {
    const start = new Date(Date.UTC(year, c.start[0] - 1, c.start[1]));
    const wraps = c.end[0] < c.start[0] || (c.end[0] === c.start[0] && c.end[1] < c.start[1]);
    const end = new Date(Date.UTC(wraps ? year + 1 : year, c.end[0] - 1, c.end[1], 23, 59));
    if (end.getTime() >= ref.getTime()) return { start, end };
  }
  throw new Error("unreachable");
}

export interface CampaignRelevance {
  campaign: Campaign;
  /** 0..1 — 1 while the window is open, ramps up during the look-ahead period. */
  relevance: number;
  state: "active" | "upcoming" | "inactive";
  daysUntilStart: number;
  start: string;
  end: string;
}

export function campaignRelevance(c: Campaign, ref: Date, lookaheadDays: number): CampaignRelevance {
  const { start, end } = windowFor(c, ref);
  const daysUntilStart = Math.ceil((start.getTime() - ref.getTime()) / DAY);
  let relevance = 0;
  let state: CampaignRelevance["state"] = "inactive";
  if (ref >= start && ref <= end) {
    // Slight fade in the last days of the window: shoppers have already bought.
    const daysLeft = (end.getTime() - ref.getTime()) / DAY;
    relevance = daysLeft < 5 ? 0.6 : 1;
    state = "active";
  } else if (daysUntilStart > 0 && daysUntilStart <= lookaheadDays) {
    relevance = 0.5 + 0.5 * (1 - daysUntilStart / lookaheadDays);
    state = "upcoming";
  }
  return {
    campaign: c,
    relevance: Math.round(relevance * 100) / 100,
    state,
    daysUntilStart,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function activeCampaigns(ref = new Date(), lookaheadDays = 45): CampaignRelevance[] {
  return CAMPAIGNS.map((c) => campaignRelevance(c, ref, lookaheadDays))
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}

export function calendarOverview(ref = new Date(), lookaheadDays = 45): CampaignRelevance[] {
  return CAMPAIGNS.map((c) => campaignRelevance(c, ref, lookaheadDays)).sort(
    (a, b) => a.start.localeCompare(b.start),
  );
}

export function getCampaign(key: string | null | undefined): Campaign | undefined {
  return key ? CAMPAIGNS.find((c) => c.key === key) : undefined;
}

/** Best-matching campaign for a product given its title/category. */
export function matchCampaign(
  text: string,
  category: CategoryKey,
  ref = new Date(),
  lookaheadDays = 45,
): (CampaignRelevance & { fit: number; keywordMatch: boolean }) | undefined {
  const t = text.toLowerCase();
  const scored = activeCampaigns(ref, lookaheadDays).map((r) => {
    const kwHit = r.campaign.keywords.some((k) => {
      const words = k.split(" ").filter((w) => w.length > 3);
      return words.length > 0 && words.every((w) => t.includes(w));
    });
    const catHit = r.campaign.categories.includes(category);
    const fit = (kwHit ? 0.6 : 0) + (catHit ? 0.4 : 0);
    return { ...r, fit: Math.round(fit * r.relevance * 100) / 100, keywordMatch: kwHit };
  });
  return scored.filter((s) => s.fit > 0).sort((a, b) => b.fit - a.fit)[0];
}
