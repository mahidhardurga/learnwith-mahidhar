// Decides, for every H2 section and interview question of a guide page, the experience level it targets.
// Used by the rehype plugin at build time and by the validation script.

export const RANKS = ['beginner', 'mid', 'senior'];

/** Headings that are never gated: every reader benefits from them. */
const ALWAYS = [/^try it/i, /^check yourself/i, /^key takeaways?/i, /^pitfalls?/i, /^common mistakes/i];
export const QA_HEADING = /^common interview questions/i;

/** Pages whose content is already organised by level: no per-section gating. */
export const SKIP_PAGES = new Set(['/toolkit/questions-fresher', '/toolkit/questions-mid-level', '/toolkit/questions-senior']);

export function isAlways(heading) {
  return ALWAYS.some((re) => re.test(heading));
}

/** Heading text as plain text: no backticks or bold markers. */
export function plain(text) {
  return text.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
}

function clamp(n) {
  return Math.max(0, Math.min(2, n));
}

/** Override lookup: exact plain-text key, else a `prefix*` wildcard key. */
export function lookupOverride(overrides, heading) {
  if (overrides[heading]) return overrides[heading];
  for (const [key, level] of Object.entries(overrides)) {
    if (key.endsWith('*') && heading.startsWith(key.slice(0, -1))) return level;
  }
  return undefined;
}

/**
 * @returns the level of a section, or null when the section is never gated
 */
export function sectionLevel(pageLevel, heading, overrides = {}) {
  if (isAlways(heading) || QA_HEADING.test(heading)) return null;
  return lookupOverride(overrides, heading) ?? pageLevel;
}

/** Level for the k-th (0-based) of n interview questions on a page of `pageLevel`. */
export function questionLevel(pageLevel, k, n) {
  const base = RANKS.indexOf(pageLevel);
  const p = n > 1 ? k / (n - 1) : 0.5;
  const delta = p < 0.34 ? -1 : p > 0.7 ? 1 : 0;
  return RANKS[clamp(base + delta)];
}
