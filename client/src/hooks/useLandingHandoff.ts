import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { DEFAULT_VIEW, useCrawlStore } from '../store/crawlStore';

import { readUrlState } from '../utils/urlState';

// Matches the landing page's `duration-200` fade, so the app takes over once the landing is out of view.
const LANDING_FADE_MS = 200;

interface UseLandingHandoffReturn {
  /** Whether the landing page shows instead of the app */
  showLanding: boolean;
  /** True while the landing page fades out before a crawl */
  isTransitioning: boolean;
  /** Address the landing page's field starts with, after "Change address" */
  draftAddress: string | undefined;
  /** Fade the landing page out, then start a crawl */
  startFromLanding: (url: string) => void;
  /** Clear the crawl, reset the view and filters, and return to the landing page */
  goHome: (address?: string) => void;
}

/**
 * Hand off between the landing page and the app: open straight into a shared link's crawl, fade the landing page
 * out before a crawl starts, and return to it with an address ready to edit.
 * @param startCrawl - Start a crawl, replacing any in progress
 * @param clearCrawl - Stop any crawl and clear its results
 * @returns Landing state and the handoff actions
 */
export const useLandingHandoff = (startCrawl: (url: string) => void, clearCrawl: () => void): UseLandingHandoffReturn => {
  const [sharedUrl] = useState(() => readUrlState().startUrl);
  const [showLanding, setShowLanding] = useState(sharedUrl === null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [draftAddress, setDraftAddress] = useState<string | undefined>(undefined);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = useRef(false);

  // A shared link (`?u=`) opens straight into its crawl, before the first paint so nothing flashes. Once per mount,
  // since Strict Mode runs effects twice.
  useLayoutEffect(() => {
    if (!sharedUrl || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startCrawl(sharedUrl);
  }, [sharedUrl, startCrawl]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    },
    [],
  );

  const startFromLanding = useCallback(
    (url: string) => {
      // A second submit during the fade would start a second crawl.
      if (fadeTimerRef.current) return;
      setIsTransitioning(true);
      fadeTimerRef.current = setTimeout(() => {
        fadeTimerRef.current = null;
        setShowLanding(false);
        setIsTransitioning(false);
        setDraftAddress(undefined);
        startCrawl(url);
      }, LANDING_FADE_MS);
    },
    [startCrawl],
  );

  const goHome = useCallback(
    (address?: string) => {
      clearCrawl();
      const { clearFilters, setView } = useCrawlStore.getState();
      clearFilters();
      setView(DEFAULT_VIEW);
      setDraftAddress(address);
      setShowLanding(true);
    },
    [clearCrawl],
  );

  return { showLanding, isTransitioning, draftAddress, startFromLanding, goHome };
};
