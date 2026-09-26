# 07 — Responsive & Platform Strategy

One route tree, one component tree, three renderings. The layout adapts by **breakpoint**, not by platform — with a small, explicitly enumerated set of platform exceptions.

---

## 1. Breakpoints

| Token | Min width | Typical device | Layout |
|---|---|---|---|
| `xs` | 0 | small phones (320–389) | single column, gutter ~~20~~ **28** |
| `sm` | 390 | phones | single column, gutter 28 ← **mobile reference** |
| `md` | 768 | tablets, small windows | 2-up card grid, gutter 32 |
| `lg` | 1024 | tablets landscape, laptops | 3-up, gutter 48, header nav replaces tab bar |
| `xl` | 1280 | desktop | 4-up, gutter 64, container 1312 ← **web reference** |
| `2xl` | 1600 | large desktop | container stays 1312, gutter grows |

```ts
// src/hooks/useBreakpoint.ts
const { width } = useWindowDimensions()   // works identically on native and web
```

`useWindowDimensions`, not `Dimensions.get()` — it updates on rotation, on iPad multitasking, and on browser resize. Never read the breakpoint at module scope.

Implemented as the pure `src/theme/breakpoints.ts` (`breakpointFor`, `gutterFor`, `contentWidthFor`, `cardColumnsFor`, unit-tested) plus `useBreakpoint()`. **Correction 2026-09-26:** `xs` keeps the 28 gutter. Every phone row, sheet and header already carries 28 internally, so a 20 pt page gutter misaligned the screen against its own sheets. Gutters are 28 / 28 / 32 / 48 / 64 from `xs` to `xl`.

---

## 2. What changes at each breakpoint

| Element | `xs–sm` | `md–lg` | `xl+` |
|---|---|---|---|
| Navigation | floating tab bar, bottom | tab bar | **header nav**, tab bar hidden |
| Saved cities | vertical rows, 334 × 92 | 2–3 card grid, 180 tall | 4 card grid, 320 × 180 |
| Hero clock | stacked `HH` / `MM SS` | inline `HH:MM:SS` | inline, `clamp(96px, 22vw, 320px)` |
| City name | 56 pt, wraps to 4 lines | 56, 2 lines | 64, 2 lines |
| Map | fills remaining height | 16:9 band | 16:9, floating card docks right |
| Search | bottom sheet, 92 % | bottom sheet | centred modal 560 × 640 |
| Settings | sheet | sheet | sheet |
| Gutter | 20 / 28 | 32 / 48 | 64 |

The **tab bar → header nav** switch at `lg` is the only structural change. It is implemented once, in `app/(tabs)/_layout.tsx`, by swapping the `tabBar` renderer — the screens themselves do not know which one is mounted. Done (task 6.2): `useUsesHeaderNav()` picks the renderer, and `tabBarPosition` moves to `top` with the header nav. The table's column breakpoints hold, with one deviation: at `md` the floating tab bar stays (the header nav starts at `lg`, as the Navigation row says), and the Clock keeps a Settings mark in its band until the header nav takes it over.

---

## 3. The platform-exception list

Everything that genuinely cannot be shared. This list is **closed** — adding to it requires an ADR.

| # | Concern | Native | Web | Where |
|---|---|---|---|---|
| 1 | Storage | MMKV | `localStorage` | `store/storage.native.ts` / `.web.ts` |
| 2 | Haptics | `expo-haptics` | no-op | `lib/haptics.ts` |
| 3 | Sheet | `@expo/ui` `BottomSheet` | modal + focus trap | `ui/Sheet.tsx` / `.web.tsx` |
| 4 | Safe area | `useSafeAreaInsets()` | `env(safe-area-inset-*)` | `hooks/useInsets.ts` |
| 5 | Keyboard nav | n/a | full tab order, arrow keys, shortcuts | `hooks/useKeyboard.web.ts` |
| 6 | Document head | n/a | `expo-router/head` | route files only |
| 7 | Grayscale filter | Skia `ColorMatrix` | CSS `filter` | `ui/Avatar.tsx` / `.web.tsx` |
| 8 | Map raster fallback | device-tier check | never (browsers cope) | `features/WorldMap.tsx` |
| 9 | Clock resume | `AppState` | `visibilitychange` | `hooks/useClock.ts` (one file, both branches) |
| 10 | Dataset delivery | bundled | bundled boot data + search names as a lazy chunk (~~`fetch` after first paint~~, see §4) | `domain/cities/dataset.ts`, `search.ts` |

Ten exceptions for a three-platform app is the target. If it grows past fifteen, the abstraction has drifted and it is time to refactor rather than add an eleventh.

**No `Platform.OS` in a tier-3 (domain-aware) component or in `src/screens/`.** If a feature needs a platform difference, it consumes a tier-1 or tier-2 component that already absorbed it.

---

## 4. Web-only concerns

### Keyboard

| Key | Action |
|---|---|
| `/` | focus search |
| `1` `2` `3` | List / Clock / Map |
| `↑` `↓` | move selection in the city list |
| `Enter` | focus the selected city |
| `← →` | move the meridian by 1 h (`Shift` → 15 min) |
| `T` | toggle theme |
| `H` | toggle 12/24 h |
| `Esc` | close sheet / modal |
| `?` | shortcut overlay |

All are implemented as a single `useKeyboard` hook registered at the root, with an `input`/`textarea` guard so typing in search never triggers a shortcut.

### SEO

- Per-city static routes — see `04-screen-specs.md` S6.
- `sitemap.xml` generated from the slug list at build.
- `robots.txt` allowing everything; no soft-404s (unknown slug → real 404 status via the route's `+not-found`).
- Structured data: `Place` + `WebPage` with `dateModified`. No `SpeakableSpecification` — it is not a speakable page.
- Internal linking: every city page links to its 8 nearest-by-offset neighbours. This is what gets the long tail indexed.
- **Implemented (6.4).** `scripts/build-sitemap.ts` writes `public/sitemap.xml` (1,001 URLs) and `robots.txt`. `scripts/finalize-web-export.ts` removes the soft-404 fallback, puts `<meta charset>` first in every page (Expo Router injects head tags ahead of it), and fails if any sitemap URL has no page. Both run in `npm run export:web`. Expo Router's own dev `_sitemap` route is off (`sitemap: false`). Neighbours are one per zone, so Tokyo doesn't link to eight Japanese cities.

### PWA

`manifest.json` with maskable icons, `display: standalone`, `theme_color` per scheme. A minimal service worker caching the app shell and the city dataset — so the installed web app is offline-capable exactly like the native one.

**Implemented (6.7).** `scripts/build-pwa.ts` runs last in `npm run export:web`:
- **Manifest.** `/manifest.webmanifest`: standalone, starting on the list. ~~`theme_color` per scheme~~ **corrected:** a manifest takes one `theme_color`, so it uses the light canvas. The per-scheme tint comes from the `theme-color` meta tags in `+html.tsx`.
- **Icons.** 192 and 512 (the dial on transparent), a maskable 512 (the dial inside the 80 % safe circle on the canvas) and `apple-touch-icon`. They are drawn from `scripts/lib/dial.ts`, the same mark as the OG images. This is a placeholder until 7.3 designs the real icon; the favicon is still Ignite's.
- **Service worker.** `/sw.js` is generated from `scripts/lib/sw.template.js`. It precaches the three app routes and every JS chunk (the city dataset and search names are chunks), plus the fonts, the map raster and the icons: 36 files, 4.1 MB raw. The cache is named by a hash of the list, so a deploy replaces it on activation.
  - **Pages:** network first. Online, the HTML is never stale. Offline, a page falls back to its cached copy and then to the `/` shell, which renders whatever route the URL names, including a city page never visited.
  - **Hashed assets:** cache first.
  - **Registration:** in production only, after `load` (`utils/serviceWorker.web.ts`).
- **Hosting (6.9).** `sw.js` and `manifest.webmanifest` need `Cache-Control: max-age=0, must-revalidate`, like HTML. A cached worker would pin visitors to an old deploy.

### Performance

- Route-level code splitting: map and search are separate chunks. Done via Expo Router async routes (`asyncRoutes.web: "production"`), with the sheets as lazy components.
- ~~The city dataset is `fetch`ed, not bundled~~. **Corrected 2026-09-26:** every screen needs city names and zones for its very first render, so fetching the whole dataset only moves the wait. Instead `scripts/pack-cities.ts` packs it: the boot data (`cities.core.json`, columns, interned strings, 136 KB gz, from 327) stays in the bundle, and the search-only names (`cities.search.json`, 115 KB gz) are a chunk that search loads on first use, matching display names until it lands.
- Fonts: one `woff2` subset, preloaded, `font-display: block` on the clock face only.
- Images: `expo-image` emits `<img>` with `loading="lazy"` and explicit dimensions — zero CLS from avatars.

---

## 5. Density and input

| | Touch | Mouse | Keyboard |
|---|---|---|---|
| Min target | 44 (iOS) / 48 (Android) | 32 | — |
| Hover states | none | `bg.card` → +2 lightness, `duration.fast` | — |
| Focus ring | none | none | `stroke.focus` 2 px, 2 px offset, always visible |
| Drag | long-press then drag | click-drag on a handle | `Space` to lift, `↑↓` to move, `Space` to drop |

Hover styles are applied only under `@media (hover: hover)` so a touch device never gets a sticky hover state.

---

## 6. Orientation and window resizing

- **Phone landscape:** the hero clock switches to `inline` and the city block moves to a right column. Not a separate layout — it is the `md` layout, triggered by width.
- **iPad split view:** handled automatically by the width-based breakpoints. Verify at 1/3, 1/2 and 2/3 widths.
- **Browser resize:** no layout thrash — `useWindowDimensions` is already throttled by the platform; the card grid uses `flexWrap`, not a JS-computed column count.
- **Font scaling at 200 %:** display variants cap at 1.3×; body and label scale fully. The list row grows from 92 to ~124 pt and the layout must still hold. This is a tested state, not an assumption.
