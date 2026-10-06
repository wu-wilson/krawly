---
paths:
  - "client/src/**/*.tsx"
  - "client/src/**/*.css"
  - "client/src/components/Landing/layout.ts"
  - "client/src/graph/viewMath.ts"
  - "client/src/hooks/useCrawlMap.ts"
  - "client/src/hooks/useMapGestures.ts"
  - "client/src/hooks/useMediaQuery.ts"
  - "client/index.html"
  - "client/tailwind.config.js"
---

# Responsive Design

## Breakpoints

Mobile-first. Use Tailwind's default breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). Layout that switches in script uses the matching queries in `hooks/useMediaQuery.ts` (`PHONE_QUERY` below `sm`, `WIDE_QUERY` from `lg`, `COARSE_QUERY` for `coarse:`); keep them in step with Tailwind's breakpoints. Base styles target the smallest screen, then layer on responsive overrides. Every screen is designed at three widths: phone (390px), desktop (1440px), and ultrawide (2560px). Check all three before calling a change done.

## Landing Page

- **Column:** content sits in a 1200px column with a 24px gutter (`COLUMN` in `components/Landing/layout.ts`). From `sm` up, text is inset 32px (`INSET`) so it lines up with the demo window's edges, and the header logo is nudged `-3px` so its ink, not its viewBox, aligns.
- **Hero:** the headline is `clamp(32px, 3.2vw, 46px)`. On phones the address field drops its "https://" prefix, keeps the button inside the field, and grows to 56px so the button is a 44px target.
- **Demo window:** the map canvas is `clamp(340px, 50vw, 604px)` tall. On phones it plays a compact crawl, round and two rings deep, so the square window shows the whole map. The map never draws below the app's fit floor (0.68 scale, `FIT_FLOOR` in `graph/viewMath.ts`); when it can't fit at that size it holds the floor, centred on the start page, and crops the outer rings. On phones the top bar keeps only Share and the filter row keeps All, Broken, and Redirects.
- **Silk:** it's pinned to the demo window's top-right and bottom-left corners at a fixed size, and fades out about 240px past the window, so ultrawide screens see it dissolve rather than stretch. Below 1132px each half fades out as it nears the window (`.silk-upper` / `.silk-lower` in `index.css`), and below `sm` it's drawn at 60% scale.
- **Footer:** a 65px bar, the same height as the header. On phones its two lines stack with 18px padding.

## App Chrome

- **Top bar:** 48px on `sm` and up, with the logo, a divider, the site's host, and a plain status sentence on the left, then the Graph/Report switch and the crawl's actions on the right (Pause and Stop while running, Resume and Stop while paused, Export and Share when done). Below `sm` it's 56px: the mark as a 44px home button, the host over the status sentence, and a 44px "more" menu holding the actions. The outer `<header>` carries `pt-[env(safe-area-inset-top)]` and the inner row the fixed height. On phones a copied share link is confirmed in place of the status sentence. The silk loading line runs along its bottom edge while a crawl is running.
- **Filter bar (`sm` and up):** 40px, with the status tabs and their counts, a divider, the type select, and the search field (`/` focuses it while the bar is showing). The tab group scrolls sideways if space runs out; the search narrows below `md`.
- **Phone controls (below `sm`):** a 52px row with the Graph/Report switch and one native select for the status filter with counts. Phones have no type or search controls, so when a shared link brings those filters, a row below names them with a Clear button.
- **Limit notice:** a note under the filters once a crawl hits its page limit.

## Views

- **Graph view:** the canvas fills the area below the chrome. Zoom controls (zoom out, zoom in, fit) sit in its bottom-right corner, offset to stay clear of an open panel or sheet; on phones and touch screens they grow to 44px. The map fits itself to the visible area until the visitor pans or zooms, never growing past 1.1 scale (so ultrawide screens get a comfortable map) and never shrinking below 0.68 (past that it centres on the start page). The fit button turns fitting back on.
- **Report view:** a sortable table from `lg` up (Page, Status, Type, Response, Depth, Links found), capped at 1600px and centred on ultrawide. Its header stays pinned (36px, 44px on touch screens), and a focused row scrolls clear of it. Pages without a response time sort after the rest either way. Below `lg`, a two-line list: address and code on top, reason and time beneath. Rows open the page on the map.
- **View switching:** instant, with no cross-fade. Both views stay mounted so the map's layout and the table's scroll survive a switch. The inactive one is `invisible`, which also takes it out of the tab order and the accessibility tree, and while hidden the report stops following the crawl and the map stops drawing, though it keeps its layout current.
- **Detail panel:** a 340px panel from the right from `lg` up, and on short landscape screens (`sm` and up, under 640px tall) where a sheet would cover the map; otherwise a 344px bottom sheet with a drag handle and `rounded-t-xl` (`PANEL_QUERY` in `components/Detail/DetailPanel.tsx`), which on short screens stops at 60% of the map's height (`MAX_SHEET_SHARE` in `graph/viewMath.ts`) so a strip of map always shows. Everything but its actions scrolls, so short screens keep them in reach. Its buttons are 44px and its path-trail rows 32px in the sheet and on touch screens, and its footer clears the home indicator. The map keeps the covered area clear when fitting, with the selected page in view.
- **Failed start page:** when the start page itself fails, the filters and view switch disappear and an empty state offers Try again and Change address.

## Interactions

- **Map gestures:** pointer events (`hooks/useMapGestures.ts`) handle drag to pan with momentum, two fingers to pinch and pan, wheel zoom around the cursor, hover labels with a mouse, and tap or click to select. Only the primary mouse button pans, movement under 6px still counts as a tap, and a finger selects pages within 18px, a mouse within 8px (`TOUCH_HIT_PX` and `HIT_PX` in `hooks/useCrawlMap.ts`). Trackpad pinches zoom like a wheel, including Safari's pinch gesture events. Page-wide, `body { overscroll-behavior: none }` blocks pull-to-refresh and swipe-back.
- **Input focus-zoom:** the viewport meta in `client/index.html` sets `maximum-scale=1.0` so iOS doesn't zoom into sub-16px fields.

## Touch Screens

Touch screens wider than a phone (tablets, and phones held sideways) keep the desktop chrome but size it for fingers with the `coarse:` variant (`pointer: coarse`, a plugin variant in `tailwind.config.js`, since a non-width screen would switch off the `max-*` variants): labeled controls in the top bar and filter bar grow to 30–32px, the home button to 36px, and the map's zoom buttons and the details' buttons and path-trail rows use their touch sizes.

## Global Rules

Never allow horizontal overflow (`index.css` sets `overflow-x: hidden` on `html`). On phones, icon buttons and primary actions are at least 44x44px (`size="touch"` on `Button`); labeled controls are at least 30px tall and dense list rows at least 32px. Never go below 12px for primary text.

**Viewport units:** Never use `h-screen` / `min-h-screen` (= `100vh`). The app shell in `App.tsx` uses `h-svh` (smallest viewport, so the canvas doesn't resize as mobile browser bars animate). The landing page uses `min-h-dvh`. For notched devices, `client/index.html` declares `viewport-fit=cover`: the app shell and landing page pad by the left and right safe-area insets for landscape phones, and the headers, footer, detail panel and sheet, zoom controls, and report pad by the top or bottom ones.
