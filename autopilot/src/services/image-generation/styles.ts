export const PIN_STYLES = ["editorial", "minimal", "magazine", "product_photo", "lifestyle", "seasonal"] as const;
export type PinStyle = (typeof PIN_STYLES)[number];

export const STYLE_LABELS: Record<PinStyle, string> = {
  editorial: "Premium editorial",
  minimal: "Minimalist aesthetic",
  magazine: "Fashion magazine",
  product_photo: "Clean product photography",
  lifestyle: "Modern lifestyle",
  seasonal: "Seasonal inspiration",
};

export interface Palette {
  bg: string;
  bg2: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
}

/** Several palettes per style so consecutive pins don't look identical. */
export const PALETTES: Record<PinStyle, Palette[]> = {
  editorial: [
    { bg: "#F4EFE6", bg2: "#E9DFCF", ink: "#2B2520", muted: "#6E6259", accent: "#B8643F", accent2: "#D9A47F" },
    { bg: "#EEF0EA", bg2: "#DCE2D6", ink: "#1F2A22", muted: "#5B6A5E", accent: "#4F6B52", accent2: "#A9BFA6" },
    { bg: "#F3ECEF", bg2: "#E6D6DC", ink: "#2E2228", muted: "#6D5862", accent: "#8E4A63", accent2: "#D4A5B5" },
  ],
  minimal: [
    { bg: "#FAFAF7", bg2: "#EFEDE7", ink: "#1C1C1A", muted: "#7A776F", accent: "#C9B79C", accent2: "#E7DCCB" },
    { bg: "#F6F7F9", bg2: "#E4E8EE", ink: "#15181D", muted: "#6B7280", accent: "#8FA3BF", accent2: "#D5DEEA" },
  ],
  magazine: [
    { bg: "#1D1B22", bg2: "#2C2833", ink: "#FFFFFF", muted: "#D9D4DE", accent: "#E9C46A", accent2: "#F4A261" },
    { bg: "#7A1E2C", bg2: "#5E1621", ink: "#FFFFFF", muted: "#F2D7DB", accent: "#F7E1C1", accent2: "#E8B4A0" },
    { bg: "#0F3B3A", bg2: "#0A2B2A", ink: "#FFFFFF", muted: "#CFE5E3", accent: "#F2C14E", accent2: "#E76F51" },
  ],
  product_photo: [
    { bg: "#ECE8E3", bg2: "#D8D1C8", ink: "#24211E", muted: "#6F675E", accent: "#2F2A25", accent2: "#FFFFFF" },
    { bg: "#E6ECEF", bg2: "#CCD7DD", ink: "#1B2328", muted: "#5E6B73", accent: "#1F3440", accent2: "#FFFFFF" },
  ],
  lifestyle: [
    { bg: "#F2E3D5", bg2: "#E3C9B0", ink: "#2D2118", muted: "#715C4B", accent: "#C76B3E", accent2: "#7C9A73" },
    { bg: "#DDE7E1", bg2: "#BFD3C7", ink: "#1E2B25", muted: "#557064", accent: "#E07A5F", accent2: "#3D5A80" },
  ],
  seasonal: [
    { bg: "#16352B", bg2: "#0E261E", ink: "#FFFFFF", muted: "#E6EFE9", accent: "#D4AF37", accent2: "#C0392B" },
  ],
};

/** Campaign-specific palettes for the seasonal style. */
export const CAMPAIGN_PALETTES: Record<string, Palette> = {
  christmas: { bg: "#16352B", bg2: "#0E261E", ink: "#FFFFFF", muted: "#E6EFE9", accent: "#D4AF37", accent2: "#C0392B" },
  winter_fashion: { bg: "#E8F0F7", bg2: "#C9DAEA", ink: "#14263A", muted: "#4C6680", accent: "#2E5E8C", accent2: "#FFFFFF" },
  diwali: { bg: "#5A1220", bg2: "#3F0C16", ink: "#FFF6E5", muted: "#F3D9B5", accent: "#F2B33D", accent2: "#E8743B" },
  navratri_durga_puja: { bg: "#7B1E3A", bg2: "#5A142A", ink: "#FFF3E6", muted: "#F5D3C0", accent: "#F4B942", accent2: "#E85D75" },
  valentines: { bg: "#F7DDE2", bg2: "#EDB9C4", ink: "#4A1626", muted: "#86445A", accent: "#C2185B", accent2: "#FFFFFF" },
  summer_essentials: { bg: "#FFF1C9", bg2: "#FFD98E", ink: "#3B2A07", muted: "#7A5B1E", accent: "#F28C28", accent2: "#2A9D8F" },
  monsoon: { bg: "#DCE6EA", bg2: "#B5C8D1", ink: "#16252C", muted: "#4C6672", accent: "#2C6E7F", accent2: "#F2C14E" },
  holi: { bg: "#FFF4F0", bg2: "#FFD9CC", ink: "#2C1D3A", muted: "#6A5280", accent: "#E63B7A", accent2: "#21A0A0" },
  raksha_bandhan: { bg: "#FFF0E1", bg2: "#FFD2A8", ink: "#4A2410", muted: "#8A5634", accent: "#D9480F", accent2: "#F2C14E" },
  new_year_organisation: { bg: "#F5F5F0", bg2: "#E2E2D8", ink: "#1C1C1A", muted: "#6B6B60", accent: "#C9A227", accent2: "#1C1C1A" },
};

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
