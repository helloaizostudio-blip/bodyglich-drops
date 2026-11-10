/**
 * YouTube's documented metadata limits (YouTube Data API, `videos` resource → `snippet`).
 * Shared by the Publishing Center form and its server actions so both agree.
 */
export const YT_TITLE_MAX = 100;
export const YT_DESCRIPTION_MAX = 5000;
export const YT_TAGS_MAX = 500;
/** YouTube's documented maximum file size for a custom thumbnail. */
export const YT_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Characters the tag list uses towards YouTube's 500-character limit: the commas between
 * tags count, and a tag containing a space counts as if it were wrapped in quotation marks.
 */
export function tagCharacters(tags: string[]): number {
  if (!tags.length) return 0;
  return tags.reduce((total, tag) => total + tag.length + (/\s/.test(tag) ? 2 : 0), 0) + (tags.length - 1);
}

/** Cleans one typed tag: no leading #, no commas or angle brackets, single spaces. */
export function normalizeTag(raw: string): string {
  return raw
    .replace(/[,<>]/g, " ")
    .replace(/^[\s#]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Adds tags to a list, skipping blanks and case-insensitive duplicates. */
export function mergeTags(existing: string[], incoming: string[]): string[] {
  const out = [...existing];
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  for (const raw of incoming) {
    const tag = normalizeTag(raw);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
}

/** YouTube rejects titles and descriptions that contain angle brackets. */
export const hasAngleBrackets = (text: string) => /[<>]/.test(text);

/** Problems that would make YouTube reject this metadata. Empty when everything fits. */
export function metadataProblems(v: { title: string; description: string; tags: string[] }): string[] {
  const problems: string[] = [];
  if (v.title.length > YT_TITLE_MAX) problems.push(`The title is ${v.title.length - YT_TITLE_MAX} characters over YouTube's ${YT_TITLE_MAX}-character limit.`);
  if (v.description.length > YT_DESCRIPTION_MAX) {
    problems.push(`The description is ${v.description.length - YT_DESCRIPTION_MAX} characters over YouTube's ${YT_DESCRIPTION_MAX}-character limit.`);
  }
  const tagChars = tagCharacters(v.tags);
  if (tagChars > YT_TAGS_MAX) problems.push(`The tags are ${tagChars - YT_TAGS_MAX} characters over YouTube's ${YT_TAGS_MAX}-character limit.`);
  if (hasAngleBrackets(v.title)) problems.push("YouTube does not allow < or > in a title.");
  if (hasAngleBrackets(v.description)) problems.push("YouTube does not allow < or > in a description.");
  return problems;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}
