import { NODE_R, START_RING_R } from './motion';

import type { FrameLabel } from './frame';

// Label size, in map units, that label gaps are designed at. Gaps are measured from the edge of the node or ring and
// scale with the label, so a label stays clear of a node that grows as the map zooms in.
const BASE_LABEL_SIZE = 11;

// The start page's label sits below and to the right of its ring, in the gap between its first two branches.
const START_LABEL_GAP = { x: 17, y: 20 } as const;

/**
 * Place a label beside its node on the side facing the start page, clear of both the line in and the fan out.
 * Sideways nodes get their label above; the rest get it level.
 * @param x - Node x
 * @param y - Node y
 * @param angle - Node's angle from the start page, in radians
 * @param size - Label size in map units; the gap from the node scales with it
 * @returns Label position and anchor
 */
export const labelPlacement = (x: number, y: number, angle: number, size: number): Pick<FrameLabel, 'x' | 'y' | 'anchor'> => {
  const scale = size / BASE_LABEL_SIZE;
  const east = Math.cos(angle) >= 0;
  const level = Math.abs(Math.sin(angle)) >= 0.5;
  return {
    x: x + (east ? -1 : 1) * (NODE_R + (level ? 8 : 4) * scale),
    y: y + (level ? 4 : -10) * scale,
    anchor: east ? 'end' : 'start',
  };
};

/**
 * Place the start page's label below and to the right of its ring.
 * @param x - Node x
 * @param y - Node y
 * @param size - Label size in map units; the gap from the ring scales with it
 * @returns Label position and anchor
 */
export const startLabelPlacement = (x: number, y: number, size: number): Pick<FrameLabel, 'x' | 'y' | 'anchor'> => {
  const scale = size / BASE_LABEL_SIZE;
  return { x: x + START_RING_R + START_LABEL_GAP.x * scale, y: y + START_LABEL_GAP.y * scale, anchor: 'start' };
};
