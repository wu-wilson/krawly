import { useEffect, useState } from 'react';

/** Phones: screens narrower than Tailwind's `sm` breakpoint, matching its `max-sm:` variant at fractional widths */
export const PHONE_QUERY = '(max-width: 639.98px)';

/** Wide screens: Tailwind's `lg` breakpoint and up */
export const WIDE_QUERY = '(min-width: 1024px)';

/** Touch screens and other imprecise pointers, matching Tailwind's `coarse:` variant */
export const COARSE_QUERY = '(pointer: coarse)';

/**
 * Track whether a media query matches, updating as the window changes.
 * @param query - Media query, such as "(min-width: 1024px)"
 * @returns True while the query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};
