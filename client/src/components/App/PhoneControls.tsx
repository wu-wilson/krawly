import React from 'react';

import { Button } from '../UI/Button';
import { SegmentedControl } from '../UI/SegmentedControl';
import { Select } from '../UI/Select';

import { useCrawlStore } from '../../store/crawlStore';

import { STATUS_OPTIONS, TYPE_NOUNS, VIEW_OPTIONS } from './options';

/**
 * The phone's second row: the Graph/Report switch, and the status filter with counts in one native picker. Phones
 * have no type or search controls, so when a shared link brings those filters along, a row below names them and
 * offers to clear them.
 * @returns Phone control rows
 */
export const PhoneControls: React.FC = () => {
  const view = useCrawlStore((s) => s.view);
  const setView = useCrawlStore((s) => s.setView);
  const statusFilter = useCrawlStore((s) => s.filter.statusFilter);
  const typeFilter = useCrawlStore((s) => s.filter.typeFilter);
  const search = useCrawlStore((s) => s.filter.search.trim());
  const stats = useCrawlStore((s) => s.stats);
  const setFilter = useCrawlStore((s) => s.setFilter);

  const shown = typeFilter === 'all' ? 'pages' : TYPE_NOUNS[typeFilter];
  const hiddenFilters = typeFilter !== 'all' || search !== '';

  // Clearing removes the row holding the button, so its focus moves to the app's main area rather than the page.
  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget === document.activeElement) document.querySelector('main')?.focus({ preventScroll: true });
    setFilter({ typeFilter: 'all', search: '' });
  };

  return (
    <>
      <div className="flex h-[52px] items-center justify-between gap-3 border-b border-line px-4">
        <SegmentedControl label="View" size="lg" options={VIEW_OPTIONS} value={view} onChange={setView} />
        <Select
          label="Show"
          variant="boxed"
          value={statusFilter}
          onChange={(next) => setFilter({ statusFilter: next })}
          options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: `${option.label} ${stats[option.count]}` }))}
        />
      </div>
      {hiddenFilters && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-wash-row pl-4 pr-1 text-[13px] text-ink-2">
          <span className="truncate">{search ? `Showing ${shown} matching “${search}”` : `Showing ${shown} only`}</span>
          <Button variant="ghost" size="touch" onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}
    </>
  );
};
