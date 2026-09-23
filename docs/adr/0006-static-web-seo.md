# ADR-0006 — Static web export with per-city routes as the acquisition channel

**Status:** accepted · 2026-09-23

## Context

"Website at the same time" can mean two very different things: a marketing page that links to the stores, or the product itself running in a browser. The supplied web board is unambiguously the second — it is the app, in a window.

There is also a commercial fact worth designing around: *time in tokyo*, *london new york time difference* and similar queries carry real, durable search volume. A world clock is one of the few utility categories where the web surface can be the top of the acquisition funnel rather than a brochure.

## Decision

**`web.output: 'static'` via Expo Router**, with the app at `/` and **statically generated public pages at `/time/[slug]` for the top 1 000 cities**.

## Rationale

- Static export means no server, no cold starts, CDN-speed delivery, and hosting that costs approximately nothing.
- Expo Router's `generateStaticParams` produces the 1 000 city pages from the same dataset the app already ships. The marginal cost of the SEO surface is a build script and an OG-image generator.
- Each city page is a complete answer to the query that brought the visitor: the time, the date, the offset, DST status and the next transition, sunrise/sunset, and a difference table. Then, below the fold, the app.
- Internal linking between each city and its 8 nearest-by-offset neighbours is what gets the long tail crawled.

## The hydration problem

A statically generated clock is stale the moment it is built. Naïvely rendering it causes a React hydration mismatch and, worse, a visible flash of a wrong time.

Resolution:

1. The static HTML carries the **build-time** value, so crawlers and no-JS visitors see a sensible page with a `dateModified` in the structured data.
2. The clock node renders with `suppressHydrationWarning`, and the real value is written in a `useLayoutEffect` — before paint, so there is no flash.
3. `Cache-Control: max-age=0, must-revalidate` on HTML; hashed assets get a year.

## Consequences

**Good:** near-zero hosting cost, excellent LCP, an acquisition channel that compounds, and one codebase.

**Costs:**
- Build time grows with the city count. 1 000 pages plus 1 000 OG images is a few minutes; capped deliberately rather than generating all 5 000.
- The initial bundle must stay under 180 KB gz, so the map and search are code-split and the city dataset is `fetch`ed rather than bundled on web.
- Sitemap, canonical URLs and 404 handling all need to be real — a soft-404 on an unknown slug would poison the index.
- If server-side features ever become necessary (accounts, shared links), Expo Router API routes on EAS Hosting are the migration path, and the static pages stay static.
