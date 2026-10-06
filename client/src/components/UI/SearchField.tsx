import React from 'react';

import { Icon } from './Icon';

interface SearchFieldProps {
  /** Current text; leave undefined for an uncontrolled field */
  value?: string;
  /** Called with the new text */
  onChange?: (value: string) => void;
  /** Placeholder and accessible name */
  placeholder: string;
  /** Key shown as a shortcut hint at the end of the field */
  shortcut: string;
  /** `sm` for the landing demo, `md` for the app */
  size?: 'sm' | 'md';
  /** Additional classes, typically a width */
  className: string;
}

/**
 * Compact search field on a recessed well that lifts to white while focused.
 * @param props - Value, change handler, placeholder, and shortcut hint
 * @returns Search field
 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, placeholder, shortcut, size = 'sm', className }, ref) => (
    <label
      className={`flex items-center gap-2 rounded-md border border-transparent bg-wash-well pl-2.5 pr-[5px] text-ink-3
        focus-within:border-ink focus-within:bg-surface focus-within:shadow-focus hover:[&:not(:focus-within)]:border-line-strong
        transition-[background-color,border-color,box-shadow] duration-200 ease-quart
        ${size === 'md' ? 'h-7 coarse:h-[30px]' : 'h-[26px]'} ${className}`}
    >
      <Icon name="search" size={size === 'md' ? 13 : 12} />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-keyshortcuts={shortcut}
        className={`min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3
          ${size === 'md' ? 'text-[12.5px]' : 'text-xs'}`}
      />
      <kbd
        className={`rounded border border-line bg-surface px-[5px] font-sans leading-4 text-ink-3 ${size === 'md' ? 'text-[10.5px]' : 'text-[10px]'}`}
      >
        {shortcut}
      </kbd>
    </label>
  ),
);

SearchField.displayName = 'SearchField';
