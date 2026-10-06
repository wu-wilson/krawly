import { useCallback, useEffect, useRef, useState } from 'react';

import { useCanvasSurface } from './useCanvasSurface';
import { useMapGestures } from './useMapGestures';
import { useCrawlStore } from '../store/crawlStore';
import { isFilterActive, matchesFilter } from '../store/filters';

import { displayPath, mapLabel } from '../engine/statusText';
import { MAX_STRETCH, stretchFor } from '../graph/layout';
import { createMapScene } from '../graph/mapScene';
import { MAX_SHEET_SHARE, centerOn, fitView, isInView, screenToMap, zoomAround } from '../graph/viewMath';
import { createViewMotion } from '../graph/viewMotion';
import { drawFrame } from '../render/drawFrame';
import { MAX_STEP_MS, NODE_R, REDUCED_MOTION_QUERY } from '../render/motion';

import type { CrawlNode } from '../engine/types';
import type { SceneFocus } from '../graph/mapScene';
import type { ViewArea } from '../graph/viewMath';
import type { ViewTransform } from '../render/frame';
import type { CanvasSize } from './useCanvasSurface';
import type { FilterState } from '../store/filters';

interface UseCrawlMapOptions {
  /** Width covered by the detail panel on the right */
  insetRight: number;
  /** Height covered by the detail sheet at the bottom */
  insetBottom: number;
  /** Host that page labels are shown relative to */
  scopeHost: string;
  /** Whether the map is showing; it draws only while true */
  active: boolean;
}

interface UseCrawlMapReturn {
  /** Element the canvas fills */
  containerRef: React.RefObject<HTMLDivElement>;
  /** The map canvas */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** True while the pointer is over a page, for the cursor */
  hovering: boolean;
  /** Zoom in one step around the centre of the visible area */
  zoomIn: () => void;
  /** Zoom out one step around the centre of the visible area */
  zoomOut: () => void;
  /** Fit the whole map, and keep fitting as the crawl grows */
  fit: () => void;
  /** Pointer handlers to spread onto the canvas */
  pointerHandlers: ReturnType<typeof useMapGestures>;
}

const VIEW_MS = 450;
const ZOOM_MS = 250;
const ZOOM_STEP = 1.3;
// Labels stay about this size on screen at any zoom.
const LABEL_PX = 11.5;
// Pages within this many pixels of the pointer count as under it; fingers get more room than a mouse.
const HIT_PX = 8;
const TOUCH_HIT_PX = 18;

const prefersReducedMotion = (): boolean => window.matchMedia(REDUCED_MOTION_QUERY).matches;

/**
 * Run the live crawl map on a canvas: follow the store, animate the radial layout, keep it fitted with the selected
 * page in sight until the visitor pans or zooms, and draw only while active and something is moving. With reduced
 * motion the view moves without easing or momentum.
 * @param options - Covered edges, label host, and whether the map is on screen
 * @returns Refs, zoom controls, and pointer handlers for the canvas
 */
export const useCrawlMap = ({ insetRight, insetBottom, scopeHost, active }: UseCrawlMapOptions): UseCrawlMapReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene] = useState(createMapScene);
  const [motion] = useState(createViewMotion);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const autoFitRef = useRef(true);
  const stretchRef = useRef<number>(MAX_STRETCH);
  const insetsRef = useRef({ insetRight, insetBottom });
  const hostRef = useRef(scopeHost);
  const activeRef = useRef(active);
  const focusRef = useRef<Pick<SceneFocus, 'selectedId' | 'hoveredId' | 'matching'>>({
    selectedId: null,
    hoveredId: null,
    matching: null,
  });
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const revealRafRef = useRef(0);
  const [hovering, setHovering] = useState(false);
  // The mouse's last point over the map, or null while it's away or dragging.
  const mouseRef = useRef<{ clientX: number; clientY: number } | null>(null);

  // The sheet never covers more than its share of a short map, so neither does its inset.
  const area = useCallback((): ViewArea => {
    const { width, height } = sizeRef.current;
    const { insetRight, insetBottom } = insetsRef.current;
    return { width, height, insetRight, insetBottom: Math.min(insetBottom, height * MAX_SHEET_SHARE) };
  }, []);

  const draw = useCallback(
    (now: number) => {
      const ctx = canvasRef.current?.getContext('2d');
      const { width, height, dpr } = sizeRef.current;
      if (!ctx || width === 0) return;
      const view = motion.current();
      const host = hostRef.current;
      const frame = scene.frame(now, {
        ...focusRef.current,
        labelFor: (node: CrawlNode) => mapLabel(displayPath(node.url, host)),
        labelSize: LABEL_PX / view.k,
      });
      drawFrame(ctx, frame, view, width, height, dpr);
    },
    [scene, motion],
  );

  const hitAt = useCallback(
    (clientX: number, clientY: number, slopPx: number): string | null => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const view = motion.current();
      const at = screenToMap(view, clientX - (rect?.left ?? 0), clientY - (rect?.top ?? 0));
      return scene.hitTest(at.x, at.y, NODE_R + slopPx / view.k, performance.now());
    },
    [scene, motion],
  );

  // Hover is tested again each frame, so the label and cursor follow the page actually under a still mouse while
  // the map moves. Returns whether it changed.
  const syncHover = useCallback((): boolean => {
    const point = mouseRef.current;
    const id = point ? hitAt(point.clientX, point.clientY, HIT_PX) : null;
    if (focusRef.current.hoveredId === id) return false;
    focusRef.current.hoveredId = id;
    setHovering(id !== null);
    return true;
  }, [hitAt]);

  const requestDraw = useCallback(() => {
    if (rafRef.current || !activeRef.current) return;
    const loop = () => {
      rafRef.current = 0;
      const now = performance.now();
      const step = lastFrameRef.current ? Math.min(now - lastFrameRef.current, MAX_STEP_MS) : 16;
      lastFrameRef.current = now;
      const moving = motion.step(now, step);
      syncHover();
      draw(now);
      if (moving || scene.isAnimating(now)) requestDraw();
      else lastFrameRef.current = 0;
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, scene, motion, syncHover]);

  // A hidden map can't animate, and reduced motion asks it not to, so both move straight to the new view.
  const animateTo = useCallback(
    (to: ViewTransform, duration = VIEW_MS) => {
      if (activeRef.current && !prefersReducedMotion()) motion.animateTo(to, duration, performance.now());
      else motion.jumpTo(to);
      requestDraw();
    },
    [motion, requestDraw],
  );

  const selectedPosition = useCallback(() => {
    const id = focusRef.current.selectedId;
    return id ? scene.restingPositionOf(id) : null;
  }, [scene]);

  /**
   * Fit the whole map, moving over if needed so the selected page isn't hidden behind the details or an edge.
   * @param animate - Ease to the new view instead of jumping
   */
  const refit = useCallback(
    (animate: boolean) => {
      const fitted = fitView(scene.bounds(), area());
      const at = selectedPosition();
      const target = at && !isInView(fitted, at.x, at.y, area()) ? centerOn(fitted, at.x, at.y, area()) : fitted;
      if (animate) animateTo(target);
      else motion.jumpTo(target);
    },
    [scene, motion, animateTo, area, selectedPosition],
  );

  /** Bring the selected page into view if the details or an edge are hiding it, once the visitor has moved the map. */
  const revealSelection = useCallback(() => {
    const at = selectedPosition();
    const view = motion.target();
    if (at && !isInView(view, at.x, at.y, area())) animateTo(centerOn(view, at.x, at.y, area()));
  }, [motion, animateTo, area, selectedPosition]);

  // Follow the store: new pages, status changes, filters, and selection.
  useEffect(() => {
    const syncNodes = (nodes: Map<string, CrawlNode>, forceLayout: boolean) => {
      const now = performance.now();
      if (scene.sync(nodes, now) || forceLayout) {
        scene.relayout(stretchRef.current, now);
        if (autoFitRef.current) refit(true);
      }
      requestDraw();
    };

    const syncMatching = (nodes: Map<string, CrawlNode>, filter: FilterState) => {
      focusRef.current.matching = isFilterActive(filter)
        ? new Set(Array.from(nodes.values()).filter((node) => matchesFilter(node, filter)).map((node) => node.id))
        : null;
    };

    const initial = useCrawlStore.getState();
    focusRef.current.selectedId = initial.selectedNodeId;
    syncMatching(initial.nodes, initial.filter);
    syncNodes(initial.nodes, true);

    const unsubscribe = useCrawlStore.subscribe((state, prev) => {
      if (state.nodes !== prev.nodes || state.filter !== prev.filter) syncMatching(state.nodes, state.filter);
      if (state.selectedNodeId !== prev.selectedNodeId) {
        focusRef.current.selectedId = state.selectedNodeId;
        // Wait a frame so the details' inset is in place before checking what they cover.
        cancelAnimationFrame(revealRafRef.current);
        revealRafRef.current = requestAnimationFrame(() => (autoFitRef.current ? refit(true) : revealSelection()));
      }
      if (state.nodes !== prev.nodes) syncNodes(state.nodes, false);
      else requestDraw();
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(revealRafRef.current);
      revealRafRef.current = 0;
    };
  }, [scene, refit, requestDraw, revealSelection]);

  // A resize clears the canvas, so lay out for the new shape and draw again before the browser paints. The same
  // call redraws once the web font loads, at an unchanged size.
  const handleResize = useCallback(
    (size: CanvasSize) => {
      const previous = sizeRef.current;
      sizeRef.current = size;
      const now = performance.now();
      if (size.width !== previous.width || size.height !== previous.height) {
        const stretch = stretchFor(size.width, size.height);
        if (Math.abs(stretch - stretchRef.current) > 0.02) {
          stretchRef.current = stretch;
          scene.relayout(stretch, now);
        }
        if (autoFitRef.current) refit(false);
      }
      if (activeRef.current) draw(now);
      requestDraw();
    },
    [scene, refit, draw, requestDraw],
  );

  useCanvasSurface(containerRef, canvasRef, handleResize);

  // The details opening or closing change the visible area.
  useEffect(() => {
    insetsRef.current = { insetRight, insetBottom };
    if (autoFitRef.current) refit(true);
    else revealSelection();
  }, [insetRight, insetBottom, refit, revealSelection]);

  useEffect(() => {
    hostRef.current = scopeHost;
    requestDraw();
  }, [scopeHost, requestDraw]);

  // Stop drawing while hidden; catch up with one fresh frame when shown again.
  useEffect(() => {
    activeRef.current = active;
    if (active) {
      draw(performance.now());
      requestDraw();
    } else {
      // Settle any ease or fling now, so the map doesn't pick it up half-done when it comes back.
      motion.jumpTo(motion.target());
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastFrameRef.current = 0;
    }
  }, [active, draw, requestDraw, motion]);

  // Clear the frame id too: a stale id would stop `requestDraw` from scheduling after a remount.
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

  const pointerHandlers = useMapGestures(canvasRef, {
    getView: () => motion.current(),
    moveView: (view) => {
      autoFitRef.current = false;
      motion.jumpTo(view);
      requestDraw();
    },
    onPress: () => motion.stopCoasting(),
    onFling: (vx, vy) => {
      if (prefersReducedMotion()) return;
      motion.fling(vx, vy);
      requestDraw();
    },
    onTap: (clientX, clientY, pointerType) => {
      const hit = hitAt(clientX, clientY, pointerType === 'mouse' ? HIT_PX : TOUCH_HIT_PX);
      useCrawlStore.getState().selectNode(hit);
    },
    onHover: (point) => {
      mouseRef.current = point;
      if (syncHover()) requestDraw();
    },
  });

  const zoomBy = (factor: number) => {
    autoFitRef.current = false;
    const { width, height, insetRight: right, insetBottom: bottom } = area();
    // Step from where a running zoom is heading, so quick repeated clicks each count in full.
    animateTo(zoomAround(motion.target(), factor, (width - right) / 2, (height - bottom) / 2), ZOOM_MS);
  };

  return {
    containerRef,
    canvasRef,
    hovering,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
    fit: () => {
      autoFitRef.current = true;
      refit(true);
    },
    pointerHandlers,
  };
};
