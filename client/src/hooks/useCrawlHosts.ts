import { useMemo } from 'react';

import { selectRoot, useCrawlStore } from '../store/crawlStore';

import { hostOf } from '../engine/urlUtils';

/** Hosts shown for the current crawl */
interface UseCrawlHostsReturn {
  /** Host the visitor entered */
  host: string;
  /** Host links are shown relative to; follows the start page if it redirected to another host */
  scopeHost: string;
}

/**
 * Read the current crawl's hosts, re-rendering only when they change.
 * @returns Entered and scope hosts
 */
export const useCrawlHosts = (): UseCrawlHostsReturn => {
  const startUrl = useCrawlStore((s) => s.startUrl);
  const finalUrl = useCrawlStore((s) => selectRoot(s)?.finalUrl ?? null);

  return useMemo(() => {
    const host = hostOf(startUrl ?? '');
    return { host, scopeHost: hostOf(finalUrl ?? '') || host };
  }, [startUrl, finalUrl]);
};
