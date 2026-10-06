import React from 'react';

import { FOCUS_RING } from './styles';

/** One choice in a segmented control */
interface SegmentOption<T extends string> {
  /** Value reported when this segment is chosen */
  value: T;
  /** Visible label */
  label: string;
}

type SegmentSize = 'sm' | 'md' | 'lg';

interface SegmentedControlProps<T extends string> {
  /** Segments in display order */
  options: SegmentOption<T>[];
  /** Currently selected value */
  value: T;
  /** Called with the chosen value */
  onChange?: (value: T) => void;
  /** Accessible name for the group */
  label: string;
  /** `sm` for the landing demo, `md` for the app bar, `lg` for phones */
  size?: SegmentSize;
  /** Additional classes for the track */
  className?: string;
}

const SIZES: Record<SegmentSize, string> = {
  sm: 'h-6 px-2.5 text-xs',
  md: 'h-6 px-[11px] text-[12.5px] coarse:h-[30px]',
  lg: 'h-[30px] px-[11px] text-[13px]',
};

/**
 * Two or more mutually exclusive choices on a recessed track. The chosen segment lifts onto a white chip.
 * @param props - Options, current value, and change handler
 * @returns Segmented control
 */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>): React.ReactElement => (
  <div role="group" aria-label={label} className={`flex gap-0.5 rounded-[7px] bg-wash-track p-0.5 ${className}`}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange?.(option.value)}
          className={`cursor-pointer rounded-[5px] font-medium transition-[color,background-color,box-shadow] duration-200 ease-quart ${SIZES[size]} ${FOCUS_RING}
            ${active ? 'bg-surface text-ink shadow-segment' : 'bg-transparent text-ink-3 hover:text-ink'}`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
