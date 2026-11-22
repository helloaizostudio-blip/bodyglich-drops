import { CAMPAIGN_PALETTES, PALETTES, hashSeed, type Palette, type PinStyle } from "./styles";

/**
 * Original 1000×1500 (2:3) pin designs, drawn as SVG and rendered to PNG locally.
 * No Amazon product imagery is used. When an AI background is supplied it is
 * marked "Illustrative image" on the pin.
 */
export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500;

export interface TemplateInput {
  style: PinStyle;
  headline: string;
  subheadline: string | null;
  kicker: string; // small label, e.g. category or campaign
  campaignKey: string | null;
  seed: string; // pin id or similar, to vary palettes/ornaments
  backgroundDataUri?: string | null; // AI-generated scene (PNG/JPEG data URI)
}

const SERIF = "Caladea";
const SANS = "Inter";
const DISPLAY = "Inter Display";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Approximate glyph width as a fraction of font size. */
const WIDTH_FACTOR: Record<string, number> = { [SERIF]: 0.5, [SANS]: 0.56, [DISPLAY]: 0.55 };

export function wrapText(text: string, maxWidth: number, fontSize: number, family: string, upper = false): string[] {
  const factor = (WIDTH_FACTOR[family] ?? 0.55) * (upper ? 1.12 : 1);
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * factor)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) line = next;
    else {
      if (line) lines.push(line);
      line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Finds the largest font size (≤ max) where the text fits in maxLines. */
function fit(text: string, maxWidth: number, family: string, max: number, min: number, maxLines: number, upper = false) {
  for (let size = max; size >= min; size -= 4) {
    const lines = wrapText(text, maxWidth, size, family, upper);
    if (lines.length <= maxLines) return { size, lines };
  }
  const lines = wrapText(text, maxWidth, min, family, upper);
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines) clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/…$/, "")}…`;
  return { size: min, lines: clipped };
}

function textBlock(
  lines: string[],
  opts: { x: number; y: number; size: number; family: string; weight: number; fill: string; anchor?: "start" | "middle" | "end"; lineHeight?: number; letterSpacing?: number; upper?: boolean; italic?: boolean },
): string {
  const lh = opts.lineHeight ?? 1.1;
  return lines
    .map(
      (l, i) =>
        `<text x="${opts.x}" y="${opts.y + i * opts.size * lh}" font-family="${opts.family}" font-size="${opts.size}" font-weight="${opts.weight}"${opts.italic ? ' font-style="italic"' : ""} fill="${opts.fill}" text-anchor="${opts.anchor ?? "start"}"${opts.letterSpacing ? ` letter-spacing="${opts.letterSpacing}"` : ""}>${esc(opts.upper ? l.toUpperCase() : l)}</text>`,
    )
    .join("\n");
}

function paletteFor(input: TemplateInput): Palette {
  if (input.style === "seasonal" && input.campaignKey && CAMPAIGN_PALETTES[input.campaignKey]) return CAMPAIGN_PALETTES[input.campaignKey];
  const list = PALETTES[input.style];
  return list[hashSeed(input.seed) % list.length];
}

function footer(p: Palette, opts: { dark?: boolean; illustrative: boolean; y?: number }) {
  const y = opts.y ?? 1452;
  const col = opts.dark ? "#FFFFFF" : p.muted;
  return `
  <text x="60" y="${y}" font-family="${SANS}" font-size="22" font-weight="600" fill="${col}" letter-spacing="1">#ad · Affiliate link</text>
  ${opts.illustrative ? `<text x="940" y="${y}" font-family="${SANS}" font-size="20" font-weight="400" fill="${col}" text-anchor="end" opacity="0.85">Illustrative image</text>` : ""}`;
}

function cta(p: Palette, x: number, y: number, label = "See details on Amazon.in", invert = false) {
  const w = label.length * 15.5 + 70;
  const fill = invert ? p.ink : p.accent;
  const text = invert ? p.bg : "#FFFFFF";
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="68" rx="34" fill="${fill}"/>
    <text x="${x + w / 2}" y="${y + 44}" font-family="${SANS}" font-size="27" font-weight="600" fill="${text}" text-anchor="middle">${esc(label)} →</text>
  </g>`;
}

function bgImage(uri: string, x: number, y: number, w: number, h: number, clipId?: string) {
  return `<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${clipId ? ` clip-path="url(#${clipId})"` : ""}/>`;
}

// ─── Styles ─────────────────────────────────────────────────────────────
function editorial(i: TemplateInput, p: Palette): string {
  const h = fit(i.headline, 840, SERIF, 112, 64, 3);
  const sub = i.subheadline ? fit(i.subheadline, 800, SANS, 38, 28, 2) : null;
  const hasImg = Boolean(i.backgroundDataUri);
  const headY = 160 + h.size * 1.05;
  const subY = headY + (h.lines.length - 1) * h.size * 1.02 + (sub ? sub.size * 1.6 : 0);
  const textBottom = sub ? subY + (sub.lines.length - 1) * sub.size * 1.3 : headY + (h.lines.length - 1) * h.size * 1.02;
  const archTop = Math.min(920, Math.max(560, Math.round(textBottom + 70)));
  return `
  <rect width="1000" height="1500" fill="${p.bg}"/>
  <defs><clipPath id="arch"><path d="M180 1340 V${archTop + 320} A320 320 0 0 1 820 ${archTop + 320} V1340 Z"/></clipPath></defs>
  <text x="80" y="130" font-family="${SANS}" font-size="24" font-weight="600" fill="${p.accent}" letter-spacing="6">${esc(i.kicker.toUpperCase())}</text>
  <line x1="80" y1="160" x2="200" y2="160" stroke="${p.accent}" stroke-width="3"/>
  ${textBlock(h.lines, { x: 80, y: headY, size: h.size, family: SERIF, weight: 700, fill: p.ink, lineHeight: 1.02 })}
  ${sub ? textBlock(sub.lines, { x: 80, y: subY, size: sub.size, family: SANS, weight: 400, fill: p.muted, lineHeight: 1.3 }) : ""}
  ${hasImg ? bgImage(i.backgroundDataUri!, 180, archTop, 640, 1340 - archTop, "arch") : `
  <path d="M180 1340 V${archTop + 320} A320 320 0 0 1 820 ${archTop + 320} V1340 Z" fill="${p.bg2}"/>
  <circle cx="500" cy="${archTop + 380}" r="150" fill="${p.accent2}" opacity="0.55"/>
  <path d="M260 1340 C 360 1150, 640 1150, 740 1340 Z" fill="${p.accent}" opacity="0.35"/>`}
  <path d="M180 1340 V${archTop + 320} A320 320 0 0 1 820 ${archTop + 320} V1340" fill="none" stroke="${p.ink}" stroke-width="2" opacity="0.4"/>
  ${footer(p, { illustrative: hasImg, y: 1430 })}`;
}

function minimal(i: TemplateInput, p: Palette): string {
  // Shrink the text until headline + subheadline fit between the artwork (ends ~930) and the footer.
  const avail = 440;
  let h = fit(i.headline, 800, DISPLAY, 104, 52, 3);
  let sub = i.subheadline ? fit(i.subheadline, 760, SANS, 34, 24, 2) : null;
  const height = () => h.lines.length * h.size * 1.05 + (sub ? 24 + sub.lines.length * sub.size * 1.3 : 0);
  for (let max = 96; height() > avail && max >= 52; max -= 8) {
    h = fit(i.headline, 800, DISPLAY, max, 48, 3);
    if (sub) sub = fit(i.subheadline!, 760, SANS, 30, 22, 2);
  }
  const hasImg = Boolean(i.backgroundDataUri);
  const top = 960 + Math.max(0, (avail - height()) / 2);
  return `
  <rect width="1000" height="1500" fill="${p.bg}"/>
  <defs><clipPath id="sq"><rect x="170" y="270" width="660" height="640" rx="36"/></clipPath></defs>
  <text x="500" y="180" font-family="${SANS}" font-size="22" font-weight="500" fill="${p.muted}" text-anchor="middle" letter-spacing="8">${esc(i.kicker.toUpperCase())}</text>
  ${hasImg ? bgImage(i.backgroundDataUri!, 170, 270, 660, 640, "sq") : `
  <circle cx="500" cy="590" r="300" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.6"/>
  <circle cx="500" cy="590" r="225" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.4"/>
  <circle cx="500" cy="590" r="150" fill="${p.bg2}"/>
  <circle cx="500" cy="590" r="80" fill="${p.accent2}"/>
  <circle cx="500" cy="590" r="13" fill="${p.ink}"/>
  <line x1="120" y1="590" x2="200" y2="590" stroke="${p.ink}" stroke-width="2" opacity="0.5"/>
  <line x1="800" y1="590" x2="880" y2="590" stroke="${p.ink}" stroke-width="2" opacity="0.5"/>`}
  ${textBlock(h.lines, { x: 500, y: top + h.size * 0.85, size: h.size, family: DISPLAY, weight: 700, fill: p.ink, anchor: "middle", lineHeight: 1.05 })}
  ${sub ? textBlock(sub.lines, { x: 500, y: top + h.lines.length * h.size * 1.05 + 24 + sub.size * 0.85, size: sub.size, family: SANS, weight: 400, fill: p.muted, anchor: "middle", lineHeight: 1.3 }) : ""}
  ${footer(p, { illustrative: hasImg })}`;
}

function magazine(i: TemplateInput, p: Palette): string {
  const h = fit(i.headline, 860, DISPLAY, 120, 64, 3, true);
  const sub = i.subheadline ? fit(i.subheadline, 860, SERIF, 42, 30, 2) : null;
  const hasImg = Boolean(i.backgroundDataUri);
  const blockH = h.lines.length * h.size * 1.0 + (sub ? sub.lines.length * sub.size * 1.3 + 30 : 0);
  const top = 1330 - blockH;
  return `
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.bg}" stop-opacity="0.15"/>
      <stop offset="0.55" stop-color="${p.bg}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${p.bg}" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="1500" fill="${p.bg}"/>
  ${hasImg ? bgImage(i.backgroundDataUri!, 0, 0, 1000, 1500) : `
  <circle cx="820" cy="420" r="420" fill="${p.bg2}"/>
  <circle cx="160" cy="900" r="260" fill="${p.accent2}" opacity="0.25"/>
  <rect x="560" y="260" width="300" height="520" rx="150" fill="${p.accent}" opacity="0.25"/>`}
  <rect width="1000" height="1500" fill="url(#shade)"/>
  <text x="60" y="180" font-family="${SERIF}" font-size="150" font-weight="700" fill="${p.ink}" letter-spacing="-2">The Find</text>
  <line x1="60" y1="215" x2="940" y2="215" stroke="${p.ink}" stroke-width="2"/>
  <text x="60" y="255" font-family="${SANS}" font-size="22" font-weight="600" fill="${p.accent}" letter-spacing="5">${esc(i.kicker.toUpperCase())}</text>
  <text x="940" y="255" font-family="${SANS}" font-size="22" font-weight="500" fill="${p.muted}" text-anchor="end" letter-spacing="3">CURATED PICKS</text>
  ${textBlock(h.lines, { x: 60, y: top + h.size * 0.85, size: h.size, family: DISPLAY, weight: 800, fill: p.ink, lineHeight: 1.0, upper: true })}
  ${sub ? textBlock(sub.lines, { x: 60, y: top + h.lines.length * h.size + 30 + sub.size * 0.6, size: sub.size, family: SERIF, weight: 400, fill: p.muted, lineHeight: 1.3, italic: true }) : ""}
  ${footer(p, { dark: true, illustrative: hasImg })}`;
}

function productPhoto(i: TemplateInput, p: Palette): string {
  const h = fit(i.headline, 840, DISPLAY, 92, 56, 2);
  const sub = i.subheadline ? fit(i.subheadline, 840, SANS, 34, 26, 2) : null;
  const hasImg = Boolean(i.backgroundDataUri);
  return `
  <defs>
    <radialGradient id="studio" cx="0.5" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${p.bg2}"/>
    </radialGradient>
    <clipPath id="photo"><rect x="60" y="60" width="880" height="880" rx="28"/></clipPath>
  </defs>
  <rect width="1000" height="1500" fill="${p.bg}"/>
  ${hasImg ? bgImage(i.backgroundDataUri!, 60, 60, 880, 880, "photo") : `
  <rect x="60" y="60" width="880" height="880" rx="28" fill="url(#studio)"/>
  <ellipse cx="500" cy="790" rx="260" ry="54" fill="${p.accent}" opacity="0.12"/>
  <rect x="300" y="670" width="400" height="120" fill="${p.accent2}"/>
  <ellipse cx="500" cy="670" rx="200" ry="40" fill="#FFFFFF"/>
  <ellipse cx="500" cy="790" rx="200" ry="40" fill="${p.bg2}"/>
  <rect x="300" y="670" width="400" height="120" fill="${p.bg2}" opacity="0.35"/>`}
  <text x="80" y="1020" font-family="${SANS}" font-size="22" font-weight="600" fill="${p.muted}" letter-spacing="6">${esc(i.kicker.toUpperCase())}</text>
  ${textBlock(h.lines, { x: 80, y: 1030 + h.size, size: h.size, family: DISPLAY, weight: 700, fill: p.ink, lineHeight: 1.05 })}
  ${sub ? textBlock(sub.lines, { x: 80, y: 1050 + h.size + h.lines.length * h.size * 1.05, size: sub.size, family: SANS, weight: 400, fill: p.muted, lineHeight: 1.3 }) : ""}
  ${footer(p, { illustrative: hasImg })}`;
}

function lifestyle(i: TemplateInput, p: Palette): string {
  const h = fit(i.headline, 780, SERIF, 96, 56, 3);
  const sub = i.subheadline ? fit(i.subheadline, 780, SANS, 34, 26, 2) : null;
  const hasImg = Boolean(i.backgroundDataUri);
  const cardH = 140 + h.lines.length * h.size * 1.08 + (sub ? sub.lines.length * sub.size * 1.3 + 20 : 0) + 100;
  const cardY = 1400 - cardH;
  return `
  <rect width="1000" height="1500" fill="${p.bg}"/>
  ${hasImg ? bgImage(i.backgroundDataUri!, 0, 0, 1000, 1500) : `
  <path d="M0 0 H1000 V700 C 780 820, 560 560, 320 700 C 180 780, 80 720, 0 760 Z" fill="${p.bg2}"/>
  <circle cx="770" cy="330" r="190" fill="${p.accent}" opacity="0.55"/>
  <circle cx="250" cy="460" r="120" fill="${p.accent2}" opacity="0.55"/>
  <path d="M120 980 C 300 860, 520 1040, 880 900" stroke="${p.accent}" stroke-width="6" fill="none" opacity="0.4"/>`}
  <rect x="70" y="${cardY}" width="860" height="${cardH}" rx="32" fill="#FFFFFF" opacity="0.95"/>
  <text x="120" y="${cardY + 80}" font-family="${SANS}" font-size="22" font-weight="600" fill="${p.accent}" letter-spacing="5">${esc(i.kicker.toUpperCase())}</text>
  ${textBlock(h.lines, { x: 120, y: cardY + 100 + h.size, size: h.size, family: SERIF, weight: 700, fill: p.ink, lineHeight: 1.08 })}
  ${sub ? textBlock(sub.lines, { x: 120, y: cardY + 120 + h.size + h.lines.length * h.size * 1.08, size: sub.size, family: SANS, weight: 400, fill: p.muted, lineHeight: 1.3 }) : ""}
  ${footer(p, { dark: hasImg, illustrative: hasImg })}`;
}

function ornaments(campaignKey: string | null, p: Palette, seed: number): string {
  const dots: string[] = [];
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  if (campaignKey === "christmas" || campaignKey === "winter_fashion") {
    for (let k = 0; k < 60; k++) dots.push(`<circle cx="${(rnd() * 1000).toFixed(0)}" cy="${(rnd() * 1500).toFixed(0)}" r="${(2 + rnd() * 5).toFixed(1)}" fill="#FFFFFF" opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`);
    dots.push(`<path d="M500 250 L512 284 L548 284 L519 305 L530 340 L500 319 L470 340 L481 305 L452 284 L488 284 Z" fill="${p.accent}"/>`);
  } else if (campaignKey === "diwali" || campaignKey === "navratri_durga_puja") {
    for (let k = 0; k < 7; k++) {
      const x = 140 + k * 120;
      dots.push(`<path d="M${x - 34} 1385 Q${x} 1435 ${x + 34} 1385 Z" fill="${p.accent2}"/><ellipse cx="${x}" cy="1357" rx="9" ry="20" fill="${p.accent}"/>`);
    }
    for (let k = 0; k < 40; k++) dots.push(`<circle cx="${(rnd() * 1000).toFixed(0)}" cy="${(rnd() * 900).toFixed(0)}" r="${(1.5 + rnd() * 3).toFixed(1)}" fill="${p.accent}" opacity="0.6"/>`);
  } else {
    for (let k = 0; k < 30; k++) dots.push(`<circle cx="${(rnd() * 1000).toFixed(0)}" cy="${(rnd() * 1500).toFixed(0)}" r="${(3 + rnd() * 8).toFixed(1)}" fill="${k % 2 ? p.accent : p.accent2}" opacity="0.35"/>`);
  }
  return dots.join("\n");
}

function seasonal(i: TemplateInput, p: Palette): string {
  const h = fit(i.headline, 740, SERIF, 108, 60, 3);
  const sub = i.subheadline ? fit(i.subheadline, 720, SANS, 34, 26, 2) : null;
  const hasImg = Boolean(i.backgroundDataUri);
  const total = h.lines.length * h.size * 1.05 + (sub ? 40 + sub.lines.length * sub.size * 1.3 : 0);
  const top = 760 - total / 2;
  return `
  <rect width="1000" height="1500" fill="${p.bg}"/>
  ${hasImg ? `${bgImage(i.backgroundDataUri!, 0, 0, 1000, 1500)}<rect width="1000" height="1500" fill="${p.bg}" opacity="0.55"/>` : `<rect x="0" y="1100" width="1000" height="400" fill="${p.bg2}"/>`}
  ${ornaments(i.campaignKey, p, hashSeed(i.seed))}
  <rect x="90" y="360" width="820" height="800" rx="18" fill="none" stroke="${p.accent}" stroke-width="3"/>
  <rect x="110" y="380" width="780" height="760" rx="12" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.6"/>
  <text x="500" y="${top - 30}" font-family="${SANS}" font-size="24" font-weight="600" fill="${p.accent}" text-anchor="middle" letter-spacing="7">${esc(i.kicker.toUpperCase())}</text>
  ${textBlock(h.lines, { x: 500, y: top + h.size * 0.9, size: h.size, family: SERIF, weight: 700, fill: p.ink, anchor: "middle", lineHeight: 1.05 })}
  ${sub ? textBlock(sub.lines, { x: 500, y: top + h.lines.length * h.size * 1.05 + 40 + sub.size * 0.5, size: sub.size, family: SANS, weight: 400, fill: p.muted, anchor: "middle", lineHeight: 1.3 }) : ""}
  ${cta(p, 500 - (("See details on Amazon.in".length * 15.5 + 70) / 2), 1230)}
  ${footer(p, { dark: true, illustrative: hasImg })}`;
}

export function renderSvg(input: TemplateInput): string {
  const p = paletteFor(input);
  const body = {
    editorial,
    minimal,
    magazine,
    product_photo: productPhoto,
    lifestyle,
    seasonal,
  }[input.style](input, p);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">${body}</svg>`;
}
