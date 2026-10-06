import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useFrameLoop } from '../../hooks/useFrameLoop';
import { useMediaQuery } from '../../hooks/useMediaQuery';

import { REDUCED_MOTION_QUERY } from '../../render/motion';
import { silkPaths } from './silkPaths';

import type { SilkPaths } from './silkPaths';

// Silk sways slowly, so 30 frames a second is plenty and leaves headroom for the demo beside it.
const SILK_FRAME_MS = 33;
// The silk reaches this far past the window, so it keeps swaying until it's fully out of view.
const SILK_REACH = '340px';

/**
 * Two halves of silk, each a main and a faint back bundle of threads, pinned to the demo window's top-right and
 * bottom-left corners. The silk is fixed in size and fades out about 240px past the window, so ultrawide screens
 * see it dissolve rather than stretch.
 * @returns Decorative silk behind the demo window
 */
export const Silk: React.FC = () => {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [initial] = useState(() => silkPaths(0));
  const upperMain = useRef<SVGPathElement>(null);
  const upperBack = useRef<SVGPathElement>(null);
  const lowerMain = useRef<SVGPathElement>(null);
  const lowerBack = useRef<SVGPathElement>(null);
  const elapsedRef = useRef(0);

  const handleFrame = useCallback((stepMs: number) => {
    elapsedRef.current += stepMs;
    const paths = silkPaths(elapsedRef.current / 1000);
    upperMain.current?.setAttribute('d', paths.upperMain);
    upperBack.current?.setAttribute('d', paths.upperBack);
    lowerMain.current?.setAttribute('d', paths.lowerMain);
    lowerBack.current?.setAttribute('d', paths.lowerBack);
  }, []);

  useFrameLoop(wrapRef, handleFrame, { enabled: !reducedMotion, minFrameMs: SILK_FRAME_MS, rootMargin: SILK_REACH });

  // Settle back to the resting shape if motion gets turned off mid-sway.
  useEffect(() => {
    if (!reducedMotion) return;
    elapsedRef.current = 0;
    handleFrame(0);
  }, [reducedMotion, handleFrame]);

  return (
    // Covers the window, which the frame loop watches. With no z-index of its own, the silk inside still layers
    // behind the window and the hero text.
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <SilkHalf half="upper" pathRefs={[upperMain, upperBack]} initial={initial} />
      <SilkHalf half="lower" pathRefs={[lowerMain, lowerBack]} initial={initial} />
    </div>
  );
};

interface SilkHalfProps {
  /** Which corner of the window this half grows from */
  half: 'upper' | 'lower';
  /** Refs for the main and back bundle paths, so the sway can update them without re-rendering */
  pathRefs: [React.RefObject<SVGPathElement>, React.RefObject<SVGPathElement>];
  /** Paths for the first paint */
  initial: SilkPaths;
}

/**
 * One half of the silk: its gradient, the fade past the window's edge, and its two thread bundles.
 * @param props - Which half, refs for its paths, and the paths for the first paint
 * @returns Silk half as an SVG
 */
const SilkHalf: React.FC<SilkHalfProps> = ({ half, pathRefs, initial }) => {
  const upper = half === 'upper';
  const id = `silk-${half}`;

  return (
    <svg
      viewBox={upper ? '-1140 -340 1460 740' : '-320 -400 1460 740'}
      width="1460"
      height="740"
      className={`pointer-events-none absolute z-[-1] block ${upper ? 'silk-upper -right-[320px] -top-[340px]' : 'silk-lower -bottom-[340px] -left-[320px]'}`}
    >
      <defs>
        <linearGradient id={`${id}-color`} gradientUnits="userSpaceOnUse" x1={upper ? -760 : 760} y1="0" x2={upper ? 120 : -120} y2="0">
          <stop offset="0" stopColor="rgb(var(--silk-1))" />
          <stop offset="0.38" stopColor="rgb(var(--silk-2))" />
          <stop offset="0.7" stopColor="rgb(var(--silk-3))" />
          <stop offset="1" stopColor="rgb(var(--silk-4))" />
        </linearGradient>
        {/* Fades the threads out over the 240px past the window's edge. */}
        <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={upper ? 240 : -240} y2="0">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={upper ? -1140 : -320} y={upper ? -340 : -400} width="1460" height="740">
          <rect x={upper ? -1140 : -320} y={upper ? -340 : -400} width="1460" height="740" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`} fill="none" stroke={`url(#${id}-color)`} strokeWidth="1">
        <path ref={pathRefs[1]} d={upper ? initial.upperBack : initial.lowerBack} opacity="0.4" />
        <path ref={pathRefs[0]} d={upper ? initial.upperMain : initial.lowerMain} opacity="0.85" />
      </g>
    </svg>
  );
};
