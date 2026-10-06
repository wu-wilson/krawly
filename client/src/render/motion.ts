import type { FrameRipple } from './frame';

/** Media query for visitors who ask for less motion */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Radius of every node, in map units */
export const NODE_R = 4;

/** Animation timings, in ms */
export const MOTION = {
  /** A link grows from its parent */
  grow: 280,
  /** A new node pops in */
  pop: 220,
  /** A node settles to full size once it resolves */
  settle: 240,
  /** A problem page's ripple spreads and fades */
  ripple: 900,
  /** A label fades in */
  labelFade: 300,
  /** Dimming, the accent trail and selection rings, and hover and section labels ease over this */
  focus: 200,
} as const;

/** Longest step an animation advances by in one frame, so a stalled frame or background tab resumes instead of jumping */
export const MAX_STEP_MS = 64;

// Ripple opacity at each fifth of its life, ending transparent.
const RIPPLE_ALPHA: Record<FrameRipple['tone'], number[]> = {
  broken: [0.55, 0.4, 0.27, 0.15, 0.06, 0],
  redirect: [0.5, 0.36, 0.24, 0.13, 0.05, 0],
};

/**
 * Clamp a value to 0..1.
 * @param v - Value
 * @returns Clamped value
 */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Ease out, fast then slow.
 * @param p - Progress from 0 to 1
 * @returns Eased progress
 */
export const easeOutCubic = (p: number): number => 1 - Math.pow(1 - p, 3);

/**
 * Ease in and out, slow at both ends.
 * @param p - Progress from 0 to 1
 * @returns Eased progress
 */
export const easeInOutQuad = (p: number): number => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/**
 * Ease out with a slight overshoot, so things pop into place.
 * @param p - Progress from 0 to 1
 * @returns Eased progress, briefly above 1
 */
const easeBack = (p: number): number => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

/**
 * Compute a node's drawn radius. It pops in when it appears, waits slightly small, and settles to full size with a small
 * overshoot once it resolves.
 * @param appearAge - ms since the node appeared
 * @param resolvedAge - ms since it resolved, or null while unresolved
 * @returns Radius in map units
 */
export const nodeRadius = (appearAge: number, resolvedAge: number | null): number => {
  const pop = easeBack(clamp01(appearAge / MOTION.pop));
  // A waiting node holds at 85% and settles from there, so it grows without a jump when it resolves.
  const settle = resolvedAge === null ? 0.85 : 0.85 + 0.15 * easeBack(clamp01(resolvedAge / MOTION.settle));
  return NODE_R * pop * settle;
};

/**
 * Measure how far a link has grown from its parent.
 * @param age - ms since the child appeared
 * @returns Growth from 0 to 1
 */
export const edgeGrow = (age: number): number => easeOutCubic(clamp01(age / MOTION.grow));

/**
 * Measure how far a label has faded in.
 * @param age - ms since its node resolved
 * @returns Opacity from 0 to 1
 */
export const labelFade = (age: number): number => clamp01(age / MOTION.labelFade);

/**
 * Find where along a link it should stop, so it meets the child's edge instead of running into it.
 * @param length - Straight-line length of the link
 * @returns Curve parameter from 0.5 to 1
 */
export const edgeStop = (length: number): number => Math.max(0.5, 1 - (NODE_R + 3) / (length || 1));

/**
 * Build the ring a problem page sends out as it lands.
 * @param x - Node x
 * @param y - Node y
 * @param age - ms since the node resolved
 * @param tone - Broken or redirect
 * @returns The ripple, or null once it has faded
 */
export const rippleAt = (x: number, y: number, age: number, tone: FrameRipple['tone']): FrameRipple | null => {
  if (age < 0 || age >= MOTION.ripple) return null;
  const p = age / MOTION.ripple;
  const steps = RIPPLE_ALPHA[tone];
  const i = Math.min(steps.length - 2, Math.floor(p * 5));
  const alpha = steps[i] + (steps[i + 1] - steps[i]) * (p * 5 - i);
  return { x, y, r: NODE_R + 3 + p * 18, tone, alpha };
};
