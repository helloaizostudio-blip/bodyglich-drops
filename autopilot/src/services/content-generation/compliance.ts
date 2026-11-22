/**
 * Compliance rules applied to every generated pin, whether written by Claude or by templates.
 * - Affiliate disclosure: "#ad" at the start (visible before truncation) + the Amazon Associates
 *   statement at the end, next to the outbound link.
 * - Pinterest limits: title ≤ 100 chars, description ≤ 500 chars.
 * - No prices on pins (Amazon prices change; stale prices would mislead).
 * - No health / skincare effectiveness claims.
 */
export const DISCLOSURE_PREFIX = "#ad";
export const ASSOCIATES_STATEMENT = "As an Amazon Associate I earn from qualifying purchases.";
export const FULL_DISCLOSURE = `${DISCLOSURE_PREFIX} · ${ASSOCIATES_STATEMENT}`;

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const ALT_MAX = 500;

const EFFECTIVENESS_CLAIMS: RegExp[] = [
  /clinically[-\s]proven/gi,
  /dermatologist[-\s](approved|recommended)/gi,
  /\b(cures?|heals?|treats?)\b/gi,
  /\b(removes?|eliminates?|erases?)\s+(acne|wrinkles|pigmentation|dark\s+spots|scars|tan|stretch\s+marks)/gi,
  /\banti[-\s]?ageing|anti[-\s]?aging/gi,
  /\b(guaranteed|guarantee)\b/gi,
  /\bfairness|whiten(ing|s)?|skin\s+lightening\b/gi,
  /\b(hair\s*growth|regrow)\b/gi,
  /\bweight\s*loss|lose\s+weight|burns?\s+fat\b/gi,
  /\b100\s*%\s*(safe|natural|effective)\b/gi,
  /\bbest\s+(ever|in\s+the\s+world)\b/gi,
  /\bmiracle\b/gi,
];

const PRICE_PATTERN = /(₹|rs\.?|inr)\s?\d[\d,]*(\.\d+)?|\d[\d,]*\s?(₹|rupees)/gi;
const URL_PATTERN = /https?:\/\/\S+/gi;

export interface ComplianceResult {
  title: string;
  description: string;
  headline: string;
  subheadline: string | null;
  altText: string;
  flags: string[];
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

function stripDisclosure(s: string): string {
  return s
    .replace(new RegExp(ASSOCIATES_STATEMENT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
    .replace(/#ad\b\s*[·|-]?\s*/gi, "")
    .replace(/#(affiliate|sponsored)\b/gi, "")
    .trim();
}

export function findClaims(text: string): string[] {
  const hits = new Set<string>();
  for (const re of EFFECTIVENESS_CLAIMS) {
    for (const m of text.matchAll(new RegExp(re.source, re.flags))) hits.add(m[0].toLowerCase());
  }
  return [...hits];
}

export function applyCompliance(input: {
  title: string;
  description: string;
  headline: string;
  subheadline?: string | null;
  altText: string;
  sensitiveCategory: boolean;
}): ComplianceResult {
  const flags: string[] = [];
  let { title, description, headline } = input;
  let subheadline = input.subheadline ?? null;

  for (const [field, value] of Object.entries({ title, description, headline, subheadline: subheadline ?? "" })) {
    if (PRICE_PATTERN.test(value)) flags.push(`Removed price from ${field} (prices change; pins must not show stale prices)`);
    PRICE_PATTERN.lastIndex = 0;
  }
  const noPrice = (s: string) => s.replace(PRICE_PATTERN, "").replace(/\s{2,}/g, " ").trim();
  title = noPrice(stripDisclosure(title));
  headline = noPrice(headline);
  subheadline = subheadline ? noPrice(subheadline) : null;
  description = noPrice(stripDisclosure(description)).replace(URL_PATTERN, "").trim();

  const claims = findClaims(`${title} ${description} ${headline} ${subheadline ?? ""}`);
  if (claims.length) {
    flags.push(
      `${input.sensitiveCategory ? "Health/beauty" : "Unverified"} claim language found: ${claims.join(", ")} — edit before approving`,
    );
  }

  title = clip(title, TITLE_MAX);
  const reserved = DISCLOSURE_PREFIX.length + 1 + 2 + ASSOCIATES_STATEMENT.length; // "#ad " + "\n\n" + statement
  const body = clip(description, DESCRIPTION_MAX - reserved);
  description = `${DISCLOSURE_PREFIX} ${body}\n\n${ASSOCIATES_STATEMENT}`;

  return {
    title,
    description,
    headline: clip(headline, 60),
    subheadline: subheadline ? clip(subheadline, 90) : null,
    altText: clip(input.altText, ALT_MAX),
    flags,
  };
}

/** Validation used before a pin can be approved or sent. */
export function validateForPublishing(pin: { title: string; description: string; link: string; board: string }): string[] {
  const errors: string[] = [];
  if (!pin.title.trim()) errors.push("Title is empty");
  if (pin.title.length > TITLE_MAX) errors.push(`Title is longer than ${TITLE_MAX} characters`);
  if (pin.description.length > DESCRIPTION_MAX) errors.push(`Description is longer than ${DESCRIPTION_MAX} characters`);
  if (!/#ad\b/i.test(pin.description)) errors.push("Description is missing the #ad disclosure");
  if (!pin.description.includes(ASSOCIATES_STATEMENT)) errors.push("Description is missing the Amazon Associates statement");
  if (!pin.board.trim()) errors.push("No board selected");
  if (!pin.link.trim()) errors.push("No affiliate link");
  return errors;
}
