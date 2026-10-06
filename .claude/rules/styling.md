---
paths:
  - "client/src/**/*.tsx"
  - "client/src/**/*.css"
  - "client/src/render/*.ts"
  - "client/src/graph/*.ts"
  - "client/src/hooks/useCrawlMap.ts"
  - "client/src/hooks/useFrameLoop.ts"
  - "client/src/components/UI/styles.ts"
  - "client/src/components/Landing/demoCrawl.ts"
  - "client/src/components/Landing/layout.ts"
  - "client/src/components/Landing/silkPaths.ts"
  - "client/tailwind.config.js"
---

# Styling

No UI component libraries. Build from scratch with Tailwind, and reach for the primitives in `components/UI/` (`Button` and `ButtonLink`, `SegmentedControl`, `FilterTabs`, `SearchField`, `Select`, `Menu`, `Disclosure`, `Icon`) before writing new controls, so every screen and the landing demo stay identical.

## Theming
- All colors must use CSS custom properties via Tailwind semantic tokens (`ground`, `surface`, `canvas`, `ink`, `ink-hover`, `ink-2/3/4`, `line`, `line-soft`, `line-strong`, `wash-*`, `accent`, `broken`, `redirect`). Never hardcode hex values in component files. The exceptions are Canvas code, which can't read CSS variables and uses the hex values in `render/colors.ts` (keep them in sync with `index.css`), and the silk gradient and dot grid, which read `--silk-*` and `--graph-grid` directly.
- Light theme only — no theme toggle. CSS custom properties are defined on `:root`. Never use Tailwind `dark:` prefixes or `data-theme` attributes.
- One typeface, Instrument Sans (`font-sans`). Use `tabular-nums` for counts, codes, and times. No monospace.

## Visual Language
- Editorial and quiet: hairline borders (`border-line`, 1px) separate regions; shadows are soft and rare. The tokens are `shadow-window` (the landing demo), `shadow-menu` (dropdowns), `shadow-panel` and `shadow-sheet` (detail panel and sheet), `shadow-field` (the landing address field), `shadow-segment` (the chosen segment), and `shadow-focus` / `shadow-error` (the glow around a focused text field, red while it’s invalid).
- Corners stay small: 8px (`rounded-lg`) for the demo window, menus, the touch zoom group, and 44px phone buttons; 7px for the segmented track and boxed select; 6px (`rounded-md`) for buttons and fields; 5px for small controls and the button inside the landing address field. The detail sheet's 12px top corners are the one exception. Never `rounded-full` on controls, and no pills.
- Small, precise type. App UI text runs 12 to 15px, with larger status codes in the detail panel. Nothing primary goes below 12px; secondary hints such as a keyboard shortcut can be smaller.
- Status is a colored code followed by its reason in a neutral ink (`ink` in the details, `ink-2` in the report table, `ink-3` on the report list's second line), as in "404 Not Found": `text-broken` for 4xx/5xx and failed requests, `text-redirect` for redirects, ink for success (muted to `text-ink-3` in the details' link lists), `text-ink-3` while waiting or unchecked. Use `describeStatus` from `engine/statusText.ts` and `TONE_CLASS` from `components/Detail/StatusCode.tsx` rather than mapping statuses yourself. Never use colored dots, badges, or pills for status.
- Selection is never an underline: segmented controls lift the chosen segment onto white, filter tabs set the active tab in ink, and the selected report row and map trail take the accent.

## Interactive States
- Every clickable element has a hover state, a keyboard focus outline, and a color transition (`HOVER_TRANSITION`, 200ms `ease-quart`). `hover:` applies only where the pointer can hover (`hoverOnlyWhenSupported`), so a tap doesn't leave a control looking hovered; text fields show hover only while unfocused (`hover:[&:not(:focus-within)]`). Use `FOCUS_RING` from `components/UI/styles.ts` (a 2px accent outline outside the element), or `FOCUS_RING_INSET` inside clipping containers such as rows and joined buttons; a scroll container that holds outlined controls gets 4px of padding so their rings aren't clipped. Text fields show focus with an ink border and `shadow-focus`. Shared class strings (`TEXT_LINK`, `BLEED_ROW`, `DIVIDER`, `DOT_GRID`) and `rowBackground` (a list row's selected or hover wash) live in the same file. Don't stack offset utilities to override one: Tailwind resolves conflicts by stylesheet order, not class order.
- Hover, focus, selection, panels, and the map ease. Content that appears or disappears (the view switch, disclosures, closing menus) switches instantly.

## Animation
- Name programmatic timings as constants next to the code that uses them, and when a timer has to match a CSS transition, say which (`SLIDE_MS` matches `duration-300`). The map's shared timings (link growth, pop-in, settle, ripples, label fades, and the `focus` easing for dimming, the trail, rings, and hover labels) live in `MOTION` in `render/motion.ts`; node moves and the fetch pulse are in `graph/mapScene.ts`, and view easing is in `hooks/useCrawlMap.ts`. The house easing is `ease-quart` (`cubic-bezier(0.25, 1, 0.5, 1)`).
- Prefer `transform` and `opacity` for animations — they are GPU-accelerated and won't trigger layout recalculation.
- Use CSS `@keyframes` for continuous loops (the silk loading line) and CSS `transition` for state changes (hover, panel slide). Use `requestAnimationFrame` for Canvas and for values CSS can't animate, such as the landing silk's sway, and run those loops only while their element is on screen (`hooks/useFrameLoop.ts`).
- Respect `prefers-reduced-motion` (`REDUCED_MOTION_QUERY` in `render/motion.ts` for code that checks it): the landing demo shows its finished map, the silk holds still, the loading line stops sweeping, the map's view moves without easing or momentum, and transitions and smooth scrolling are turned off.
