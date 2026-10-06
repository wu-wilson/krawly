import type { Cubic } from './frame';

/**
 * Find the point on a cubic Bézier at parameter u.
 * @param c - The curve
 * @param u - Parameter from 0 to 1
 * @returns The point as [x, y]
 */
export const pointOnCubic = (c: Cubic, u: number): [number, number] => {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const d = 3 * v * u * u;
  const e = u * u * u;
  return [a * c[0] + b * c[2] + d * c[4] + e * c[6], a * c[1] + b * c[3] + d * c[5] + e * c[7]];
};

/**
 * Split a cubic Bézier at parameter u, keeping the leading part and the unit tangent at the cut.
 * @param c - The curve
 * @param u - Where to cut, from 0 to 1
 * @returns The leading sub-curve and its end direction
 */
export const cutCubic = (c: Cubic, u: number): { head: Cubic; tangent: [number, number] } => {
  const lerp = (ax: number, ay: number, bx: number, by: number): [number, number] => [ax + (bx - ax) * u, ay + (by - ay) * u];
  const p01 = lerp(c[0], c[1], c[2], c[3]);
  const p12 = lerp(c[2], c[3], c[4], c[5]);
  const p23 = lerp(c[4], c[5], c[6], c[7]);
  const p012 = lerp(p01[0], p01[1], p12[0], p12[1]);
  const p123 = lerp(p12[0], p12[1], p23[0], p23[1]);
  const end = lerp(p012[0], p012[1], p123[0], p123[1]);
  const tx = p123[0] - p012[0];
  const ty = p123[1] - p012[1];
  const len = Math.hypot(tx, ty) || 1;
  return {
    head: [c[0], c[1], p01[0], p01[1], p012[0], p012[1], end[0], end[1]],
    tangent: [tx / len, ty / len],
  };
};

/**
 * Build a link with a slight, uniform bow to one side: a quadratic whose control point sits 5% of the link's length
 * off the straight line, written as a cubic so it can grow and carry a pulse.
 * @param ax - Parent x
 * @param ay - Parent y
 * @param bx - Child x
 * @param by - Child y
 * @returns The bowed curve
 */
export const bowedLink = (ax: number, ay: number, bx: number, by: number): Cubic => {
  const dx = bx - ax;
  const dy = by - ay;
  const qx = (ax + bx) / 2 - dy * 0.05;
  const qy = (ay + by) / 2 + dx * 0.05;
  return [ax, ay, ax + ((qx - ax) * 2) / 3, ay + ((qy - ay) * 2) / 3, bx + ((qx - bx) * 2) / 3, by + ((qy - by) * 2) / 3, bx, by];
};
