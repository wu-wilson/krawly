import { useEffect, useRef } from 'react';

/** A canvas's box in CSS pixels and the pixel density its backing store was sized for */
export interface CanvasSize {
  width: number;
  height: number;
  /** Device pixels per CSS pixel */
  dpr: number;
}

/**
 * Keep a canvas's backing store matched to its container's size and the screen's pixel density. Resizing clears
 * a canvas, so `repaint` runs right after every change, before the browser paints. It also runs once the web
 * font has loaded, for canvases that draw text.
 * @param containerRef - Element whose box the canvas fills
 * @param canvasRef - The canvas
 * @param repaint - Draws the canvas at its new size
 */
export const useCanvasSurface = (
  containerRef: React.RefObject<HTMLElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  repaint: (size: CanvasSize) => void,
): void => {
  const repaintRef = useRef(repaint);

  useEffect(() => {
    repaintRef.current = repaint;
  }, [repaint]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let size: CanvasSize = { width: 0, height: 0, dpr: 0 };
    const measure = () => {
      // The box can be fractional (a height in vw, say), so measure it exactly and round only the backing store.
      const box = container.getBoundingClientRect();
      const next = { width: box.width, height: box.height, dpr: window.devicePixelRatio || 1 };
      if (next.width !== size.width || next.height !== size.height || next.dpr !== size.dpr) {
        size = next;
        canvas.width = Math.round(next.width * next.dpr);
        canvas.height = Math.round(next.height * next.dpr);
      }
      repaintRef.current(size);
    };

    // Moving the window to a screen with a different density doesn't resize anything, so watch for it directly.
    let density: MediaQueryList | null = null;
    const watchDensity = () => {
      density?.removeEventListener('change', handleDensity);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      density.addEventListener('change', handleDensity);
    };
    const handleDensity = () => {
      watchDensity();
      measure();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    watchDensity();

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled && size.width > 0) repaintRef.current(size);
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      density?.removeEventListener('change', handleDensity);
    };
  }, [containerRef, canvasRef]);
};
