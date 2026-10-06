import { CRAWL_LIMITS, followsLinks, isHtml } from './limits';
import { parseLinks } from './parser';
import { isSameHost, normalizeUrl } from './urlUtils';

import type { CrawlEdge, CrawlNode, CrawlStatus, NodeStatus, ProxyResponse, ResourceType } from './types';

/** Callbacks the crawler calls as it runs */
interface CrawlerCallbacks {
  /** A new node was discovered */
  onNodeDiscovered: (node: CrawlNode) => void;
  /** A node's data changed (status, response, links) */
  onNodeUpdated: (id: string, updates: Partial<CrawlNode>) => void;
  /** A link between two known nodes was found */
  onEdgeDiscovered: (edge: CrawlEdge) => void;
  /** A link was left out because the crawl hit its URL limit; fires once */
  onLimitReached: () => void;
  /** The crawl ran out of URLs to check; not called when it's stopped */
  onComplete: () => void;
}

/** Controls for one crawl. A crawler runs once; start a new one for the next crawl. */
interface Crawler {
  /** Begin crawling from the given URL */
  start: (url: string) => void;
  /** Stop starting new requests; in-flight requests finish */
  pause: () => void;
  /** Continue a paused crawl */
  resume: () => void;
  /** Abort in-flight requests and mark everything unchecked as skipped */
  stop: () => void;
}

/** A URL waiting for a request slot */
interface QueueItem {
  /** URL to request, as linked */
  url: string;
  /** Node id */
  id: string;
  /** Clicks from the start page */
  depth: number;
  resourceType: ResourceType;
}

const SKIPPED: Partial<CrawlNode> = { status: 'skipped' };

// The proxy enforces the per-page timeout. The client waits a little longer, so the proxy's own result, which
// says why, arrives first.
const CLIENT_TIMEOUT_MS = CRAWL_LIMITS.requestTimeoutMs + 2000;

/**
 * Map a final HTTP status to a node status.
 * @param httpStatus - Final status, 0 when there was no response
 * @param redirected - Whether redirects were followed on the way
 * @returns Node status
 */
const classifyStatus = (httpStatus: number, redirected: boolean): NodeStatus => {
  if (httpStatus >= 200 && httpStatus < 300) return redirected ? 'redirect' : 'healthy';
  if (httpStatus >= 300 && httpStatus < 400) return 'redirect';
  return 'broken';
};

/**
 * Check that a proxy reply has the shape the crawler reads.
 * @param data - Parsed JSON
 * @returns True for a proxy response
 */
const isProxyResponse = (data: unknown): data is ProxyResponse =>
  typeof data === 'object' &&
  data !== null &&
  'status' in data &&
  typeof data.status === 'number' &&
  'responseTime' in data &&
  typeof data.responseTime === 'number' &&
  'headers' in data &&
  typeof data.headers === 'object' &&
  data.headers !== null &&
  'redirects' in data &&
  Array.isArray(data.redirects);

/**
 * Build a node that hasn't been checked yet.
 * @param id - Normalized URL
 * @param url - URL as linked
 * @param resourceType - Classified type
 * @param depth - Clicks from the start page
 * @param parentId - Node whose page linked here, or null for the start page
 * @returns Queued node
 */
const createNode = (id: string, url: string, resourceType: ResourceType, depth: number, parentId: string | null): CrawlNode => ({
  id,
  url,
  status: 'queued',
  httpStatus: null,
  responseTime: null,
  contentType: null,
  resourceType,
  depth,
  inbound: [],
  outbound: [],
  redirects: [],
  finalUrl: null,
  error: null,
  headers: null,
  parentId,
});

/**
 * Create a crawler that walks a site breadth-first through the proxy, a few requests at a time. Internal pages
 * within the depth limit are fetched in full and their links followed; everything else gets a status check.
 * @param proxyBaseUrl - Base URL of the proxy server
 * @param callbacks - Receives discoveries and updates as they happen
 * @returns Crawl controls
 */
export const createCrawler = (proxyBaseUrl: string, callbacks: CrawlerCallbacks): Crawler => {
  let status: CrawlStatus = 'idle';
  const visited = new Set<string>();
  // Ids that stand for another node: the start page's final address after it redirected.
  const aliases = new Map<string, string>();
  const queue: QueueItem[] = [];
  const abortController = new AbortController();
  let discovered = 0;
  let limitReached = false;
  // Wakes the queue loop early, so a resume refills free slots and a stop ends it without waiting on a request.
  let wakeQueue: (() => void) | null = null;
  // Pages on this host are crawled; everything else is only checked.
  let scopeUrl = '';

  const isStopped = () => status === 'complete';
  const resolveId = (id: string) => aliases.get(id) ?? id;

  const failure = (message: string): ProxyResponse => ({
    status: 0,
    headers: {},
    responseTime: 0,
    body: null,
    finalUrl: null,
    redirects: [],
    error: message,
  });

  const fetchViaProxy = async (url: string, headOnly: boolean): Promise<ProxyResponse> => {
    const proxyUrl = `${proxyBaseUrl}/${headOnly ? 'head' : 'fetch'}?url=${encodeURIComponent(url)}`;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), CLIENT_TIMEOUT_MS);
    const onCrawlAbort = () => timeoutController.abort();
    abortController.signal.addEventListener('abort', onCrawlAbort);

    try {
      const response = await fetch(proxyUrl, { signal: timeoutController.signal });
      const data: unknown = await response.json().catch((err: unknown) => {
        // A stop or timeout while the body downloads is handled below; anything else is a reply that isn't JSON.
        if (timeoutController.signal.aborted) throw err;
        return null;
      });
      if (response.ok && isProxyResponse(data)) return data;
      // The proxy itself refused (rate limit, bad request, outage), so there's no target response to report.
      return failure(response.status === 429 ? 'Proxy rate limit' : `Proxy error ${response.status}`);
    } catch (err: unknown) {
      if (abortController.signal.aborted) throw new DOMException('Crawl aborted', 'AbortError');
      // The proxy answers before its own timeout, so running out the client's clock means the proxy never replied; any
      // other failure here is the browser not reaching the proxy at all.
      return failure(err instanceof Error && err.name === 'AbortError' ? 'Proxy did not respond' : 'Proxy unreachable');
    } finally {
      clearTimeout(timeoutId);
      abortController.signal.removeEventListener('abort', onCrawlAbort);
    }
  };

  /**
   * Record a page's links, discovering new nodes until the URL limit and linking to known ones.
   * @param sourceId - Page the links came from
   * @param depth - That page's depth
   * @param html - Its body
   * @param pageUrl - Address it was served from, for resolving relative links
   */
  const discoverLinks = (sourceId: string, depth: number, html: string, pageUrl: string): void => {
    // Links resolve through aliases, since a link to the start page's final address is the start page. A page's links
    // to itself lead nowhere new, so they're left out.
    const links = parseLinks(html, pageUrl).filter((link) => resolveId(link.id) !== sourceId);
    callbacks.onNodeUpdated(sourceId, { outbound: [...new Set(links.map((link) => resolveId(link.id)))] });

    for (const link of links) {
      const targetId = resolveId(link.id);
      if (!visited.has(targetId)) {
        if (discovered >= CRAWL_LIMITS.maxUrls) {
          if (!limitReached) {
            limitReached = true;
            callbacks.onLimitReached();
          }
          continue;
        }
        visited.add(targetId);
        discovered++;
        callbacks.onNodeDiscovered(createNode(targetId, link.href, link.resourceType, depth + 1, sourceId));
        queue.push({ url: link.href, id: targetId, depth: depth + 1, resourceType: link.resourceType });
      }
      callbacks.onEdgeDiscovered({ source: sourceId, target: targetId, sourceElement: link.element });
    }
  };

  const processUrl = async ({ url, id, depth, resourceType }: QueueItem): Promise<void> => {
    const fetchBody = followsLinks(resourceType, depth, isSameHost(url, scopeUrl));
    callbacks.onNodeUpdated(id, { status: 'pending' });

    try {
      const response = await fetchViaProxy(url, !fetchBody);
      const redirected = response.redirects.length > 0;

      // The start page sets the crawl's scope, so follow it if it moved (example.com to www.example.com), and
      // treat links to its final address as links to the start page.
      if (depth === 0 && redirected && response.finalUrl) {
        scopeUrl = response.finalUrl;
        const finalId = normalizeUrl(response.finalUrl);
        aliases.set(finalId, id);
      }

      callbacks.onNodeUpdated(id, {
        status: classifyStatus(response.status, redirected),
        httpStatus: response.status,
        responseTime: response.responseTime,
        headers: response.headers,
        contentType: response.headers['content-type'] ?? null,
        error: response.error ?? null,
        redirects: response.redirects,
        finalUrl: redirected ? response.finalUrl : null,
      });

      // Only successful HTML pages that are still on the crawl's site are read. An error page's links belong to
      // the site's error template, and a page that redirected elsewhere isn't part of the site.
      const pageUrl = response.finalUrl ?? url;
      const succeeded = response.status >= 200 && response.status < 300;
      const html = isHtml(response.headers['content-type']);
      if (fetchBody && succeeded && html && response.body && isSameHost(pageUrl, scopeUrl)) {
        discoverLinks(id, depth, response.body, pageUrl);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        callbacks.onNodeUpdated(id, SKIPPED);
        return;
      }
      // Anything else is a fault in handling this page; record it there so the rest of the crawl carries on.
      callbacks.onNodeUpdated(id, {
        status: 'broken',
        httpStatus: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const processQueue = async (): Promise<void> => {
    // Each request in flight, with the depth of the page it's checking.
    const inFlight = new Map<Promise<void>, number>();

    while (!isStopped() && (queue.length > 0 || inFlight.size > 0)) {
      // Each depth finishes before the next starts, so a page is always recorded at its shortest distance from the
      // start: a quick page one level deeper can't claim a link before a slower, shallower page that also has it.
      while (status === 'crawling' && inFlight.size < CRAWL_LIMITS.maxConcurrent) {
        const next = queue[0];
        if (!next || (inFlight.size > 0 && next.depth > Math.min(...inFlight.values()))) break;
        queue.shift();
        const task: Promise<void> = processUrl(next).finally(() => inFlight.delete(task));
        inFlight.set(task, next.depth);
      }

      // Wait for a request to settle or for a resume or stop. A paused crawl with nothing in flight waits on the
      // wake alone; requests already in flight finish while it's paused.
      const wake = new Promise<void>((resolve) => {
        wakeQueue = resolve;
      });
      await Promise.race([...inFlight.keys(), wake]);
      wakeQueue = null;
    }

    // Anything still queued when the crawl stopped was never checked.
    for (const item of queue) callbacks.onNodeUpdated(item.id, SKIPPED);
    queue.length = 0;

    if (!isStopped()) {
      status = 'complete';
      callbacks.onComplete();
    }
  };

  return {
    start(url: string) {
      if (status !== 'idle') return;
      status = 'crawling';
      const id = normalizeUrl(url);
      scopeUrl = url;
      visited.add(id);
      discovered = 1;
      callbacks.onNodeDiscovered(createNode(id, url, 'page', 0, null));
      queue.push({ url, id, depth: 0, resourceType: 'page' });
      void processQueue();
    },

    pause() {
      if (status === 'crawling') status = 'paused';
    },

    resume() {
      if (status !== 'paused') return;
      status = 'crawling';
      wakeQueue?.();
    },

    stop() {
      status = 'complete';
      abortController.abort();
      wakeQueue?.();
    },
  };
};
