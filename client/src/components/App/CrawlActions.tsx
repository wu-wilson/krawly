import React, { useCallback, useEffect, useRef } from 'react';

import { Button } from '../UI/Button';
import { Menu } from '../UI/Menu';

import { selectRootFailed, useCrawlStore } from '../../store/crawlStore';
import { filterEdges, filterNodes } from '../../store/filters';

import { exportCsv, exportJson } from '../../utils/export';

import type { MenuItem } from '../UI/Menu';
import type { CopyState } from '../../hooks/useCopy';

interface CrawlActionsProps {
  /** Copy the crawl's share link */
  onShare: () => void;
  /** How the last copy went, for the Share button's label */
  copyState: CopyState;
}

const SHARE_LABELS: Record<CopyState, string> = { idle: 'Share', copied: 'Link copied', failed: 'Couldn’t copy' };

/**
 * The actions that fit the crawl's state: Pause and Stop while it runs, Resume and Stop while paused, Export and
 * Share once it's done. On phones they fold into one menu.
 * @param props - Share handler and copy state
 * @returns Action buttons, and the phone menu
 */
export const CrawlActions: React.FC<CrawlActionsProps> = ({ onShare, copyState }) => {
  const status = useCrawlStore((s) => s.status);
  const rootFailed = useCrawlStore(selectRootFailed);
  const pauseCrawl = useCrawlStore((s) => s.pauseCrawl);
  const resumeCrawl = useCrawlStore((s) => s.resumeCrawl);
  const stopCrawl = useCrawlStore((s) => s.stopCrawl);
  const groupRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const refocusRef = useRef(false);

  // Exports follow the filters, and the JSON keeps only the edges between exported pages.
  const handleCsv = useCallback(() => {
    const { nodes, filter } = useCrawlStore.getState();
    exportCsv(filterNodes(nodes, filter));
  }, []);

  const handleJson = useCallback(() => {
    const { nodes, edges, filter } = useCrawlStore.getState();
    const shown = filterNodes(nodes, filter);
    exportJson(shown, filterEdges(edges, new Set(shown.map((node) => node.id))));
  }, []);

  const running = status === 'crawling';
  const paused = status === 'paused';
  const done = status === 'complete' && !rootFailed;

  // When a crawl ends, its controls give way to Share. Whether they had keyboard focus is read as the status changes,
  // before they unmount, so focus can follow to Share instead of dropping to the page.
  useEffect(
    () =>
      useCrawlStore.subscribe((state, prev) => {
        if (state.status === prev.status) return;
        refocusRef.current = state.status === 'complete' && !!groupRef.current?.contains(document.activeElement);
      }),
    [],
  );

  useEffect(() => {
    if (!done || !refocusRef.current) return;
    refocusRef.current = false;
    shareRef.current?.focus();
  }, [done]);

  const exports: MenuItem[] = [
    { label: 'Download CSV', onSelect: handleCsv },
    { label: 'Download JSON', onSelect: handleJson },
  ];

  let phoneItems: MenuItem[] = [];
  if (running) phoneItems = [{ label: 'Pause', onSelect: pauseCrawl }, { label: 'Stop', onSelect: stopCrawl }];
  else if (paused) phoneItems = [{ label: 'Resume', onSelect: resumeCrawl }, { label: 'Stop', onSelect: stopCrawl }];
  else if (done) phoneItems = [{ label: 'Copy share link', onSelect: onShare }, ...exports];

  return (
    <>
      <div ref={groupRef} className="flex items-center gap-1.5 max-sm:hidden">
        {/* Pause and Resume share one button, so it keeps focus as it toggles. */}
        {(running || paused) && (
          <>
            <Button variant={paused ? 'primary' : 'ghost'} icon={paused ? 'play' : 'pause'} onClick={paused ? resumeCrawl : pauseCrawl}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="ghost" icon="stop" onClick={stopCrawl}>
              Stop
            </Button>
          </>
        )}
        {done && (
          <>
            <Menu trigger={{ label: 'Export', icon: 'download' }} items={exports} />
            <Button ref={shareRef} variant="primary" icon={copyState === 'copied' ? 'check' : 'share'} onClick={onShare}>
              {SHARE_LABELS[copyState]}
            </Button>
          </>
        )}
      </div>

      {phoneItems.length > 0 && (
        <Menu
          className="sm:hidden"
          trigger={{ icon: 'more', ariaLabel: done ? 'Share or export' : 'Crawl controls', size: 'touch' }}
          items={phoneItems}
        />
      )}
    </>
  );
};
