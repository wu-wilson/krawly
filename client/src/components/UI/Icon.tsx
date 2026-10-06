import React from 'react';

/** Names of the icons in Krawly's 1.5px stroke set */
export type IconName =
  | 'arrowRight'
  | 'download'
  | 'share'
  | 'external'
  | 'search'
  | 'minus'
  | 'plus'
  | 'fit'
  | 'close'
  | 'chevron'
  | 'pause'
  | 'stop'
  | 'play'
  | 'refresh'
  | 'more'
  | 'copy'
  | 'check'
  | 'info';

interface IconProps {
  /** Which icon to draw */
  name: IconName;
  /** Rendered size in pixels */
  size?: number;
  /** Additional classes; the icon draws in `currentColor` */
  className?: string;
}

const SHARE = 'M9.5 2.5h4v4M13.5 2.5L8 8M12 9.5V13a.5.5 0 0 1-.5.5h-8A.5.5 0 0 1 3 13V5a.5.5 0 0 1 .5-.5H7';

// Every icon is drawn on a 16-unit grid with round caps, so they sit evenly beside 12 to 14px text.
const PATHS: Record<IconName, string> = {
  arrowRight: 'M3 8h10M9 4l4 4-4 4',
  download: 'M8 2.5v8M4.5 7L8 10.5L11.5 7M3 13.5h10',
  share: SHARE,
  // An arrow leaving a box also reads as "open in a new tab".
  external: SHARE,
  search: 'M11.25 7a4.25 4.25 0 1 1-8.5 0a4.25 4.25 0 1 1 8.5 0M10.25 10.25l3.25 3.25',
  minus: 'M4 8h8',
  plus: 'M4 8h8M8 4v8',
  fit: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10',
  close: 'M4 4l8 8M12 4l-8 8',
  chevron: 'M4.5 6.5L8 10l3.5-3.5',
  pause: 'M6 3.5v9M10 3.5v9',
  stop: 'M4.5 4.5h7v7h-7Z',
  play: 'M5 3.5v9l7.5-4.5Z',
  refresh: 'M13 8a5 5 0 1 1-1.5-3.55M13 2.5v3h-3',
  more: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  copy: 'M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z',
  check: 'M3.5 8.5l3 3 6-7',
  info: 'M8 7.5v4M8 5h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z',
};

// Icons whose shapes read better at a heavier stroke: the share arrow is small inside its box, and the "more"
// dots are drawn as round caps on zero-length lines.
const STROKE: Partial<Record<IconName, number>> = { share: 1.6, external: 1.6, more: 2.2 };

/**
 * A decorative stroke icon from Krawly's set.
 * @param props - Icon name, size, and classes
 * @returns SVG icon hidden from assistive tech
 */
export const Icon: React.FC<IconProps> = ({ name, size = 12, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE[name] ?? 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`flex-none ${className}`}
  >
    <path d={PATHS[name]} />
  </svg>
);
