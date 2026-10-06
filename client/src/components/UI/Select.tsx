import React from 'react';

import { Icon } from './Icon';
import { FOCUS_RING, HOVER_TRANSITION } from './styles';

/** One choice in a select */
interface SelectOption<T extends string> {
  /** Value reported when this option is chosen */
  value: T;
  /** Visible label */
  label: string;
}

interface SelectProps<T extends string> {
  /** Choices in display order */
  options: SelectOption<T>[];
  /** Currently selected value */
  value: T;
  /** Called with the chosen value */
  onChange: (value: T) => void;
  /** Accessible name */
  label: string;
  /** `quiet` sits flush in a toolbar; `boxed` has a border, for phones */
  variant?: 'quiet' | 'boxed';
}

/**
 * A native select restyled to match the light system, so it keeps the platform's own picker on phones.
 * @param props - Options, current value, change handler, and style
 * @returns Select
 */
export const Select = <T extends string>({
  options,
  value,
  onChange,
  label,
  variant = 'quiet',
}: SelectProps<T>): React.ReactElement => {
  const boxed = variant === 'boxed';

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((option) => option.value === e.target.value);
          if (next) onChange(next.value);
        }}
        className={`cursor-pointer appearance-none font-medium tabular-nums ${HOVER_TRANSITION} ${FOCUS_RING}
          ${boxed
            ? 'h-[34px] rounded-[7px] border border-line-strong bg-surface pl-2.5 pr-[26px] text-[13px] text-ink hover:border-ink-3'
            : 'h-[26px] rounded-md bg-transparent pl-2 pr-[22px] text-[12.5px] text-ink-2 hover:bg-wash-hover coarse:h-[30px]'}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron" size={11} className={`pointer-events-none absolute text-ink-3 ${boxed ? 'right-2.5' : 'right-1.5'}`} />
    </label>
  );
};
