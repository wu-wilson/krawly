---
name: crawl-engine
description: Reference for how the browser-based crawl engine works — queue flow, concurrency, hard caps, proxy interaction, redirects, and node lifecycle.
user-invocable: true
---

# Crawl Engine

The crawl engine (`client/src/engine/`) is a queue-based, breadth-first web crawler that runs entirely in the browser. It fetches pages through the server proxy to bypass CORS restrictions.

## Modules

- `crawler.ts` — Manages the crawl lifecycle: URL queue, concurrency control, depth tracking, domain scope, the URL limit, and pause, resume, and stop.
- `limits.ts` — The hard caps, shared with the landing page's spec list, plus the slow-response threshold (`SLOW_RESPONSE_MS`, 1 second, checked with `isSlow`), `isHtml`, the case-insensitive HTML content-type check, and `followsLinks`, the rule for which URLs get their links read.
- `parser.ts` — Extracts URLs from HTML using the browser's native DOMParser. Each link carries its absolute address as linked, minus the fragment (`href`), its normalized `id`, the element it came from, and a resource type. `<link>` tags count only for rels that load a resource (stylesheet, icon, apple-touch-icon, mask-icon, manifest, preload, modulepreload); hints like `preconnect` and `dns-prefetch` are ignored. Images include `<picture>` sources and audio is read too. Forms count only when they submit with GET, `srcset` is read the way browsers read it (commas can sit inside a URL), a `<meta http-equiv="refresh">` target counts as a page link (a quoted target ends at its closing quote), relative links resolve against the page's `<base href>`, and links carrying a username or password are left out entirely (no node, edge, or check). The proxy decodes pages with the charset their Content-Type declares (UTF-8 otherwise), so links in a legacy encoding resolve as a browser would.
- `urlUtils.ts` — Normalizes URLs for deduplication: lowercases hostnames, strips default ports, removes fragments and trailing slashes, sorts query parameters (keeping repeated keys in order), and strips a fixed set of tracking params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `gclid`, `mc_cid`, `mc_eid` — exact match, no wildcard). It also holds `toCrawlUrl`, which turns a typed or shared address into a crawlable URL (adding https:// and rejecting hosts without a dot or with a username or password), plus `hostOf` and `isSameHost`.
- `statusText.ts` — Everything the UI says about a node or the crawl: reason phrases, plain wording for failed requests, explanations of a sentence or two, type labels, display paths and map labels, the crawl's status sentence, and the page-limit note.
- `types.ts` — Shared TypeScript types: `CrawlNode`, `CrawlEdge`, `CrawlStatus`, `NodeStatus`, `ResourceType`, `RedirectHop`, `ProxyResponse`.

## Flow

1. User submits a URL → engine adds it to the queue at depth 0, keyed by its normalized form.
2. Engine dequeues up to 6 URLs and fetches them in parallel through the server proxy.
3. For each successful (2xx) HTML response that's still on the crawl's host after any redirects: parse all links, deduplicate them by normalized form, and enqueue new URLs at depth + 1. Error pages are never parsed, since their links belong to the site's error template.
4. URLs receive a HEAD-only check (status, no body) when any of these are true: external host, non-`page` resource type, or already at `maxDepth` (`followsLinks` in `limits.ts`). The body is only fetched for internal pages within the depth budget.
5. As soon as any request finishes, the next queued URL takes its slot, except that a depth finishes before the next one starts. That way a page is always recorded at its shortest distance from the start, however the responses are timed. The loop runs until the queue is empty. Once 200 URLs are discovered, new links are left out; the first one left out fires `onLimitReached`, which drives the limit notice.

## Scope

The crawl's host starts as the start URL's host. If the start page redirects to another host (example.com to www.example.com), the scope follows the final URL, so the rest of the site isn't treated as external. The final URL also becomes an alias of the start page, so links back to it join the start node instead of adding a duplicate.

Requests always use the address exactly as it was linked. The normalized form is only a deduplication key: requesting it instead would turn every `/about/` link into a redirect to `/about`.

## Redirects

The proxy follows up to 5 redirects manually, re-validating every hop, and returns them as `redirects: [{ url, status }]` beside the final response. A node that redirected before a successful response gets the `redirect` status; the UI shows the first hop's code ("301 Moved Permanently") and the full chain in the detail panel. A redirect that ends in an error is `broken`. A proxy reply without the expected shape is recorded as a failed request. `/fetch` returns a body only for successful (2xx) HTML pages, the only content the crawler reads.

## Node Statuses

- `queued` — discovered, waiting for a request slot
- `pending` — being fetched
- `healthy` — 2xx at the requested address
- `redirect` — redirected before a 2xx, or answered a 3xx the proxy doesn't follow (no destination, or a 300 or 304)
- `broken` — 4xx, 5xx, or no response (timeout, unknown host, private address, too many redirects)
- `skipped` — never checked because the crawl was stopped ("Not checked" in the UI); not counted as broken

## Hard Caps (not user-configurable, see `limits.ts`)

- Max concurrent requests: 6
- Max crawl depth: 3
- Max total URLs: 200
- Per-request timeout: 10 seconds at the proxy (`REQUEST_TIMEOUT_MS`). The client aborts 2 seconds later, so the proxy's own timeout reply arrives first; when the client's clock runs out instead, the proxy never answered, and the failure is worded as the proxy's.
- Redirects followed per URL: 5 (`MAX_REDIRECTS` on the server, mirrored for copy in `CRAWL_LIMITS.maxRedirects`)
- No retries — each URL gets one attempt. The proxy itself checks servers that reject HEAD (405 or 501) with a GET instead.

## Constraints

- Never fetch the same normalized URL twice (enforced by a visited Set).
- A page's links to itself aren't recorded, so link counts, edges, and exports leave them out.
- The concurrency cap is the only client-side throttle. The server's rate limit defaults to 1000 requests per IP per minute (`RATE_LIMIT_PER_MINUTE`). A proxy refusal (such as a 429 or an outage) is recorded as a failed request, not as the target's status, and its copy blames the proxy rather than the site.
- If a request times out or fails, the node is marked as `broken` (not left pending).
- Pausing starts no new requests; those already in flight finish, and a crawl whose queue empties while paused completes.
- If the crawl is stopped (AbortError), in-flight and queued nodes are marked `skipped`.
- The engine reports discoveries and updates through `CrawlerCallbacks`; `hooks/useCrawl.ts` routes them into the Zustand store in real time and calls the crawler's `pause`, `resume`, and `stop` when the store's status changes. The store records the end time, time spent paused, and whether the crawl finished or was stopped, which together drive the status sentence ("Crawled 46 pages in 4.0 seconds", "Stopped at 23 pages").
