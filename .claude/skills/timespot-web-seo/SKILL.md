---
name: timespot-web-seo
description: Build or review TimeSpot's web surface — static export, per-city SEO routes, metadata, structured data, OG images, PWA, hydration-safe clocks and web performance budgets. Use when working on anything under the web target or the /time/[slug] routes.
---

# Web surface

The website is the product running in a browser **plus** an acquisition channel. Spec: `docs/04-screen-specs.md` S6, `docs/07-responsive-strategy.md` §4, `docs/adr/0006-static-web-seo.md`.

## Configuration

```ts
// app.config.ts
web: { output: 'static', bundler: 'metro' }
```

Static export: no server, CDN delivery, near-zero hosting cost. Deploy with `eas deploy` (or any static host).

## The hydration problem — read this before touching the clock

A statically generated clock is stale the instant it is built. Naïvely rendering it causes a React hydration mismatch **and a visible flash of the wrong time**.

```tsx
// ✅ the only correct pattern
const [time, setTime] = useState(() => buildTimeSnapshot)  // build-time value
useLayoutEffect(() => { setTime(getZonedTime(Date.now(), zone, prefs)) }, [])
return <Numeral value={time.display} suppressHydrationWarning />
```

`useLayoutEffect`, **not** `useEffect` — the latter runs after paint, which is exactly the flash you are trying to avoid.

The build-time value is deliberate, not a bug: crawlers and no-JS visitors get a sensible page, and the structured data carries `dateModified`.

## Per-city routes

```tsx
// app/time/[slug].tsx
export async function generateStaticParams() {
  return topCities(1000).map(c => ({ slug: c.slug }))
}
```

Each page must contain:

- **H1 is the clock itself**, with `aria-label="Current time in Tokyo is 8:15 AM"`
- date, UTC offset, DST status, **the next DST transition date** (`getNextTransition`)
- sunrise, sunset, day length
- a difference table against 6 major zones
- links to the 8 nearest-by-offset cities ← this is what gets the long tail crawled
- a store CTA, below the fold

Metadata:

```tsx
<Head>
  <title>Time in Tokyo, Japan — current local time</title>
  <meta name="description" content="Current local time in Tokyo, Japan. …" />
  <link rel="canonical" href="https://timespot.app/time/tokyo" />
  <meta property="og:image" content="/og/tokyo.png" />
  <script type="application/ld+json">{ /* Place + WebPage, dateModified */ }</script>
</Head>
```

Rules: one H1. Real 404 status for an unknown slug (a soft-404 poisons the index). `sitemap.xml` generated from the slug list. OG images generated at build with `satori`.

## Performance budget

| Metric | Budget |
|---|---|
| LCP p75 | **< 1.2 s** |
| Initial route JS | **< 180 KB gz** |
| CLS | < 0.05 |
| Lighthouse a11y / SEO / best practices | **100** |

How the budget is met:

- Map and search are **separate chunks** (`lazy`), not in the initial route.
- The city dataset is **fetched after first paint**, not bundled — it would otherwise be ~60 % of the payload.
- One subset `woff2`, preloaded. `font-display: block` on the clock face only (a font swap on a 320 px numeral is far worse than 100 ms of nothing); `swap` elsewhere.
- `expo-image` emits `<img>` with explicit dimensions and `loading="lazy"` → zero CLS from avatars.
- Hero uses `clamp(96px, 22vw, 320px)` inside a reserved aspect box so the fluid size cannot shift layout.

Lighthouse CI runs against the deployed preview on every PR and blocks on a regression.

## Caching

```
HTML            Cache-Control: max-age=0, must-revalidate     ← the clock must never be stale-cached
hashed assets   Cache-Control: max-age=31536000, immutable
```

## PWA

`manifest.json` with maskable icons, `display: standalone`, `theme_color` per scheme. A minimal service worker caching the app shell + city dataset, so the installed web app is offline-capable exactly like the native one.

## Keyboard

Full table in `docs/07-responsive-strategy.md` §4 — `/` search, `1`/`2`/`3` tabs, `↑↓` list, `←→` meridian, `T` theme, `H` 12/24 h, `Esc` close, `?` overlay. One `useKeyboard` hook at the root, with an input guard.

## Review checklist

- [ ] No hydration warning; no flash of a stale time
- [ ] One H1 per page; unknown slug returns a real 404
- [ ] Canonical, description, OG image, JSON-LD present
- [ ] `sitemap.xml` includes every generated route
- [ ] Neighbour links present (internal linking)
- [ ] LCP, CLS and bundle within budget
- [ ] Lighthouse a11y 100, SEO 100
- [ ] Keyboard shortcuts work and are disabled inside inputs
- [ ] Installable and offline-capable
- [ ] Renders correctly at 320 px and at 400 % zoom
