import type { FrameLabel } from './frame';

// Label size, in map units, that label offsets are designed at; they scale with the actual size.
const BASE_LABEL_SIZE = 11;

// The start page's label sits below and to the right of its node, in the gap between its first two branches.
const START_LABEL_OFFSET = { x: 26, y: 20 } as const;

/**
 * Place a label beside its node on the side facing the start page, clear of both the line in and the fan out.
 * Sideways nodes get their label above; the rest get it level.
 * @param x - Node x
 * @param y - Node y
 * @param angle - Node's angle from the start page, in radians
 * @param size - Label size in map units; offsets scale with it
 * @returns Label position and anchor
 */
export const labelPlacement = (x: number, y: number, angle: number, size: number): Pick<FrameLabel, 'x' | 'y' | 'anchor'> => {
  const scale = size / BASE_LABEL_SIZE;
  const east = Math.cos(angle) >= 0;
  const level = Math.abs(Math.sin(angle)) >= 0.5;
  return {
    x: x + (east ? -1 : 1) * (level ? 12 : 8) * scale,
    y: y + (level ? 4 : -10) * scale,
    anchor: east ? 'end' : 'start',
  };
};

/**
 * Place the start page's label below and to the right of its node.
 * @param x - Node x
 * @param y - Node y
 * @param size - Label size in map units; offsets scale with it
 * @returns Label position and anchor
 */
export const startLabelPlacement = (x: number, y: number, size: number): Pick<FrameLabel, 'x' | 'y' | 'anchor'> => {
  const scale = size / BASE_LABEL_SIZE;
  return { x: x + START_LABEL_OFFSET.x * scale, y: y + START_LABEL_OFFSET.y * scale, anchor: 'start' };
};
