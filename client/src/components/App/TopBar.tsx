import React, { useCallback } from 'react';

import { KrawlyLogo } from '../Brand/KrawlyLogo';
import { KrawlyMark } from '../Brand/KrawlyMark';
import { SegmentedControl } from '../UI/SegmentedControl';
import { DIVIDER, FOCUS_RING, HOVER_TRANSITION } from '../UI/styles';
import { CrawlActions } from './CrawlActions';

import { useCopy } from '../../hooks/useCopy';
import { useCrawlHosts } from '../../hooks/useCrawlHosts';
import { useStatusLine } from '../../hooks/useStatusLine';
import { selectRootFailed, selectUrlSearch, useCrawlStore } from '../../store/crawlStore';

import { crawlAnnouncement, LIMIT_SENTENCE } from '../../engine/statusText';
import { VIEW_OPTIONS } from './options';

interface TopBarProps {
  /** Leave the crawl and return to the landing page */
  onHome: () => void;
}

const COPY_RESULTS = { copied: 'Link copied', failed: 'Couldn’t copy the link' } as const;

/**
 * The app's top bar: logo, site, a plain status sentence, the Graph/Report switch, and the crawl's actions. On
 * phones the actions fold into a menu, the view switch moves to the row below, and a copied share link is
 * confirmed in place of the status sentence. A silk loading line runs along the bottom while a crawl is running.
 * @param props - Home handler
 * @returns App header
 */
export const TopBar: React.FC<TopBarProps> = ({ onHome }) => {
  const status = useCrawlStore((s) => s.status);
  const view = useCrawlStore((s) => s.view);
  const setView = useCrawlStore((s) => s.setView);
  const rootFailed = useCrawlStore(selectRootFailed);
  const limitReached = useCrawlStore((s) => s.limitReached);
  const { host } = useCrawlHosts();
  const statusLine = useStatusLine();
  const { copy, state: copyState } = useCopy();

  // Shared links rerun the crawl, so they carry the start URL plus the current view and filters.
  const handleShare = useCallback(() => {
    const search = selectUrlSearch(useCrawlStore.getState());
    if (search) copy(`${window.location.origin}${window.location.pathname}?${search}`);
  }, [copy]);

  const copyResult = copyState === 'idle' ? null : COPY_RESULTS[copyState];
  const announcement = crawlAnnouncement(status, host, statusLine);

  return (
    <header className="relative border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between gap-3 pl-4 pr-3 sm:h-12 sm:gap-5 sm:px-5">
        <div className="flex min-w-0 items-center gap-1 sm:gap-3.5">
          <button
            type="button"
            onClick={onHome}
            aria-label="Back to the Krawly home page"
            className={`flex flex-none items-center rounded-sm text-ink hover:text-ink-2 max-sm:-ml-[11px] max-sm:h-11 max-sm:w-11
              max-sm:justify-center sm:-ml-0.5 coarse:h-9 ${HOVER_TRANSITION} ${FOCUS_RING}`}
          >
            <KrawlyMark size={22} className="sm:hidden" />
            <KrawlyLogo size="sm" className="max-sm:hidden" />
          </button>
          <span aria-hidden="true" className={`${DIVIDER} max-sm:hidden`} />
          {/* The host gives way first when space runs out, so the status sentence stays readable. */}
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-3.5">
            <h1 className="shrink-[3] truncate text-sm font-semibold tracking-[-0.01em] sm:text-[13px]">{host}</h1>
            <span className={`truncate text-xs tabular-nums text-ink-3 sm:text-[12.5px] ${copyResult ? 'max-sm:hidden' : ''}`}>
              {statusLine}
            </span>
            {copyResult && (
              <span className={`text-xs sm:hidden ${copyState === 'failed' ? 'text-broken' : 'text-ink-3'}`}>{copyResult}</span>
            )}
          </div>
          {/* Announce the crawl's state once per change rather than on every page count, plus reaching the page limit
              and how a copy went. */}
          <span role="status" className="sr-only">
            {limitReached ? `${announcement}. ${LIMIT_SENTENCE}` : announcement}
          </span>
          <span role="status" className="sr-only">
            {copyResult ?? ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!rootFailed && (
            <>
              <SegmentedControl label="View" size="md" options={VIEW_OPTIONS} value={view} onChange={setView} className="max-sm:hidden" />
              <span aria-hidden="true" className={`${DIVIDER} max-sm:hidden`} />
            </>
          )}
          <CrawlActions onShare={handleShare} copyState={copyState} />
        </div>
      </div>

      {/* The sweep pauses whenever the crawl isn't running, so the faded line stops repainting. */}
      <span
        aria-hidden="true"
        className={`loader-sweep absolute inset-x-0 -bottom-px h-0.5 transition-opacity duration-700 ease-quart
          ${status === 'crawling' ? 'opacity-[0.85]' : 'opacity-0 [animation-play-state:paused]'}`}
      />
    </header>
  );
};
