import { useEffect } from 'react';

import { selectUrlSearch, useCrawlStore } from '../store/crawlStore';

// Writes wait for a pause in typing, since browsers limit how often a page can rewrite its history.
const WRITE_DELAY_MS = 300;

/**
 * Mirror the crawl, view, and filters into the page URL, so the address can be shared or reloaded. `readUrlState`
 * reads them back when the page loads.
 */
export const useUrlSync = (): void => {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const write = () => {
      const search = selectUrlSearch(useCrawlStore.getState());
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
      } catch {
        // A throttled write is safe to drop; the next change writes the whole state again.
      }
    };

    const unsubscribe = useCrawlStore.subscribe((state, prev) => {
      if (state.startUrl === prev.startUrl && state.view === prev.view && state.filter === prev.filter) return;
      clearTimeout(timer);
      timer = setTimeout(write, WRITE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
};
