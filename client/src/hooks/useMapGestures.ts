import { useEffect, useRef } from 'react';

import { clampZoom, screenToMap, zoomAround } from '../graph/viewMath';

import type { ViewTransform } from '../render/frame';

/** How the map responds to gestures */
interface MapGestureCallbacks {
  /** Current view */
  getView: () => ViewTransform;
  /** The visitor moved the view directly */
  moveView: (view: ViewTransform) => void;
  /** A press started, so any coasting should stop */
  onPress: () => void;
  /** A drag was released while moving, at this velocity in px per ms */
  onFling: (vx: number, vy: number) => void;
  /** A tap or click at a screen point, with the kind of pointer that made it */
  onTap: (clientX: number, clientY: number, pointerType: string) => void;
  /** The mouse is over a screen point, or has left the map or started dragging it (null) */
  onHover: (point: { clientX: number; clientY: number } | null) => void;
}

/** Pointer handlers to spread onto the canvas */
interface MapGestureHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: () => void;
}

interface Gesture {
  pointers: Map<number, { x: number; y: number }>;
  /** Where the press started, for telling a tap from a drag */
  start: { x: number; y: number };
  /** Pointer position when the view last moved */
  anchor: { x: number; y: number };
  dragging: boolean;
  pinched: boolean;
  /** Map point under the pinch's starting midpoint, kept under the fingers as they move */
  pinchFocus: { x: number; y: number };
  pinchDist: number;
  pinchK: number;
  velocity: { x: number; y: number };
  lastMove: number;
}

// Movement under this many pixels is still a tap.
const TAP_SLOP = 6;
// A release this long after the last movement doesn't fling.
const FLING_WINDOW_MS = 50;
const WHEEL_SENSITIVITY = 0.0015;
const WHEEL_LINE_PX = 16;
// Trackpad pinches arrive as wheel events with ctrlKey set and much smaller deltas than a wheel's.
const PINCH_WHEEL_BOOST = 10;
// No single wheel event zooms by more than this natural-log step (about 28%), so Ctrl with a mouse wheel stays usable.
const MAX_WHEEL_STEP = 0.25;
// Safari's pinch gesture events are ignored while the same pinch is also arriving as Ctrl-wheel events.
const PINCH_WHEEL_OVERLAP_MS = 100;

/**
 * Turn pointer and wheel input on a canvas into map gestures: drag to pan, two fingers to pinch and pan, the wheel
 * to zoom around the cursor, and tap to select. Only the primary mouse button pans.
 * @param canvasRef - The map canvas
 * @param callbacks - How the map responds
 * @returns Pointer handlers for the canvas
 */
export const useMapGestures = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  callbacks: MapGestureCallbacks,
): MapGestureHandlers => {
  const callbacksRef = useRef(callbacks);
  const gestureRef = useRef<Gesture>({
    pointers: new Map(),
    start: { x: 0, y: 0 },
    anchor: { x: 0, y: 0 },
    dragging: false,
    pinched: false,
    pinchFocus: { x: 0, y: 0 },
    pinchDist: 1,
    pinchK: 1,
    velocity: { x: 0, y: 0 },
    lastMove: 0,
  });

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Wheel and pinch zoom are attached by hand: React's handlers are passive, so they can't stop the page from
  // scrolling or zooming.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let pinchWheelAt = -Infinity;
    let gestureScale = 1;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) pinchWheelAt = e.timeStamp;
      // A mostly sideways swipe has nothing to zoom, and moving the view would still switch off fitting.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const rect = canvas.getBoundingClientRect();
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_PX : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? rect.height : 1;
      const step = -e.deltaY * unit * WHEEL_SENSITIVITY * (e.ctrlKey ? PINCH_WHEEL_BOOST : 1);
      const factor = Math.exp(Math.max(-MAX_WHEEL_STEP, Math.min(MAX_WHEEL_STEP, step)));
      const { getView, moveView } = callbacksRef.current;
      moveView(zoomAround(getView(), factor, e.clientX - rect.left, e.clientY - rect.top));
    };

    // Safari sends pinches as its own gesture events too, which would otherwise zoom the whole page. Touch pinches
    // are already zooming through pointer events, so only trackpad pinches, which have no pointers, zoom here.
    const handleGesture = (e: Event) => {
      e.preventDefault();
      const scale = 'scale' in e && typeof e.scale === 'number' ? e.scale : 1;
      const previous = gestureScale;
      gestureScale = scale;
      if (e.type === 'gesturestart' || gestureRef.current.pointers.size > 0 || e.timeStamp - pinchWheelAt < PINCH_WHEEL_OVERLAP_MS) return;
      const rect = canvas.getBoundingClientRect();
      const x = 'clientX' in e && typeof e.clientX === 'number' ? e.clientX - rect.left : rect.width / 2;
      const y = 'clientY' in e && typeof e.clientY === 'number' ? e.clientY - rect.top : rect.height / 2;
      const { getView, moveView } = callbacksRef.current;
      moveView(zoomAround(getView(), scale / previous, x, y));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('gesturestart', handleGesture, { passive: false });
    canvas.addEventListener('gesturechange', handleGesture, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('gesturestart', handleGesture);
      canvas.removeEventListener('gesturechange', handleGesture);
    };
  }, [canvasRef]);

  const startPinch = (canvas: HTMLCanvasElement) => {
    const gesture = gestureRef.current;
    const [a, b] = Array.from(gesture.pointers.values());
    const rect = canvas.getBoundingClientRect();
    const { getView, moveView } = callbacksRef.current;
    const view = getView();
    // Take over from any running animation, which would otherwise keep moving the view under the fingers.
    moveView(view);
    gesture.pinched = true;
    gesture.pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    gesture.pinchK = view.k;
    gesture.pinchFocus = screenToMap(view, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
  };

  // When a finger lifts or is cancelled, pick up from the fingers still down: a new pinch for two or more, a pan
  // for one, so the view doesn't jump.
  const reseed = (canvas: HTMLCanvasElement) => {
    const gesture = gestureRef.current;
    if (gesture.pointers.size >= 2) {
      startPinch(canvas);
    } else if (gesture.pointers.size === 1) {
      const [rest] = Array.from(gesture.pointers.values());
      gesture.anchor = rest;
      gesture.dragging = true;
    }
  };

  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const gesture = gestureRef.current;
      e.currentTarget.setPointerCapture(e.pointerId);
      gesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.velocity = { x: 0, y: 0 };
      gesture.lastMove = e.timeStamp;
      callbacksRef.current.onPress();
      if (gesture.pointers.size === 1) {
        gesture.start = { x: e.clientX, y: e.clientY };
        gesture.anchor = gesture.start;
        gesture.dragging = false;
        gesture.pinched = false;
      } else if (gesture.pointers.size === 2) {
        startPinch(e.currentTarget);
      }
    },

    onPointerMove: (e) => {
      const gesture = gestureRef.current;
      if (!gesture.pointers.has(e.pointerId)) {
        if (e.pointerType === 'mouse') callbacksRef.current.onHover({ clientX: e.clientX, clientY: e.clientY });
        return;
      }
      gesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const { moveView, getView } = callbacksRef.current;

      if (gesture.pointers.size >= 2) {
        // Keep the map point that started under the fingers' midpoint there, so two fingers pan as they pinch.
        const [a, b] = Array.from(gesture.pointers.values());
        const rect = e.currentTarget.getBoundingClientRect();
        const k = clampZoom((gesture.pinchK * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.pinchDist);
        moveView({
          k,
          x: (a.x + b.x) / 2 - rect.left - gesture.pinchFocus.x * k,
          y: (a.y + b.y) / 2 - rect.top - gesture.pinchFocus.y * k,
        });
        return;
      }

      if (!gesture.dragging) {
        if (Math.hypot(e.clientX - gesture.start.x, e.clientY - gesture.start.y) < TAP_SLOP) return;
        // From here the map moves under the pointer, so nothing reads as hovered until the mouse moves on its own.
        gesture.dragging = true;
        callbacksRef.current.onHover(null);
      }
      const dx = e.clientX - gesture.anchor.x;
      const dy = e.clientY - gesture.anchor.y;
      const dt = Math.max(1, e.timeStamp - gesture.lastMove);
      gesture.anchor = { x: e.clientX, y: e.clientY };
      gesture.velocity = { x: dx / dt, y: dy / dt };
      gesture.lastMove = e.timeStamp;
      const view = getView();
      moveView({ ...view, x: view.x + dx, y: view.y + dy });
    },

    onPointerUp: (e) => {
      const gesture = gestureRef.current;
      if (!gesture.pointers.delete(e.pointerId)) return;
      if (gesture.pointers.size > 0) {
        reseed(e.currentTarget);
        return;
      }
      if (!gesture.dragging && !gesture.pinched) {
        callbacksRef.current.onTap(e.clientX, e.clientY, e.pointerType);
        return;
      }
      if (gesture.dragging && !gesture.pinched && e.timeStamp - gesture.lastMove < FLING_WINDOW_MS) {
        callbacksRef.current.onFling(gesture.velocity.x, gesture.velocity.y);
      }
    },

    onPointerCancel: (e) => {
      const gesture = gestureRef.current;
      gesture.pointers.delete(e.pointerId);
      gesture.velocity = { x: 0, y: 0 };
      reseed(e.currentTarget);
    },

    onPointerLeave: () => callbacksRef.current.onHover(null),
  };
};
