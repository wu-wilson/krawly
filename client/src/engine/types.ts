/** Status of the overall crawl */
export type CrawlStatus = 'idle' | 'crawling' | 'paused' | 'complete';

/**
 * Status of a node. `redirect` means the URL redirected before a successful response, or answered 3xx without a
 * destination; `skipped` means the crawl was stopped before the node was checked.
 */
export type NodeStatus = 'queued' | 'pending' | 'healthy' | 'redirect' | 'broken' | 'skipped';

/** Type of resource discovered */
export type ResourceType = 'page' | 'script' | 'stylesheet' | 'image' | 'media' | 'font' | 'other';

/** One redirect followed on the way to a URL's final response */
export interface RedirectHop {
  /** URL that answered with the redirect */
  url: string;
  /** Its 3xx status code */
  status: number;
}

/** A single crawled URL */
export interface CrawlNode {
  /** Normalized URL, used as the unique key */
  id: string;
  /** URL as linked, used for requests and display */
  url: string;
  /** Current status of this node */
  status: NodeStatus;
  /** Final HTTP status code; null until checked, 0 when no response was received */
  httpStatus: number | null;
  /** Response time in ms, null until checked */
  responseTime: number | null;
  /** Content-Type header value */
  contentType: string | null;
  /** Classified resource type */
  resourceType: ResourceType;
  /** Clicks from the start page */
  depth: number;
  /** Ids of the nodes that link here */
  inbound: string[];
  /** Ids of the URLs this page links to, including any left out at the URL limit */
  outbound: string[];
  /** Redirects followed before the final response, in order */
  redirects: RedirectHop[];
  /** Where the URL finally landed, when it redirected */
  finalUrl: string | null;
  /** Why no response was received */
  error: string | null;
  /** Response headers */
  headers: Record<string, string> | null;
  /** Id of the node whose page first linked here */
  parentId: string | null;
}

/** A directed edge between two nodes */
export interface CrawlEdge {
  /** Source node id */
  source: string;
  /** Target node id */
  target: string;
  /** HTML element that created this link (e.g., "a", "script", "img") */
  sourceElement: string;
}

/** Response from the proxy's /fetch and /head endpoints */
export interface ProxyResponse {
  /** Final HTTP status, or 0 when no response was received */
  status: number;
  /** Final response headers */
  headers: Record<string, string>;
  /** Time across every hop, in ms */
  responseTime: number;
  /** Decoded body of a 2xx HTML page; null for /head, error statuses, non-HTML responses, and failures */
  body: string | null;
  /** URL that gave the final response, or null on failure */
  finalUrl: string | null;
  /** Redirects followed before the final response, in order */
  redirects: RedirectHop[];
  /** Why no response was received */
  error?: string;
}
