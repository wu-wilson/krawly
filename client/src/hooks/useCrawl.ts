import { useCallback, useRef } from 'react';

import { useCrawlStore } from '../store/crawlStore';

import { createCrawler } from '../engine/crawler';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

interface UseCrawlReturn {
  /** Start a crawl, replacing any crawl in progress */
  startCrawl: (url: string) => void;
  /** Stop any crawl and clear its results */
  clearCrawl: () => void;
}

/**
 * Run crawls against the store: each crawl gets its own crawler, wired so the store's pause, resume, and stop
 * reach it and its discoveries reach the store.
 * @returns Crawl controls
 */
export const useCrawl = (): UseCrawlReturn => {
  const teardownRef = useRef<(() => void) | null>(null);

  const teardown = useCallback(() => {
    teardownRef.current?.();
    teardownRef.current = null;
  }, []);

  const startCrawl = useCallback((url: string) => {
    teardown();
    const store = useCrawlStore.getState();
    store.beginCrawl(url);

    // Gates every store write from this crawler, so a torn-down crawler's leftover async work can't write into
    // the next crawl.
    let alive = true;
    const crawler = createCrawler(PROXY_URL, {
      onNodeDiscovered: (node) => {
        if (alive) store.addNode(node);
      },
      onNodeUpdated: (id, updates) => {
        if (alive) store.updateNode(id, updates);
      },
      onEdgeDiscovered: (edge) => {
        if (alive) store.addEdge(edge);
      },
      onLimitReached: () => {
        if (alive) store.setLimitReached();
      },
      onComplete: () => {
        if (alive) store.completeCrawl();
      },
    });

    const unsubscribe = useCrawlStore.subscribe((state, prev) => {
      if (state.status === prev.status) return;
      if (state.status === 'paused') crawler.pause();
      else if (state.status === 'crawling') crawler.resume();
      else if (state.status === 'complete') crawler.stop();
    });

    teardownRef.current = () => {
      alive = false;
      crawler.stop();
      unsubscribe();
    };

    crawler.start(url);
  }, [teardown]);

  const clearCrawl = useCallback(() => {
    teardown();
    useCrawlStore.getState().resetCrawl();
  }, [teardown]);

  return { startCrawl, clearCrawl };
};
