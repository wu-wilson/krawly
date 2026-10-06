import React, { useEffect, useRef } from 'react';

import { FilterTabs } from '../UI/FilterTabs';
import { SearchField } from '../UI/SearchField';
import { Select } from '../UI/Select';
import { DIVIDER } from '../UI/styles';

import { useCrawlStore } from '../../store/crawlStore';

import { STATUS_OPTIONS, TYPE_OPTIONS } from './options';

/**
 * Status tabs with live counts, the type filter, and URL search, shared by the graph and report views. Pressing
 * "/" anywhere jumps to the search while the bar is showing.
 * @returns Filter row
 */
export const FilterBar: React.FC = () => {
  const filter = useCrawlStore((s) => s.filter);
  const stats = useCrawlStore((s) => s.stats);
  const setFilter = useCrawlStore((s) => s.setFilter);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const search = searchRef.current;
      // Hidden on phones, where the bar isn't rendered visibly.
      if (!search?.offsetParent) return;
      const target = e.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      e.preventDefault();
      search.focus();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-10 items-center justify-between gap-4 border-b border-line px-5">
      {/* Padded so the focus outlines of the first tab and the type select aren't clipped by the scroll edge. */}
      <div className="scrollbar-hide -mx-1 flex min-w-0 items-center gap-5 overflow-x-auto p-1">
        <FilterTabs
          label="Filter by status"
          size="md"
          value={filter.statusFilter}
          onChange={(statusFilter) => setFilter({ statusFilter })}
          tabs={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            count: stats[option.count],
            alarm: option.value === 'broken',
          }))}
        />
        <span aria-hidden="true" className={DIVIDER} />
        <Select
          label="Resource type"
          options={TYPE_OPTIONS}
          value={filter.typeFilter}
          onChange={(typeFilter) => setFilter({ typeFilter })}
          className="flex-none"
        />
      </div>
      <SearchField
        ref={searchRef}
        size="md"
        placeholder="Filter by URL"
        shortcut="/"
        value={filter.search}
        onChange={(search) => setFilter({ search })}
        className="w-[220px] flex-none max-md:w-[168px]"
      />
    </div>
  );
};
