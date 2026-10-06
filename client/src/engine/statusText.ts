import { CRAWL_LIMITS, followsLinks, isHtml, isSlow } from './limits';
import { hostOf } from './urlUtils';

import type { CrawlNode, CrawlStatus, ResourceType } from './types';

/** How a status reads at a glance: red for broken, blue for redirects, ink for success, muted while waiting or unchecked */
export type StatusTone = 'broken' | 'redirect' | 'ok' | 'muted';

/** Everything the UI says about one node's status */
export interface StatusDescription {
  /** The HTTP code to show, or null when there was no response */
  code: number | null;
  /** Short reason, such as "Not Found" or "Timed out" */
  reason: string;
  /** How the code (or, without one, the reason) is colored */
  tone: StatusTone;
}

const REASONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  206: 'Partial Content',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Content Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  418: 'I’m a Teapot',
  421: 'Misdirected Request',
  422: 'Unprocessable Content',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  508: 'Loop Detected',
  520: 'Unknown Error',
  521: 'Web Server Is Down',
  522: 'Connection Timed Out',
  523: 'Origin Is Unreachable',
  524: 'A Timeout Occurred',
  525: 'SSL Handshake Failed',
  526: 'Invalid SSL Certificate',
};

/**
 * Get the standard reason phrase for an HTTP status code.
 * @param code - HTTP status code
 * @returns Reason phrase, or a class name like "Server Error" for codes without one
 */
export const reasonPhrase = (code: number): string => {
  if (REASONS[code]) return REASONS[code];
  if (code >= 500) return 'Server Error';
  if (code >= 400) return 'Client Error';
  if (code >= 300) return 'Redirect';
  return 'Success';
};

/** Wording for a request that got no HTTP response */
interface FailureCopy {
  /** Short reason, such as "Timed out" */
  reason: string;
  /** One sentence on what happened */
  explanation: string;
  /** True when Krawly's own proxy failed, rather than the site */
  proxy?: boolean;
  /** True when the redirect itself was the problem, rather than where it pointed */
  redirect?: boolean;
}

/**
 * Explain why a node got no HTTP response. The proxy keeps the redirects it met, so a failure after one, other than the
 * redirect's own, happened where the redirect pointed.
 * @param node - A node whose request failed
 * @returns One sentence
 */
export const explainFailure = (node: CrawlNode): string => {
  const failure = describeFailure(node.error);
  return node.redirects.length > 0 && !failure.redirect ? 'This address redirects somewhere Krawly couldn’t reach.' : failure.explanation;
};

/**
 * Describe a request that got no HTTP response in plain language, keyed off the error the proxy or crawler recorded.
 * @param error - Error message recorded on the node
 * @returns A short reason, a one-sentence explanation, and whether Krawly's proxy or the redirect itself was at fault
 */
export const describeFailure = (error: string | null): FailureCopy => {
  const message = (error ?? '').toLowerCase();
  const seconds = CRAWL_LIMITS.requestTimeoutMs / 1000;
  if (message.includes('timed out')) {
    return { reason: 'Timed out', explanation: `The site didn’t respond within ${seconds} seconds.` };
  }
  if (message.includes('could not be resolved')) {
    return { reason: 'Unknown host', explanation: 'This address doesn’t exist, so Krawly couldn’t reach it.' };
  }
  if (message.includes('blocked range')) {
    return { reason: 'Private address', explanation: 'Krawly only checks public sites, so it didn’t connect to this private address.' };
  }
  if (message.includes('too many redirects')) {
    return {
      reason: 'Too many redirects',
      explanation: `This address redirects more than ${CRAWL_LIMITS.maxRedirects} times, so Krawly stopped following it.`,
      redirect: true,
    };
  }
  if (message.includes('credentials')) {
    return {
      reason: 'Bad redirect',
      explanation: 'This address redirects to one with a username or password, which Krawly doesn’t follow.',
      redirect: true,
    };
  }
  if (message.includes('invalid redirect')) {
    return {
      reason: 'Bad redirect',
      explanation: 'This address redirects somewhere that isn’t a valid web address.',
      redirect: true,
    };
  }
  if (message.includes('rate limit')) {
    return { reason: 'Rate limited', explanation: 'Krawly’s proxy is busy, so this page wasn’t checked.', proxy: true };
  }
  if (message.includes('proxy unreachable')) {
    return { reason: 'Proxy unavailable', explanation: 'Krawly couldn’t reach its own proxy, so this page wasn’t checked.', proxy: true };
  }
  if (message.startsWith('proxy')) {
    return { reason: 'Proxy error', explanation: 'Krawly’s proxy couldn’t handle this request, so this page wasn’t checked.', proxy: true };
  }
  return { reason: 'Couldn’t connect', explanation: 'Krawly couldn’t get a response from this address.' };
};

/**
 * Get the tone for an HTTP status code.
 * @param code - Status code, 0 when there was no response
 * @returns Broken for failures and 4xx/5xx, redirect for 3xx, ok otherwise
 */
export const toneForCode = (code: number): StatusTone => {
  if (code === 0 || code >= 400) return 'broken';
  if (code >= 300) return 'redirect';
  return 'ok';
};

/**
 * Describe a node's status as the code, reason, and tone to show. Redirects show the first redirect's code.
 * @param node - Crawl node
 * @returns Status description
 */
export const describeStatus = (node: CrawlNode): StatusDescription => {
  switch (node.status) {
    case 'queued':
      return { code: null, reason: 'Waiting', tone: 'muted' };
    case 'pending':
      return { code: null, reason: 'Checking', tone: 'muted' };
    case 'skipped':
      return { code: null, reason: 'Not checked', tone: 'muted' };
  }
  if (!node.httpStatus) {
    return { code: null, reason: describeFailure(node.error).reason, tone: 'broken' };
  }
  if (node.status === 'redirect') {
    const first = node.redirects[0]?.status;
    const code = first || node.httpStatus;
    return { code, reason: reasonPhrase(code), tone: 'redirect' };
  }
  return { code: node.httpStatus, reason: reasonPhrase(node.httpStatus), tone: toneForCode(node.httpStatus) };
};

/**
 * Get a node's response time, when it got a response worth timing.
 * @param node - Crawl node
 * @returns Time in ms, or null before a response and for failed requests
 */
export const responseMs = (node: CrawlNode): number | null => (node.httpStatus ? node.responseTime : null);

/**
 * Explain in a sentence or two what happened to a node and what Krawly could do with it.
 * @param node - Crawl node
 * @param scopeHost - Hostname the crawl is scoped to
 * @returns Explanation
 */
export const explainNode = (node: CrawlNode, scopeHost: string): string => {
  if (node.status === 'queued') return 'This page is waiting its turn to be checked.';
  if (node.status === 'pending') return 'Krawly is checking this page now.';
  if (node.status === 'skipped') return 'The crawl was stopped before Krawly checked this page.';
  if (!node.httpStatus) return explainFailure(node);

  const isPage = node.resourceType === 'page';
  const external = hostOf(node.url) !== scopeHost;
  let sentence: string;

  if (node.status === 'broken') {
    sentence = followsLinks(node.resourceType, node.depth, !external)
      ? 'This page returned an error, so Krawly couldn’t read any links on it.'
      : `This ${isPage ? 'link' : 'file'} returned an error.`;
  } else if (node.status === 'redirect') {
    const hops = node.redirects.length;
    const target = node.finalUrl ? displayPath(node.finalUrl, scopeHost) : 'another address';
    // A 3xx the proxy didn't follow counts as a redirect, though it led nowhere.
    if (hops > 1) sentence = `This address redirects ${hops} times before landing on ${target}.`;
    else if (hops === 1) sentence = `This address redirects to ${target}.`;
    else if (node.headers?.location) sentence = 'This address answered with a redirect that Krawly doesn’t follow.';
    else sentence = 'This address answered with a redirect but didn’t say where to go.';
  } else if (!isPage) {
    sentence = 'Krawly checked that this file loads. It doesn’t read files for links.';
  } else if (external) {
    sentence = 'This page is on another site, so Krawly checked it without following its links.';
  } else if (node.depth >= CRAWL_LIMITS.maxDepth) {
    sentence = `This page is ${clicksFromStart(node.depth)}, so Krawly checked it without reading its links.`;
  } else if (!isHtml(node.contentType)) {
    sentence = 'This link loads a file rather than a web page, so there were no links to read.';
  } else {
    sentence = `Krawly read this page and found ${plural(node.outbound.length, 'link')}.`;
  }

  if (isSlow(node) && node.responseTime !== null) {
    sentence += ` It took ${(node.responseTime / 1000).toFixed(1)} seconds to respond.`;
  }
  return sentence;
};

const TYPE_LABELS: Record<ResourceType, string> = {
  page: 'Page',
  script: 'Script',
  stylesheet: 'Stylesheet',
  image: 'Image',
  media: 'Media',
  font: 'Font',
  other: 'Other',
};

/**
 * Get the human label for a resource type.
 * @param type - Resource type
 * @returns Label such as "Stylesheet"
 */
export const typeLabel = (type: ResourceType): string => TYPE_LABELS[type];

/**
 * Describe how far a page is from the start page, in clicks.
 * @param depth - Crawl depth
 * @returns "Start page", "1 click from start", or "3 clicks from start"
 */
export const clicksFromStart = (depth: number): string => (depth === 0 ? 'Start page' : `${plural(depth, 'click')} from start`);

/**
 * Format a count with its noun, singular or plural.
 * @param count - How many
 * @param noun - Singular noun
 * @returns Text such as "1 page" or "46 pages"
 */
export const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Write what the status region announces for a crawl: its start and pauses once each, rather than every page count,
 * then the finished status sentence.
 * @param status - Where the crawl stands
 * @param host - The crawled site's host
 * @param finished - The status sentence shown once the crawl is done
 * @returns Announcement
 */
export const crawlAnnouncement = (status: CrawlStatus, host: string, finished: string): string => {
  if (status === 'crawling') return `Crawling ${host}`;
  if (status === 'paused') return 'Crawl paused';
  return finished;
};

/**
 * Describe a crawl map for assistive tech, such as "Crawl map of example.com with 46 pages, 3 broken and 2 redirecting".
 * @param host - The crawled site's host
 * @param counts - Pages found, and how many are broken or redirect
 * @returns Description
 */
export const mapSummary = (host: string, counts: { total: number; broken: number; redirects: number }): string =>
  `Crawl map of ${host} with ${plural(counts.total, 'page')}, ${counts.broken} broken and ${counts.redirects} redirecting`;

/** The page-limit note: one crawl checks at most `maxUrls` pages, so pages further out aren't included */
export const LIMIT_SENTENCE = `Krawly checks up to ${CRAWL_LIMITS.maxUrls} pages in one crawl, so pages further from your start page aren’t included.`;

/**
 * Describe where a crawl stands in one plain sentence, such as "Crawled 46 pages in 4.0 seconds".
 * @param stage - Whether the crawl is running, paused, stopped, or finished
 * @param pages - Pages found so far
 * @param seconds - Time spent crawling, shown once it finishes
 * @returns Status sentence
 */
export const crawlSentence = (stage: 'crawling' | 'paused' | 'stopped' | 'finished', pages: number, seconds: number): string => {
  if (stage === 'crawling') return `Crawling, ${plural(pages, 'page')} found`;
  if (stage === 'paused') return `Paused at ${plural(pages, 'page')}`;
  if (stage === 'stopped') return `Stopped at ${plural(pages, 'page')}`;
  return `Crawled ${plural(pages, 'page')} in ${seconds.toFixed(1)} seconds`;
};

// Longest map label, in characters.
const MAX_LABEL_CHARS = 28;

/**
 * Shorten a display path into a map label that fits beside a page: long paths keep only their last segment.
 * @param path - Display path from `displayPath`
 * @returns The path, or "…/last-segment" when it has more than one, trimmed to fit
 */
export const mapLabel = (path: string): string => {
  if (path.length <= MAX_LABEL_CHARS) return path;
  const segments = path.split('/').filter(Boolean);
  // A path with nothing before its last segment is trimmed as is, rather than marked as shortened.
  const short = segments.length > 1 ? `…/${segments[segments.length - 1]}` : path;
  return short.length <= MAX_LABEL_CHARS ? short : `${short.slice(0, MAX_LABEL_CHARS - 1)}…`;
};

/**
 * Format a short address for display. Pages on the crawled site show as their path and the site's root as its host;
 * anything elsewhere keeps its host so it's clear it's external.
 * @param url - Full URL
 * @param scopeHost - Hostname the crawl is scoped to
 * @returns Display string such as "/docs/guides" or "cdn.example.net/app.js"
 */
export const displayPath = (url: string, scopeHost: string): string => {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    if (parsed.hostname !== scopeHost) return `${parsed.hostname}${path === '/' ? '' : path}`;
    return path === '/' ? parsed.hostname : path;
  } catch {
    return url;
  }
};
