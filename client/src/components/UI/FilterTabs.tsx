import React from 'react';

import { FOCUS_RING, HOVER_TRANSITION } from './styles';

/** One status filter with its live count */
interface FilterTab<T extends string> {
  /** Value reported when this tab is chosen */
  value: T;
  /** Visible label */
  label: string;
  /** Number of results this filter would show */
  count: number;
  /** Draws the count in the broken color when it's above zero */
  alarm?: boolean;
  /** Additional classes, for example to hide a tab on phones */
  className?: string;
}

interface FilterTabsProps<T extends string> {
  /** Tabs in display order */
  tabs: FilterTab<T>[];
  /** Currently selected value */
  value: T;
  /** Called with the chosen value */
  onChange?: (value: T) => void;
  /** Accessible name for the group */
  label: string;
  /** `sm` for the landing demo, `md` for the app */
  size?: 'sm' | 'md';
}

/**
 * Text tabs with counts. The active tab is set in ink and the rest stay muted. There's no underline or pill.
 * @param props - Tabs, current value, and change handler
 * @returns Row of filter tabs
 */
export const FilterTabs = <T extends string>({
  tabs,
  value,
  onChange,
  label,
  size = 'sm',
}: FilterTabsProps<T>): React.ReactElement => (
  <div role="group" aria-label={label} className="flex items-center gap-[18px] tabular-nums">
    {tabs.map((tab) => {
      const active = tab.value === value;
      return (
        <button
          key={tab.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange?.(tab.value)}
          className={`flex cursor-pointer items-baseline gap-1.5 whitespace-nowrap rounded-sm font-medium ${HOVER_TRANSITION} ${FOCUS_RING}
            ${size === 'md' ? 'text-[12.5px] coarse:py-1.5' : 'text-xs'} ${active ? 'text-ink' : 'text-ink-3 hover:text-ink'} ${tab.className ?? ''}`}
        >
          {tab.label}
          <span
            className={`font-normal ${size === 'md' ? 'text-xs' : 'text-[11.5px]'} ${tab.alarm && tab.count > 0 ? 'text-broken' : 'text-ink-3'}`}
          >
            {tab.count}
          </span>
        </button>
      );
    })}
  </div>
);
