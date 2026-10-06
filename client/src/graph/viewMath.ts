import type { ViewTransform } from '../render/frame';
import type { MapLayout } from './layout';

/** The part of the canvas the map should fit in, after panels that cover it */
export interface ViewArea {
  width: number;
  height: number;
  /** Covered on the right, by the detail panel */
  insetRight: number;
  /** Covered at the bottom, by the detail sheet */
  insetBottom: number;
}

/** The most of the map's height the detail sheet covers, so a strip of map always stays in view on short screens */
export const MAX_SHEET_SHARE = 0.6;

/**
 * Write how much of the map a sheet of this height covers, as a CSS length that stops at its share of a short map.
 * @param height - Sheet height in CSS px
 * @returns CSS length
 */
export const sheetCover = (height: number): string => `min(${height}px, ${MAX_SHEET_SHARE * 100}%)`;

/** The smallest scale a fitted map is drawn at, so nodes and labels stay readable */
export const FIT_FLOOR = 0.68;

// The fitted map never grows past this, so ultrawide screens get a comfortable map instead of a huge one.
const FIT_MAX = 1.1;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;
const PAD = 28;
// Room around the outermost pages for their labels.
const LABEL_MARGIN_X = 70;
const LABEL_MARGIN_Y = 30;
// How far inside the visible edges a point must sit to count as in view.
const IN_VIEW_MARGIN = 40;

/**
 * Find the view that fits the whole map in the visible area, scaled between FIT_FLOOR and FIT_MAX. When the map
 * can't fit at the floor, the view centres on the start page instead.
 * @param bounds - Map extent in map units
 * @param area - Canvas size and covered edges
 * @returns View transform
 */
export const fitView = (bounds: MapLayout['bounds'], area: ViewArea): ViewTransform => {
  const availW = Math.max(1, area.width - area.insetRight - PAD * 2);
  const availH = Math.max(1, area.height - area.insetBottom - PAD * 2);
  const w = bounds.maxX - bounds.minX + LABEL_MARGIN_X * 2;
  const h = bounds.maxY - bounds.minY + LABEL_MARGIN_Y * 2;
  const fit = Math.min(availW / w, availH / h, FIT_MAX);
  const k = Math.max(fit, FIT_FLOOR);
  const cx = fit >= FIT_FLOOR ? (bounds.minX + bounds.maxX) / 2 : 0;
  const cy = fit >= FIT_FLOOR ? (bounds.minY + bounds.maxY) / 2 : 0;
  return { k, x: PAD + availW / 2 - cx * k, y: PAD + availH / 2 - cy * k };
};

/**
 * Clamp a scale to the zoom limits.
 * @param k - Scale
 * @returns Scale between the minimum and maximum zoom
 */
export const clampZoom = (k: number): number => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k));

/**
 * Zoom by a factor while keeping one screen point fixed.
 * @param view - Current view
 * @param factor - Scale multiplier
 * @param px - Screen x to hold still
 * @param py - Screen y to hold still
 * @returns New view, clamped to the zoom limits
 */
export const zoomAround = (view: ViewTransform, factor: number, px: number, py: number): ViewTransform => {
  const k = clampZoom(view.k * factor);
  const ratio = k / view.k;
  return { k, x: px - ratio * (px - view.x), y: py - ratio * (py - view.y) };
};

/**
 * Convert a point on the canvas to map units.
 * @param view - Current view
 * @param x - Canvas x in CSS pixels
 * @param y - Canvas y in CSS pixels
 * @returns The map point under it
 */
export const screenToMap = (view: ViewTransform, x: number, y: number): { x: number; y: number } => ({
  x: (x - view.x) / view.k,
  y: (y - view.y) / view.k,
});

/**
 * Pan so a map point sits at the centre of the visible area.
 * @param view - Current view
 * @param x - Map x
 * @param y - Map y
 * @param area - Canvas size and covered edges
 * @returns New view at the same zoom
 */
export const centerOn = (view: ViewTransform, x: number, y: number, area: ViewArea): ViewTransform => ({
  k: view.k,
  x: (area.width - area.insetRight) / 2 - x * view.k,
  y: (area.height - area.insetBottom) / 2 - y * view.k,
});

/**
 * Check whether a map point is comfortably inside the visible area.
 * @param view - Current view
 * @param x - Map x
 * @param y - Map y
 * @param area - Canvas size and covered edges
 * @returns True when the point is at least IN_VIEW_MARGIN from every visible edge
 */
export const isInView = (view: ViewTransform, x: number, y: number, area: ViewArea): boolean => {
  const sx = x * view.k + view.x;
  const sy = y * view.k + view.y;
  return (
    sx > IN_VIEW_MARGIN &&
    sy > IN_VIEW_MARGIN &&
    sx < area.width - area.insetRight - IN_VIEW_MARGIN &&
    sy < area.height - area.insetBottom - IN_VIEW_MARGIN
  );
};

/**
 * Blend two views.
 * @param a - Start view
 * @param b - End view
 * @param p - Progress from 0 to 1
 * @returns The view in between
 */
export const blendViews = (a: ViewTransform, b: ViewTransform, p: number): ViewTransform => ({
  k: a.k + (b.k - a.k) * p,
  x: a.x + (b.x - a.x) * p,
  y: a.y + (b.y - a.y) * p,
});
