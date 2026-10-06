import { Agent, fetch } from 'undici';

import { REQUEST_TIMEOUT_MS, MAX_BODY_SIZE_BYTES, USER_AGENT, MAX_REDIRECTS } from '../constants';
import { assertSafeUrl, BlockedUrlError, guardedLookup } from './urlGuard';

import type { Response } from 'undici';

/** One redirect followed on the way to the final response */
interface RedirectHop {
  /** URL that answered with the redirect */
  url: string;
  /** Its 3xx status code */
  status: number;
}

/** What `/fetch` and `/head` respond with */
export interface ProxyFetchResult {
  /** Final HTTP status, or 0 when no response was received */
  status: number;
  /** Final response headers */
  headers: Record<string, string>;
  /** Time across every hop, in ms */
  responseTime: number;
  /** Decoded body of a 2xx HTML page, capped at MAX_BODY_SIZE_BYTES; null for everything else */
  body: string | null;
  /** URL that gave the final response, or null on failure */
  finalUrl: string | null;
  /** Redirects received, in order; when the cap is hit, the last one isn't followed */
  redirects: RedirectHop[];
  /** Why no response was received */
  error?: string;
}

/** How `proxyFetch` makes its request */
export interface ProxyFetchOptions {
  /** Check status only, without reading the body */
  headOnly: boolean;
  /** Abandons the request early, such as when the client goes away */
  signal: AbortSignal;
}

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

// Servers that don't implement HEAD answer with these; such URLs are checked with a GET instead.
const HEAD_UNSUPPORTED = new Set([405, 501]);

// Every outbound socket resolves through the guard, so the address checked is the address dialed.
const dispatcher = new Agent({ connect: { lookup: guardedLookup } });

/**
 * Fetch a URL with the SSRF guard applied at every hop, following up to MAX_REDIRECTS manually.
 * @param rawUrl - URL to fetch
 * @param options - Whether to skip the body, and a signal to abandon the request
 * @returns The final response, or a result with status 0 and an error when no response was received
 */
export const proxyFetch = async (rawUrl: string, { headOnly, signal }: ProxyFetchOptions): Promise<ProxyFetchResult> => {
  const start = Date.now();
  const redirects: RedirectHop[] = [];

  // One timeout across all hops, so chained redirects can't extend it.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abandon = () => controller.abort();
  if (signal.aborted) abandon();
  signal.addEventListener('abort', abandon);

  const request = (url: URL, method: 'GET' | 'HEAD'): Promise<Response> =>
    fetch(url, {
      method,
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'manual',
      dispatcher,
    });

  const errorResult = (message: string): ProxyFetchResult => ({
    status: 0,
    headers: {},
    responseTime: Date.now() - start,
    body: null,
    finalUrl: null,
    redirects,
    error: message,
  });

  try {
    let current = assertSafeUrl(rawUrl);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response = await request(current, headOnly ? 'HEAD' : 'GET');
      if (headOnly && HEAD_UNSUPPORTED.has(response.status)) {
        await discardBody(response);
        response = await request(current, 'GET');
      }

      const location = response.headers.get('location');
      if (REDIRECT_CODES.has(response.status) && location) {
        await discardBody(response);
        redirects.push({ url: current.toString(), status: response.status });
        // Past the last allowed hop, where the redirect points no longer matters.
        if (hop === MAX_REDIRECTS) break;
        const next = new URL(decodeLocation(location), current);
        if (next.protocol !== 'http:' && next.protocol !== 'https:') return errorResult('Invalid redirect target');
        current = assertSafeUrl(next.toString());
        continue;
      }

      // Repeated headers such as Set-Cookie are joined rather than letting the last one win.
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
      });

      // Only a successful HTML page's body is returned, since that's all the crawler reads for links; an error page's
      // body could only slow the reply down.
      const html = (headers['content-type'] ?? '').toLowerCase().includes('text/html');
      let body: string | null = null;
      if (headOnly || !response.ok || !html) await discardBody(response);
      else body = await readCappedBody(response);

      return {
        status: response.status,
        headers,
        responseTime: Date.now() - start,
        body,
        finalUrl: current.toString(),
        redirects,
      };
    }

    return errorResult('Too many redirects');
  } catch (err: unknown) {
    return errorResult(describeError(err));
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abandon);
  }
};

/**
 * Turn a thrown error into the message reported to the client, unwrapping fetch's generic "fetch failed".
 * @param err - Thrown value
 * @returns Error message
 */
const describeError = (err: unknown): string => {
  const wrapped = err instanceof Error && err.cause instanceof Error ? err.cause : err;
  // When every address for a host fails, Node reports one AggregateError with an empty message; use the first.
  const cause = wrapped instanceof AggregateError && wrapped.errors[0] instanceof Error ? wrapped.errors[0] : wrapped;
  if (cause instanceof BlockedUrlError) return cause.message;
  // A host that doesn't exist is told apart from a lookup that failed for now, so a resolver hiccup isn't
  // reported as a missing site.
  if (cause instanceof Error && 'code' in cause && cause.code === 'ENOTFOUND') return 'Hostname could not be resolved';
  if (cause instanceof Error && 'code' in cause && cause.code === 'EAI_AGAIN') return 'Hostname lookup failed';
  if (cause instanceof Error && cause.name === 'AbortError') return 'Request timed out';
  if (err instanceof TypeError && err.message === 'Invalid URL') return 'Invalid redirect target';
  return cause instanceof Error ? cause.message : 'Unknown error';
};

/**
 * Release a response's connection without reading its body.
 * @param response - Response to discard
 */
const discardBody = async (response: Response): Promise<void> => {
  // Cancelling a body that already closed or errored has nothing left to release.
  await response.body?.cancel().catch(() => {});
};

/**
 * Read a body, stopping at MAX_BODY_SIZE_BYTES, and decode it with the charset its Content-Type declares (UTF-8
 * otherwise), so links on a page in a legacy encoding resolve as a browser would. The request's abort signal stays
 * armed, so a stalled read still hits the timeout.
 * @param response - Response to read
 * @returns Decoded body
 */
const readCappedBody = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = MAX_BODY_SIZE_BYTES - size;
    if (value.byteLength >= room) {
      chunks.push(value.subarray(0, room));
      // The capped bytes are already read; a failed cancel leaves nothing to release.
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }

  return decoderFor(response.headers.get('content-type')).decode(Buffer.concat(chunks));
};

/**
 * Pick a decoder for the charset a Content-Type header declares, reading a missing or unknown one as UTF-8.
 * @param contentType - The response's Content-Type header
 * @returns Text decoder
 */
const decoderFor = (contentType: string | null) => {
  const charset = /charset="?([\w-]+)/i.exec(contentType ?? '')?.[1];
  try {
    return new TextDecoder(charset ?? 'utf-8');
  } catch {
    return new TextDecoder();
  }
};

/**
 * Read a Location header as browsers do. Header values arrive one byte per character, so a destination sent as raw
 * UTF-8 (such as `/café`) is decoded back into the characters the server meant.
 * @param location - The response's Location header
 * @returns The destination, with any non-ASCII bytes read as UTF-8
 */
const decodeLocation = (location: string): string =>
  /[\u0080-\u00ff]/.test(location) ? Buffer.from(location, 'latin1').toString('utf8') : location;
