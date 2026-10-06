import { easeOutCubic } from '../render/motion';
import { blendViews } from './viewMath';

import type { ViewTransform } from '../render/frame';

/** A map's view, which can ease to a new view or coast after a fling */
interface ViewMotion {
  /** The view to draw now */
  current: () => ViewTransform;
  /** Where the view is heading: a running animation's end, or the current view */
  target: () => ViewTransform;
  /** Move straight to a view, stopping any animation or coasting */
  jumpTo: (view: ViewTransform) => void;
  /** Ease from the current view to another */
  animateTo: (view: ViewTransform, duration: number, now: number) => void;
  /** Coast at a velocity in px per ms, slowing until it stops */
  fling: (vx: number, vy: number) => void;
  /** Stop coasting, leaving any animation running */
  stopCoasting: () => void;
  /** Advance one frame, returning whether the view is still moving */
  step: (now: number, stepMs: number) => boolean;
}

interface ViewAnimation {
  from: ViewTransform;
  to: ViewTransform;
  start: number;
  duration: number;
}

// Fling velocity left after each 16ms of coasting.
const MOMENTUM_DECAY = 0.92;
// Coasting stops below this combined speed, in px per ms.
const MIN_SPEED = 0.01;

/**
 * Create the motion state for a map's view: eased moves to a target, and momentum after a fling.
 * @returns View motion, starting at scale 1 with no offset
 */
export const createViewMotion = (): ViewMotion => {
  let view: ViewTransform = { k: 1, x: 0, y: 0 };
  let animation: ViewAnimation | null = null;
  let velocity = { x: 0, y: 0 };

  return {
    current: () => view,
    target: () => animation?.to ?? view,
    jumpTo: (next) => {
      view = next;
      animation = null;
      velocity = { x: 0, y: 0 };
    },
    animateTo: (to, duration, now) => {
      velocity = { x: 0, y: 0 };
      animation = { from: view, to, start: now, duration };
    },
    fling: (vx, vy) => {
      animation = null;
      velocity = { x: vx, y: vy };
    },
    stopCoasting: () => {
      velocity = { x: 0, y: 0 };
    },
    step: (now, stepMs) => {
      if (animation) {
        const p = Math.min(1, (now - animation.start) / animation.duration);
        view = blendViews(animation.from, animation.to, easeOutCubic(p));
        if (p >= 1) animation = null;
      }
      const coasting = Math.abs(velocity.x) + Math.abs(velocity.y) > MIN_SPEED;
      if (coasting) {
        view = { ...view, x: view.x + velocity.x * stepMs, y: view.y + velocity.y * stepMs };
        const decay = Math.pow(MOMENTUM_DECAY, stepMs / 16);
        velocity = { x: velocity.x * decay, y: velocity.y * decay };
      }
      return animation !== null || coasting;
    },
  };
};
