# CLAUDE.md — Krawly

## What This Is

Krawly is a visual website crawler and health scanner. The user enters a URL, the app crawls the site in real time, and every discovered page, file, and endpoint becomes a node on a live radial map, one ring per click from the start page, with each node's status shown by its color and shape. A report view lists the same pages, as a sortable table on wide screens and a two-line list on smaller ones.

## Architecture

- **client/** — React 18 + Vite + TypeScript. Tailwind CSS v3. Zustand for state, including the current view and filters (restored from and mirrored to the URL). All crawl logic runs client-side in `src/engine/`. The map is laid out by `src/graph/` and drawn on HTML5 Canvas by `src/render/`, which the landing page's demo shares.
- **server/** — Express + TypeScript CORS proxy. Two proxy endpoints — `/fetch` (status plus the body of successful HTML pages) and `/head` (status check only) — plus a `/` health check that returns `{ status: 'ok', service: 'krawly-proxy' }`. Both endpoints return the redirects they received (`redirects: [{ url, status }]`) alongside the final response. Stateless — no database, no auth. Outbound fetches are guarded against SSRF: every address a hostname resolves to must be public unicast, checked at connect time so the address validated is the address dialed, and redirects are followed manually so each hop is re-validated (see `src/security/`). Servers that reject HEAD are checked with a GET instead, and a request the browser abandons is abandoned upstream too.

## Commands

- `./launch.sh` installs dependencies on first run and starts the proxy (port 3001) and the client (port 5173).
- `npm run build` in `client/` (tsc and Vite) and in `server/` (tsc) is the type check; there are no tests.

## Key Decisions

- Canvas rendering instead of SVG for the map, so 200 animated nodes stay smooth.
- The meta description, `og:description`, and `public/og.png` (1200×630, described by `og:image:alt`) repeat the hero's copy, so change them together.
- Light theme only, with no theme toggle and no `dark:` prefixes. Colors are CSS custom properties on `:root`, consumed as Tailwind tokens (`ground`, `surface`, `canvas`, `ink`, `line`, `wash`, `accent`, `broken`, `redirect`). Canvas code reads the same colors as hex from `render/colors.ts`.
- Accent is violet (`#5B4FD6`), used for focus, the selected page's trail, and pages being fetched. Primary buttons are ink (`#0B0D12`). The silk gradient (`#D9DDE3 → #8C94A1 → #2A2F3B → #0B0D12`), threads fading from light silver into the ink black of the logo and buttons, appears only in the landing silk and the loading line.
- One typeface, Instrument Sans, with tabular figures for numbers. No monospace anywhere.
- The logo is the "web cell" mark (`components/Brand/KrawlyMark.tsx`): a sagging hexagonal web with spokes from a centre node. Its inner ring stays at every size so it never reads as a cube at favicon size.
- The map is a radial tree: one ring per click from the start page, each branch's share of the circle proportional to the leaf pages under it, children in discovery order. Only parent→child links are drawn, each with a slight, uniform bow and a solid arrowhead; other links appear under "Linked from" in the detail panel. Every page settles at the same size.
- Status shows as a colored code followed by its reason in a neutral ink ("404 Not Found"), never as colored dots, pills, or badges. On the map, healthy pages are solid dark grey, broken pages solid red, redirects white with a blue ring, pages being fetched with an accent ring, and waiting or unchecked pages white with a grey ring.
- Animation is a first-class concern: state changes ease, and motion stays inside the product, with no page-load entrance animations.
- The crawl engine enforces hard caps (6 concurrent, depth 3, 200 URLs max) from `engine/limits.ts`. No user-facing settings. The landing page's spec list reads from the same file.
- Six node statuses: `queued`, `pending`, `healthy`, `redirect`, `broken`, `skipped`. A URL that redirected before a successful response is `redirect`; 4xx, 5xx, and failed requests are all `broken`; pages left unchecked when a crawl is stopped are `skipped` ("Not checked") and don't count as broken.
- Requests use each URL exactly as it was linked; the normalized form is only a deduplication key.
- Links are only read from successful (2xx) HTML pages that are still on the crawl's site after any redirects. An error page's links belong to the site's error template, and a page that redirected elsewhere isn't part of the site.
- If the start page redirects to another host (example.com to www.example.com), the crawl's scope follows it, and links to its final address count as links to the start page.
- Crawlers are blocked from every query-string URL (`client/public/robots.txt`) — `?u=` auto-starts a crawl on load, so a bot rendering a shared link drives real proxy traffic at a third-party site. No param yields distinct indexable content anyway.

## Do NOT

- Write test files or install testing libraries.
- Use `any` or default exports.
- Use inline styles for static values — use Tailwind classes instead. Inline `style={{...}}` is reserved for values Tailwind can't statically extract: prop-derived sizes and offsets, sizes shared with layout math (`PANEL_WIDTH`, `SHEET_HEIGHT`), and values written by animation loops.
- Add a database or authentication to the server.
- Allow horizontal overflow on any screen.
- Show blank screens — every state (loading, empty, error) must have a designed UI.
- Communicate status in text by color alone — always pair it with a code or a reason. On the map, where healthy and broken pages share a solid glyph, the details, the report, and the Broken filter carry the difference.
- Use UI component libraries (MUI, Chakra, Radix, shadcn). Build from scratch with Tailwind, starting from the primitives in `components/UI/`.
- Add pills, colored status dots, glassmorphism, underline tabs, or heavily rounded floating cards. Corners stay at 8px or less; the detail sheet's 12px top corners are the one exception.

## Rules (path-scoped — loaded automatically when editing matching files)

- `.claude/rules/code-style.md` — TypeScript, React component structure, JSDoc, import ordering, naming, error handling. Loads for `client/**/*.{ts,tsx}` and `server/**/*.ts`.
- `.claude/rules/component-patterns.md` — State management, shared copy, conditional styles, Canvas patterns. Loads for `client/src/**/*.{ts,tsx}`.
- `.claude/rules/styling.md` — Theming, visual language, interactive states, animation. Loads for `client/src/**/*.{tsx,css}`, `client/src/{render,graph}/*.ts`, `client/src/hooks/{useCrawlMap,useFrameLoop}.ts`, `client/src/components/UI/styles.ts`, `client/src/components/Landing/{demoCrawl,layout,silkPaths}.ts`, and `client/tailwind.config.js`.
- `.claude/rules/responsive.md` — Mobile-first breakpoints and per-component responsive behavior. Loads for `client/src/**/*.{tsx,css}`, `client/src/components/Landing/layout.ts`, `client/src/graph/viewMath.ts`, `client/src/hooks/useCrawlMap.ts`, `client/src/hooks/useMapGestures.ts`, `client/src/hooks/useMediaQuery.ts`, `client/index.html`, and `client/tailwind.config.js`.

## Skills (reference knowledge, invoke with `/crawl-engine` or `/design-tokens`)

- `.claude/skills/crawl-engine/` — How the crawl engine works: queue flow, hard caps, proxy interaction, node statuses.
- `.claude/skills/design-tokens/` — Exact color hex values, typography, map glyphs, the logo, animation durations.
