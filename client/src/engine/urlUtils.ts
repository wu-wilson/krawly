// Tracking parameters to strip during normalization.
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'gclid', 'mc_cid', 'mc_eid',
]);

/** Matches an http(s) scheme at the start of an address */
export const HTTP_SCHEME = /^https?:\/\//i;

/**
 * Normalize a URL for deduplication: drop the fragment, tracking parameters, and a trailing slash, and sort the
 * remaining query parameters. (The URL parser already lowercases the host and drops default ports.)
 * @param url - Absolute http(s) URL to normalize
 * @returns Normalized URL
 */
export const normalizeUrl = (url: string): string => {
  const parsed = new URL(url);
  parsed.hash = '';
  const params = [...parsed.searchParams]
    .filter(([key]) => !TRACKING_PARAMS.has(key))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  parsed.search = new URLSearchParams(params).toString();

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
};

/**
 * Turn a typed or shared address into a crawlable URL, adding https:// when the scheme is missing.
 * @param raw - Address such as "example.com" or "http://example.com/blog"
 * @returns The URL, or null when its host isn't a dotted name such as example.com or it carries a username or
 * password (as a typed email address does)
 */
export const toCrawlUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const url = HTTP_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const { hostname, username, password } = new URL(url);
    if (username || password) return null;
    return hostname.includes('.') && !hostname.startsWith('.') && !hostname.endsWith('.') ? url : null;
  } catch {
    return null;
  }
};

/**
 * Get the hostname of a URL.
 * @param url - Any URL
 * @returns Hostname, or an empty string when the URL can't be parsed
 */
export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

/**
 * Check whether two URLs are on the same host.
 * @param url - URL to check
 * @param baseUrl - URL to compare against
 * @returns True when both parse and share a hostname
 */
export const isSameHost = (url: string, baseUrl: string): boolean => {
  const host = hostOf(url);
  return host !== '' && host === hostOf(baseUrl);
};
