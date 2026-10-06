import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ZoomControls } from '../Graph/ZoomControls';
import { DOT_GRID } from '../UI/styles';
import { DemoChrome } from './DemoChrome';
import { WINDOW_INSET } from './layout';
import { Silk } from './Silk';

import { useCanvasSurface } from '../../hooks/useCanvasSurface';
import { useFrameLoop } from '../../hooks/useFrameLoop';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { EMPTY_STATS } from '../../store/filters';

import { mapSummary } from '../../engine/statusText';
import { STATUS_OPTIONS } from '../App/options';
import { FIT_FLOOR } from '../../graph/viewMath';
import { drawFrame } from '../../render/drawFrame';
import { REDUCED_MOTION_QUERY } from '../../render/motion';
import { buildDemoCrawl, DEMO_HOST, DEMO_VIEW, snapshotAt } from './demoCrawl';

import type { CanvasSize } from '../../hooks/useCanvasSurface';
import type { DemoReadout } from './DemoChrome';

// Labels render at about 10.4px on screen.
const LABEL_PX = 10.4;

/**
 * A product window playing a scripted crawl of example.com on a loop, built from the same parts as the app. It's
 * an illustration, so its controls are inert and assistive tech gets a one-line description instead. Phones play a
 * compact crawl that fits their square window whole; the map never draws below the app's fit floor.
 * @returns The landing page's live demo with its silk
 */
export const DemoWindow: React.FC = () => {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const phone = useMediaQuery(PHONE_QUERY);
  const crawl = useMemo(() => buildDemoCrawl(phone), [phone]);
  const windowRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLSpanElement>(null);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const timeRef = useRef(0);
  const [readout, setReadout] = useState<DemoReadout>({ stats: EMPTY_STATS, crawling: true, seconds: 0 });
  const summary = useMemo(() => snapshotAt(crawl, crawl.end, LABEL_PX).stats, [crawl]);

  // The demo is decoration, so keep keyboard focus and screen readers out of it.
  useEffect(() => {
    if (windowRef.current) windowRef.current.inert = true;
  }, []);

  const paint = useCallback(
    (t: number) => {
      const ctx = canvasRef.current?.getContext('2d');
      const { width, height, dpr } = sizeRef.current;
      if (!ctx || width === 0) return;

      const k = Math.max(Math.min(width / crawl.extent.width, height / crawl.extent.height), FIT_FLOOR);
      const view = { k, x: width / 2 - DEMO_VIEW.cx * k, y: height / 2 - DEMO_VIEW.cy * k };
      const snapshot = snapshotAt(crawl, t, LABEL_PX / k);

      drawFrame(ctx, snapshot.frame, view, width, height, dpr);
      if (loaderRef.current) loaderRef.current.style.opacity = String(snapshot.loaderOpacity);

      // Re-render the chrome only when a count or the crawl's state changes.
      setReadout((prev) => {
        const same = STATUS_OPTIONS.every(({ count }) => prev.stats[count] === snapshot.stats[count]);
        return same && prev.crawling === snapshot.crawling
          ? prev
          : { stats: snapshot.stats, crawling: snapshot.crawling, seconds: snapshot.seconds };
      });
    },
    [crawl],
  );

  const handleResize = useCallback(
    (size: CanvasSize) => {
      sizeRef.current = size;
      paint(reducedMotion ? crawl.restFrom : timeRef.current);
    },
    [paint, reducedMotion, crawl.restFrom],
  );

  useCanvasSurface(mapRef, canvasRef, handleResize);

  // Settle on the finished map if motion gets turned off mid-loop.
  useEffect(() => {
    if (reducedMotion) paint(crawl.restFrom);
  }, [reducedMotion, paint, crawl.restFrom]);

  // The finished map holds still for a few seconds each loop, so it's painted once and left alone until the fade.
  const handleFrame = useCallback(
    (stepMs: number) => {
      const resting = (t: number) => t >= crawl.restFrom && t < crawl.restUntil;
      const previous = timeRef.current;
      timeRef.current = (previous + stepMs) % crawl.period;
      if (!(resting(previous) && resting(timeRef.current))) paint(timeRef.current);
    },
    [crawl, paint],
  );

  useFrameLoop(windowRef, handleFrame, { enabled: !reducedMotion });

  return (
    <div className={`relative mt-20 ${WINDOW_INSET}`}>
      <Silk />
      <p className="sr-only">{`${mapSummary(DEMO_HOST, summary)}, from a sample crawl.`}</p>
      <div ref={windowRef} className="relative select-none overflow-hidden rounded-lg border border-line bg-surface shadow-window">
        <DemoChrome readout={readout} loaderRef={loaderRef} />

        <div ref={mapRef} className={`relative h-[clamp(340px,50vw,604px)] ${DOT_GRID}`}>
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
          <ZoomControls className="absolute bottom-3.5 right-4" />
        </div>
      </div>
    </div>
  );
};
