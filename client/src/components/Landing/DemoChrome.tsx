import React from 'react';

import { Button } from '../UI/Button';
import { FilterTabs } from '../UI/FilterTabs';
import { SearchField } from '../UI/SearchField';
import { SegmentedControl } from '../UI/SegmentedControl';
import { DIVIDER } from '../UI/styles';

import { crawlSentence } from '../../engine/statusText';
import { STATUS_OPTIONS, VIEW_OPTIONS } from '../App/options';
import { DEMO_HOST } from './demoCrawl';

import type { DemoSnapshot } from './demoCrawl';

/** The parts of the demo's chrome that change as the crawl runs */
export type DemoReadout = Pick<DemoSnapshot, 'stats' | 'crawling' | 'seconds'>;

interface DemoChromeProps {
  /** Counts and crawl state to show */
  readout: DemoReadout;
  /** The loading line, whose opacity the demo's paint loop sets directly */
  loaderRef: React.RefObject<HTMLSpanElement>;
}

/**
 * The demo window's top bar and filter row: the app's chrome at a smaller size, trimmed further on phones.
 * @param props - Counts and crawl state, and the loading line's ref
 * @returns Demo top bar and filter row
 */
export const DemoChrome: React.FC<DemoChromeProps> = ({ readout, loaderRef }) => {
  const statusLine = crawlSentence(readout.crawling ? 'crawling' : 'finished', readout.stats.total, readout.seconds);

  return (
    <>
      <div className="relative flex h-11 items-center justify-between gap-4 border-b border-line px-4">
        <span ref={loaderRef} aria-hidden="true" className="loader-sweep absolute inset-x-0 -bottom-px h-0.5 opacity-0" />
        <div className="flex min-w-0 items-baseline gap-3 whitespace-nowrap">
          <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-ink">{DEMO_HOST}</span>
          <span className="truncate text-xs tabular-nums text-ink-3">{statusLine}</span>
        </div>
        <div className="flex items-center gap-4">
          <SegmentedControl label="View" options={VIEW_OPTIONS} value="graph" className="max-sm:hidden" />
          <span aria-hidden="true" className={`${DIVIDER} max-sm:hidden`} />
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" icon="download" iconSize={13} className="max-sm:hidden">
              Export
            </Button>
            <Button variant="primary" size="sm" icon="share">
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[38px] items-center justify-between gap-4 border-b border-line px-4">
        <FilterTabs
          label="Filter by status"
          value="all"
          tabs={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            count: readout.stats[option.count],
            alarm: option.value === 'broken',
            className: option.value === 'slow' ? 'max-sm:hidden' : undefined,
          }))}
        />
        <SearchField placeholder="Filter by URL" shortcut="/" className="w-[200px] max-sm:hidden" />
      </div>
    </>
  );
};
