import React from 'react';

interface KrawlyMarkProps {
  /** Rendered width and height in pixels */
  size: number;
  /** Additional classes; the mark draws in `currentColor` */
  className?: string;
}

// One hexagonal web cell on a 48-unit grid: six spokes from a centre node, an outer ring, and an inner ring.
// Each thread sags a little toward the centre, the way silk hangs between spokes.
const PATH =
  'M24 19L24 4M28.33 21.5L41.32 14M28.33 26.5L41.32 34M24 29L24 44M19.67 26.5L6.68 34M19.67 21.5L6.68 14' +
  'M24 12.5Q27.98 17.1 33.96 18.25Q31.97 24 33.96 29.75Q27.98 30.9 24 35.5Q20.02 30.9 14.04 29.75Q16.03 24 14.04 18.25Q20.02 17.1 24 12.5' +
  'M24 4Q30.93 12 41.32 14Q37.86 24 41.32 34Q30.93 36 24 44Q17.07 36 6.68 34Q10.14 24 6.68 14Q17.07 12 24 4';

/**
 * Krawly's web-cell mark in the current text color, with a stroke and centre dot heavy enough to hold up beside text.
 * @param props - Size and classes
 * @returns Decorative SVG mark
 */
export const KrawlyMark: React.FC<KrawlyMarkProps> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
    <path d={PATH} stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="24" r={3.2} fill="currentColor" />
  </svg>
);
