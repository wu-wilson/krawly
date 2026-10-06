import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Button } from '../UI/Button';

import { HTTP_SCHEME, toCrawlUrl } from '../../engine/urlUtils';

interface UrlFieldProps {
  /** Called with a full http(s) URL once the address passes validation; https is added when no scheme is typed */
  onSubmit: (url: string) => void;
  /** Address to start the field with, selected for editing after a failed crawl */
  initialValue?: string;
  /** Additional classes, typically spacing and width */
  className?: string;
}

const INVALID_MESSAGE = 'That doesn’t look like a web address. Try something like example.com.';

/**
 * The landing page's address field. "https://" sits flush against the input so the two read as one address,
 * and the submit button lives inside the field.
 * @param props - Submit handler, initial address, and classes
 * @returns Address form
 */
export const UrlField: React.FC<UrlFieldProps> = ({ onSubmit, initialValue, className = '' }) => {
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  // Counts failed submits, so the same error is announced again each time.
  const [failures, setFailures] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!initialValue) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [initialValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      // Once an error is showing, clear it as soon as the address becomes valid.
      if (error && toCrawlUrl(e.target.value)) setError(null);
    },
    [error],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!value.trim()) {
        inputRef.current?.focus();
        return;
      }
      const url = toCrawlUrl(value);
      if (!url) {
        setError(INVALID_MESSAGE);
        setFailures((n) => n + 1);
        inputRef.current?.focus();
        return;
      }
      setError(null);
      onSubmit(url);
    },
    [value, onSubmit],
  );

  const showPrefix = !HTTP_SCHEME.test(value.trim());

  return (
    <form onSubmit={handleSubmit} noValidate className={className}>
      <label htmlFor={inputId} className="sr-only">
        Website address
      </label>
      <div
        className={`flex h-[52px] items-center rounded-md border bg-surface pl-[15px] pr-1.5 transition-[border-color,box-shadow] duration-200 ease-quart
          max-sm:h-14
          ${error
            ? 'border-broken shadow-field focus-within:shadow-error'
            : `border-line-strong shadow-field focus-within:border-ink focus-within:shadow-focus
              hover:[&:not(:focus-within)]:border-ink-4`}`}
      >
        {showPrefix && (
          <span aria-hidden="true" className="text-[14.5px] text-ink-3 max-sm:hidden">
            https://
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="url"
          value={value}
          onChange={handleChange}
          placeholder="yoursite.com"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className="m-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-[14.5px] text-ink outline-none placeholder:text-ink-3"
        />
        <Button type="submit" size="xl" trailingIcon="arrowRight" className="ml-2.5 max-sm:h-11">
          Crawl site
        </Button>
      </div>
      {error && (
        <p key={failures} id={errorId} role="alert" className="mt-2.5 text-[13px] text-broken">
          {error}
        </p>
      )}
    </form>
  );
};
