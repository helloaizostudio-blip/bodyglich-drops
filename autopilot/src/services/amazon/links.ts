/**
 * Affiliate link validation. The app never builds affiliate links by guessing:
 * links come from the Creators API (detailPageURL already carries your tag) or are
 * pasted from Associates Central / SiteStripe.
 */
const AMAZON_IN_HOSTS = new Set(["amazon.in", "www.amazon.in", "m.amazon.in"]);
const SHORT_HOSTS = new Set(["amzn.to", "amzn.in", "amzn.eu", "link.amazon"]);
const ASIN_RE = /^[A-Z0-9]{10}$/;

export interface LinkCheck {
  valid: boolean;
  reason: string;
  kind: "full" | "short" | "invalid";
  asin: string | null;
  tag: string | null;
}

export function extractAsin(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

export function isValidAsin(asin: string): boolean {
  return ASIN_RE.test(asin);
}

export function checkAffiliateLink(raw: string | null | undefined, partnerTag: string | undefined, expectedAsin?: string): LinkCheck {
  if (!raw) return { valid: false, reason: "No affiliate link", kind: "invalid", asin: null, tag: null };
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { valid: false, reason: "Not a valid URL", kind: "invalid", asin: null, tag: null };
  }
  if (url.protocol !== "https:") {
    return { valid: false, reason: "Link must use https", kind: "invalid", asin: null, tag: null };
  }
  const host = url.hostname.toLowerCase();

  if (SHORT_HOSTS.has(host)) {
    if (url.pathname.length < 3) return { valid: false, reason: "Short link has no code", kind: "invalid", asin: null, tag: null };
    return {
      valid: true,
      reason: "Amazon short link from SiteStripe (tracking ID cannot be checked offline)",
      kind: "short",
      asin: null,
      tag: null,
    };
  }

  if (!AMAZON_IN_HOSTS.has(host)) {
    return { valid: false, reason: `Not an amazon.in link (${host})`, kind: "invalid", asin: null, tag: null };
  }

  const asin = extractAsin(url.pathname);
  const tag = url.searchParams.get("tag");
  if (!tag) return { valid: false, reason: "Link has no tracking tag (tag=…)", kind: "invalid", asin, tag: null };
  if (partnerTag && tag !== partnerTag) {
    return { valid: false, reason: `Tracking tag "${tag}" does not match your tag "${partnerTag}"`, kind: "invalid", asin, tag };
  }
  if (!partnerTag && !/-21$/.test(tag)) {
    return { valid: false, reason: `Tag "${tag}" does not look like an Amazon.in tracking ID`, kind: "invalid", asin, tag };
  }
  if (expectedAsin && asin && asin !== expectedAsin.toUpperCase()) {
    return { valid: false, reason: `Link points to ${asin}, expected ${expectedAsin}`, kind: "invalid", asin, tag };
  }
  return { valid: true, reason: partnerTag ? "Tracking tag matches" : "Tag present (set AMAZON_PARTNER_TAG to verify it)", kind: "full", asin, tag };
}
