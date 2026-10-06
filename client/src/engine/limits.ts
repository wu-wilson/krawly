import type { CrawlNode, ResourceType } from './types';

/** Hard limits on every crawl. They aren't user settings; the landing page's spec list reads them from here. */
export const CRAWL_LIMITS = {
  /** Requests in flight at once */
  maxConcurrent: 6,
  /** Deepest page recorded, in clicks from the start page; pages this deep are checked but their links aren't read */
  maxDepth: 3,
  /** Pages and files recorded per crawl */
  maxUrls: 200,
  /** Per-page timeout in ms, enforced by the proxy (REQUEST_TIMEOUT_MS) */
  requestTimeoutMs: 10000,
  /** Redirects followed per URL, enforced by the proxy (MAX_REDIRECTS) */
  maxRedirects: 5,
} as const;

/** Responses that take at least this long count as slow, in ms */
export const SLOW_RESPONSE_MS = 1000;

/**
 * Check whether a node was slow to respond.
 * @param node - Node to test
 * @returns True for responses that took at least `SLOW_RESPONSE_MS`; failed requests never count
 */
export const isSlow = (node: CrawlNode): boolean =>
  !!node.httpStatus && node.responseTime !== null && node.responseTime >= SLOW_RESPONSE_MS;

/**
 * Check whether a response is a web page, the only content the crawler reads for links. Media types are
 * case-insensitive.
 * @param contentType - The Content-Type header, if any
 * @returns True for HTML
 */
export const isHtml = (contentType: string | null | undefined): boolean => !!contentType?.toLowerCase().includes('text/html');

/**
 * Check whether the crawler reads a URL's links: pages on the crawl's site, short of the depth limit. Everything
 * else only gets a status check.
 * @param resourceType - The URL's resource type
 * @param depth - Clicks from the start page
 * @param sameHost - Whether the URL is on the crawl's host
 * @returns True when the page is fetched in full and its links followed
 */
export const followsLinks = (resourceType: ResourceType, depth: number, sameHost: boolean): boolean =>
  resourceType === 'page' && sameHost && depth < CRAWL_LIMITS.maxDepth;
