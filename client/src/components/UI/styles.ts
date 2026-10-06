// Tailwind resolves conflicting utilities by stylesheet order, not class order, so each focus variant is a
// complete set rather than an override.

/** Keyboard focus outline for interactive elements, drawn just outside them */
export const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Keyboard focus outline drawn just inside, for elements inside clipping containers (rows, joined buttons) */
export const FOCUS_RING_INSET = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';

/** Color and background transitions for hover states */
export const HOVER_TRANSITION = 'transition-colors duration-200 ease-quart';

/** A list row that bleeds 8px past its container on each side, so its hover wash lines up with the text */
export const BLEED_ROW = '-mx-2 w-[calc(100%+16px)] rounded-[5px] px-2 hover:bg-wash-row';

/** Underlined text link in ink-2 that darkens on hover */
export const TEXT_LINK = `rounded-sm text-ink-2 underline decoration-line-strong underline-offset-[3px] hover:text-ink hover:decoration-ink
  ${HOVER_TRANSITION} ${FOCUS_RING}`;

/**
 * Pick a list row's background: the accent wash when it's the selected page, a hover wash otherwise.
 * @param selected - Whether the row is the selected page
 * @returns Background classes
 */
export const rowBackground = (selected: boolean): string => (selected ? 'bg-accent/[0.06]' : 'hover:bg-wash-row');

/** A short vertical hairline between groups in a toolbar */
export const DIVIDER = 'h-[18px] w-px flex-none bg-line';

/** The canvas color with its 22px dot grid, for surfaces that stand in for the map */
export const DOT_GRID = 'bg-canvas bg-[radial-gradient(rgb(var(--graph-grid))_1px,transparent_1.2px)] bg-[length:22px_22px]';
