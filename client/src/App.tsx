import React, { useCallback, useState } from 'react';

import { CrawlFailed } from './components/App/CrawlFailed';
import { FilterBar } from './components/App/FilterBar';
import { LimitNotice } from './components/App/LimitNotice';
import { PhoneControls } from './components/App/PhoneControls';
import { TopBar } from './components/App/TopBar';
import { DetailPanel, PANEL_QUERY, PANEL_WIDTH, SHEET_HEIGHT } from './components/Detail/DetailPanel';
import { GraphView } from './components/Graph/GraphView';
import { LandingPage } from './components/Landing/LandingPage';
import { ReportView } from './components/Report/ReportView';

import { useCrawl } from './hooks/useCrawl';
import { useLandingHandoff } from './hooks/useLandingHandoff';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useUrlSync } from './hooks/useUrlSync';
import { selectRootFailed, useCrawlStore } from './store/crawlStore';

/**
 * Root application component: the landing page until a crawl starts, then the app.
 * @returns The landing page or the app shell
 */
export const App: React.FC = () => {
  const status = useCrawlStore((s) => s.status);
  const view = useCrawlStore((s) => s.view);
  const setView = useCrawlStore((s) => s.setView);
  const selectNode = useCrawlStore((s) => s.selectNode);
  const detailsOpen = useCrawlStore((s) => s.selectedNodeId !== null && s.view === 'graph');
  const limitReached = useCrawlStore((s) => s.limitReached);
  const rootFailed = useCrawlStore(selectRootFailed);
  const detailLayout = useMediaQuery(PANEL_QUERY) ? 'panel' : 'sheet';
  const { startCrawl, clearCrawl } = useCrawl();
  const { showLanding, isTransitioning, draftAddress, startFromLanding, goHome } = useLandingHandoff(startCrawl, clearCrawl);

  useUrlSync();

  // The address field assumes https://, so only an http:// address keeps its scheme.
  const handleChangeAddress = useCallback(() => {
    goHome(useCrawlStore.getState().startUrl?.replace(/^https:\/\//i, ''));
  }, [goHome]);

  const handleRetry = useCallback(() => {
    const { startUrl } = useCrawlStore.getState();
    if (startUrl) startCrawl(startUrl);
  }, [startCrawl]);

  // Bumped when a report row opens a page, so focus follows to the details even when they already show that page.
  const [detailsFocus, setDetailsFocus] = useState(0);
  const handleShowInGraph = useCallback(
    (id: string) => {
      selectNode(id);
      setView('graph');
      setDetailsFocus((n) => n + 1);
    },
    [selectNode, setView],
  );

  if (showLanding && status === 'idle') {
    return <LandingPage onStartCrawl={startFromLanding} isTransitioning={isTransitioning} initialAddress={draftAddress} />;
  }

  // The map leaves room for the details, beside it as a side panel or under it as a sheet.
  const insetRight = detailsOpen && detailLayout === 'panel' ? PANEL_WIDTH : 0;
  const insetBottom = detailsOpen && detailLayout === 'sheet' ? SHEET_HEIGHT : 0;

  return (
    <div
      className="flex h-svh flex-col overflow-hidden bg-surface pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] text-[13px]
        leading-normal text-ink"
    >
      <TopBar onHome={() => goHome()} />
      {!rootFailed && (
        <>
          <div className="sm:hidden">
            <PhoneControls />
          </div>
          <div className="max-sm:hidden">
            <FilterBar />
          </div>
          {limitReached && <LimitNotice />}
        </>
      )}
      {/* Focusable from script only, so focus has somewhere to land when an empty state's action removes it. */}
      <main tabIndex={-1} className="relative min-h-0 flex-1 overflow-hidden outline-none">
        {rootFailed ? (
          <CrawlFailed onRetry={handleRetry} onChangeAddress={handleChangeAddress} />
        ) : (
          <>
            {/* Both views stay mounted so the map's layout and the table's scroll survive a switch. The hidden one is
                `invisible`, which also takes it out of the tab order and the accessibility tree. */}
            <div className={`absolute inset-0 ${view === 'graph' ? '' : 'invisible'}`}>
              <GraphView insetRight={insetRight} insetBottom={insetBottom} active={view === 'graph'} />
            </div>
            <div className={`absolute inset-0 overflow-auto bg-surface pb-[env(safe-area-inset-bottom)] ${view === 'report' ? '' : 'invisible'}`}>
              <ReportView active={view === 'report'} onShowInGraph={handleShowInGraph} />
            </div>
            {/* Hidden rather than unmounted, so the details come back as they were when you return to the map. */}
            <div className={view === 'graph' ? undefined : 'hidden'}>
              <DetailPanel layout={detailLayout} focusRequest={detailsFocus} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
