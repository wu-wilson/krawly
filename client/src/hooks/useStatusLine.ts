import { selectRoot, selectRootFailed, useCrawlStore } from '../store/crawlStore';

import { crawlSentence, describeStatus } from '../engine/statusText';

/**
 * Build the plain status sentence for the top bar, such as "Crawled 46 pages in 4.0 seconds".
 * @returns Status sentence, the start page's code and reason when it failed, or empty before a crawl starts
 */
export const useStatusLine = (): string => {
  const status = useCrawlStore((s) => s.status);
  const total = useCrawlStore((s) => s.stats.total);
  const root = useCrawlStore(selectRoot);
  const rootFailed = useCrawlStore(selectRootFailed);
  const startTime = useCrawlStore((s) => s.startTime);
  const endTime = useCrawlStore((s) => s.endTime);
  const pausedMs = useCrawlStore((s) => s.pausedMs);
  const endReason = useCrawlStore((s) => s.endReason);

  if (status === 'crawling' || status === 'paused') return crawlSentence(status, total, 0);
  if (status !== 'complete') return '';
  if (rootFailed && root) {
    const { code, reason } = describeStatus(root);
    return code ? `${code} ${reason}` : reason;
  }
  const seconds = startTime && endTime ? Math.max(0, (endTime - startTime - pausedMs) / 1000) : 0;
  return crawlSentence(endReason === 'stopped' ? 'stopped' : 'finished', total, seconds);
};
