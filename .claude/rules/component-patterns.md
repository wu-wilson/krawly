---
paths:
  - "client/src/**/*.tsx"
  - "client/src/**/*.ts"
---

# Component Patterns

## State Management

Use `useState` for local UI state (hover, open/close, input values). Use the Zustand store for cross-component shared state: crawl data, filters, the current view, and selection. The crawl store uses batched updates via `queueMicrotask` — mutations happen in-place on Maps, then a single flush creates new references and refreshes the derived `stats`.

Select narrowly, since `nodes` changes on every flush during a crawl. Prefer a primitive or a stable object (`s.stats`, `selectRoot`, `selectRootFailed`, `s.nodes.get(id)`) over the whole Map; when a component needs a handful of nodes, select just those with `useShallow` (as `LinkRows` and `PathTrail` do). Use `useCrawlHosts` and `useStatusLine` for the hosts and status sentence. Filtering and counting are pure helpers in `store/filters.ts` (`filterNodes`, `filterEdges`, `matchesFilter`, `isFilterActive`, `computeStats`), with `isSlow` in `engine/limits.ts`; call them with the state you need, or read `useCrawlStore.getState()` inside event handlers. The URL is mirrored by `useUrlSync` from the store's `selectUrlSearch`, which the share link uses too, so nothing else writes history.

## Copy

User-facing wording about pages lives in `engine/statusText.ts` (reason phrases, failure copy, explanations, type labels, display paths, the crawl's status sentence, announcement, and map summary, and the page-limit note) and `components/App/emptyCopy.ts` (empty and failure states). Add to those rather than writing status text inline, so the map, panel, report, and exports all say the same thing. Copy is plain sentences with no em dashes or colons, and Krawly is spelled with a K only as the product name. "Crawl" stays "crawl".

## Styling

Compose conditional styles with template literals. Extract repeated style patterns into variables at the top of the file.

## Canvas

The map is drawn in three layers, each pure where it can be:
- `render/drawFrame.ts` draws one `GraphFrame` (nodes, growing links with arrowheads, pulses, ripples, labels, selection) on a canvas. It knows nothing about crawls, and the landing demo uses it too, along with the shared timings in `render/motion.ts` and label placement in `render/labels.ts`.
- `graph/layout.ts` places nodes as a radial tree, `graph/mapScene.ts` tracks each node's animation (pop-in, link growth, easing to new positions, fetch pulses, ripples) and builds frames from it, and `graph/viewMotion.ts` eases the view and coasts it after a fling, while `graph/viewMath.ts` holds the pure view math (fitting, zooming around a point, screen-to-map conversion).
- `hooks/useCrawlMap.ts` owns the map canvas: it follows the store, fits and animates the view, and draws only while the map is showing and something is moving. `hooks/useCanvasSurface.ts` keeps a canvas's backing store matched to its box and pixel density and repaints right after a resize (resizing clears a canvas), and `hooks/useMapGestures.ts` turns pointer and wheel input into gestures.

Components mount the canvas and delegate to the hook. Use `requestAnimationFrame` for animation loops — never `setInterval` — and stop the loop when nothing is animating or the element is off screen. Always clean up animation frames, observers, and listeners in the `useEffect` cleanup, and reset stored frame ids there too (React's development Strict Mode mounts effects twice, and a stale id will stop later draws from being scheduled).

When a hook owns gestures (pan, pinch, wheel) on a canvas, the canvas element must declare `touch-action: none` (Tailwind: `touch-none`) so the browser doesn't run its own gesture handling in parallel — otherwise mobile pinch will zoom the page, single-finger drag will scroll, and macOS trackpad swipe will navigate back. Pair with `select-none [-webkit-touch-callout:none]` and an `onContextMenu={(e) => e.preventDefault()}` if the canvas shouldn't surface the OS long-press or right-click menu. The map uses pointer events with `setPointerCapture`; wire `onPointerCancel` to end the gesture, since iOS Safari preempts touches for system gestures. React attaches `onWheel` as a passive listener, so `preventDefault()` inside it is ignored: attach wheel listeners manually in `useEffect` with `{ passive: false }`.
