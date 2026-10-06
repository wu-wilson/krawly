import { useEffect, useRef } from 'react';

import { MAX_STEP_MS } from '../render/motion';

interface FrameLoopOptions {
  /** Run the loop only while true */
  enabled?: boolean;
  /** Skip frames that arrive sooner than this, to cap the frame rate */
  minFrameMs?: number;
  /** Grows the viewport's box when checking visibility, so content drawn past the target still counts as on screen (CSS margin syntax) */
  rootMargin?: string;
}

/**
 * Run a requestAnimationFrame loop only while the target element is on screen.
 * @param targetRef - Element whose visibility gates the loop
 * @param onFrame - Called each frame with the ms since the previous call: 0 after a start or restart, and capped at
 * `MAX_STEP_MS`
 * @param options - Enable flag, frame-rate cap, and visibility margin
 */
export const useFrameLoop = (
  targetRef: React.RefObject<Element | null>,
  onFrame: (stepMs: number) => void,
  { enabled = true, minFrameMs = 0, rootMargin = '0px' }: FrameLoopOptions = {},
): void => {
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return;

    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (last && now - last < minFrameMs) return;
      const step = last ? Math.min(now - last, MAX_STEP_MS) : 0;
      last = now;
      onFrameRef.current(step);
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { rootMargin },
    );
    observer.observe(target);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [targetRef, enabled, minFrameMs, rootMargin]);
};
