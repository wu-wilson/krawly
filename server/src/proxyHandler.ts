import { proxyFetch } from './security/safeFetch';

import type { Request, Response } from 'express';
import type { ProxyLocals } from './middleware/validateUrl';
import type { ProxyFetchOptions, ProxyFetchResult } from './security/safeFetch';

/**
 * Create a handler that fetches `res.locals.targetUrl` through the SSRF-guarded client and responds with the
 * result as JSON. Runs after `validateUrl`. When the client goes away first (a stopped crawl, or its own timeout),
 * the upstream request is abandoned too.
 * @param options - Whether to skip the body
 * @returns Express request handler
 */
export const createProxyHandler = ({ headOnly }: Pick<ProxyFetchOptions, 'headOnly'>) =>
  async (_req: Request, res: Response<ProxyFetchResult, ProxyLocals>): Promise<void> => {
    const clientGone = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) clientGone.abort();
    });
    const result = await proxyFetch(res.locals.targetUrl, { headOnly, signal: clientGone.signal });
    if (!clientGone.signal.aborted) res.json(result);
  };
