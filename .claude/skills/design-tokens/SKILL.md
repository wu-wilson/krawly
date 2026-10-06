---
name: design-tokens
description: Exact color hex values, typography, status tones, map glyphs, the web-cell logo, shadows, and animation constants for Krawly's light system.
user-invocable: true
---

# Design Tokens

Reference for exact values. For how to apply them, see `.claude/rules/styling.md`.

Source of truth: CSS custom properties in `client/src/index.css`, stored as space-separated RGB channels (e.g. `--accent: 91 79 214;`, hex in comments) and consumed via `rgb(var(--token) / <alpha-value>)` in `tailwind.config.js`, so opacity modifiers like `bg-accent/10` resolve. Direct uses (SVG `stopColor`, arbitrary values) wrap them as `rgb(var(--token))`. Canvas can't read CSS variables, so the map's colors live as hex in `client/src/render/colors.ts`: the shared ones mirror `index.css`, and the glyph-only greys (node, queued, edge, arrow) live only there.

## Surfaces

- ground `#F6F7F9` (landing page)
- surface `#FFFFFF` (app, windows, panels, fields)
- canvas `#FBFBFC` (map backdrop), with a `#DDE1E7` dot grid at 22px

## Ink

- ink `#0B0D12` (text, primary buttons), ink-hover `#2A2F3B`
- ink-2 `#454C59` (secondary text, values)
- ink-3 `#687182` (labels, muted text, placeholders)
- ink-4 `#7F8899` (second line of two-tone headings)

## Lines and Washes

- line `#E4E7EC` (the default border), line-soft `#F0F2F5` (row dividers), line-strong `#CFD4DC` (fields, outlined buttons)
- wash-row `#F7F8FA` (row hover), wash-well `#F4F5F7` (search field), wash-hover `#F3F4F6` (ghost hover), wash-track `#F1F3F5` (segmented track)

## Accent and Status

- accent `#5B4FD6`: focus outlines, the selected page's trail and rings, pages being fetched
- broken `#CF3A1D`: 4xx, 5xx, and failed requests
- redirect `#2E66E6`: URLs that redirected

## Map

- Every node settles at a 4-unit radius (`NODE_R`); queued and fetching nodes wait at 85% of it. healthy: solid `#2B3140`; broken: solid `#CF3A1D`; redirect: white with a 1.6 `#2E66E6` ring; queued and skipped: white with a 1.2 `#9AA2B1` ring; fetching: white with a 1.4 accent ring and an accent pulse travelling down its incoming link.
- Links `#CDD1D7` at 1 unit, each with a slight, uniform bow (a quadratic whose control point sits 5% of the link's length off the straight line), ending under a solid `#A9AFB9` arrowhead (5 units long). The selected trail is accent at 1.5 units, with everything else at 42% opacity; pages outside the active filters drop to 16% (`DIM_UNSELECTED` and `DIM_FILTERED` in `graph/mapScene.ts`).
- The start page carries a thin `#0B0D12` ring at 22% opacity, radius 9.
- Labels: the start page always, in 600 ink (its host, or its path when a crawl starts below the root); first-ring pages while that ring has 12 or fewer (the section labels, `MAX_SECTION_LABELS` in `graph/mapScene.ts`); any other page while hovered. Paths over 28 characters shorten with `mapLabel`, to "…/last-segment" when they have more than one segment. Instrument Sans 500 at 11.5px on screen (10.4px in the landing demo), `#454C59` on a canvas-colored halo, placed on the side facing the start page.
- Rings for a small site sit at 125, 210, and 282 units from the start page, stretched up to 1.75× sideways on landscape canvases. Crowded rings grow until neighbours are 12 units apart.

## Silk

- Gradient `#D9DDE3 → #8C94A1 → #2A2F3B → #0B0D12` (`--silk-1` to `--silk-4`): threads fading from light silver into the ink black of the logo and buttons. The landing silk draws its main bundle at 85% opacity and its back bundle at 40%. Used for the landing silk and the app's 2px loading line (`.loader-sweep`, one 1200px sweep every 2.4s at 85% opacity).

## Typography

- Instrument Sans 400/500/600 from Google Fonts, loaded in `index.html`. Fallback: system-ui. No monospace; use `tabular-nums` for numbers.
- Landing: headline `clamp(32px, 3.2vw, 46px)` 400 at -0.03em, body 17px, spec heading `clamp(24px, 2.2vw, 30px)` 400.
- App: 12 to 15px. Status codes in the detail panel are 26px 500, and 24px in the sheet.
- Wordmark: "krawly" in 600 at -0.045em (21px on the landing header, 15px in the app bar).

## Logo

- The web-cell mark (`components/Brand/KrawlyMark.tsx`), drawn on a 48-unit grid: six spokes from a centre node, an outer ring, and an inner ring, each thread sagging toward the centre.
- In the UI the mark is stroke 2.3 with a radius-3.2 dot. The inner ring stays at every size so the mark never reads as a cube.
- Favicon: its own cut of the mark (stroke 3, a radius-3.4 dot, a deeper sag, and a slightly smaller inner ring) in white on a 32px ink tile with 7px corners (`public/favicon.svg`). Redraw it by hand when the mark changes.

## Shadows

Every shadow but the focus and error glows is tinted with ink (`rgb(var(--ink) / …)` in `tailwind.config.js`, shown here as its channels); those two glow in the accent and broken colors.

- window: `0 1px 2px rgb(11 13 18 / 0.03), 0 12px 32px -16px rgb(11 13 18 / 0.08), 0 32px 64px -40px rgb(11 13 18 / 0.1)`
- menu: `0 1px 2px rgb(11 13 18 / 0.04), 0 10px 28px -10px rgb(11 13 18 / 0.18)`
- panel: `-12px 0 32px -24px rgb(11 13 18 / 0.14)`; sheet: `0 -12px 32px -20px rgb(11 13 18 / 0.18)`
- field: `0 1px 2px rgb(11 13 18 / 0.05)`; segment: `0 0 0 1px rgb(11 13 18 / 0.06), 0 1px 2px rgb(11 13 18 / 0.06)`
- focus: `0 0 0 3px` accent at 14%; error: `0 0 0 3px` broken at 10%

## Animation Constants

- House easing `ease-quart` = `cubic-bezier(0.25, 1, 0.5, 1)`. Hover and color transitions run 200ms; the detail panel and sheet slide over 300ms.
- Map, shared with the landing demo (`MOTION` in `render/motion.ts`): links grow over 280ms, nodes pop in over 220ms and settle over 240ms, problem pages send out a 900ms ripple, and labels fade in over 300ms.
- Live map only: dimming for the selection and filters, the selection ring and accent trail, and hover and section labels ease over 200ms (`MOTION.focus`); nodes ease to new positions over 450ms and the fetch pulse loops every 900ms (`graph/mapScene.ts`); the view eases over 450ms, or 250ms for the zoom buttons (`hooks/useCrawlMap.ts`).
- Menus open with a 150ms `menu-in` (a 3px drop and fade).
- Landing silk sways on a 9-second cycle at 30 frames a second; the landing demo loops every crawl plus 7 seconds, fading out over 700ms.
