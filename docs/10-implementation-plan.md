# 10 — Implementation Plan

Sequenced for a solo developer working with Claude Code. Each task is one focused session: a clear input, a clear output, and an acceptance criterion you can actually check.

**Order is not arbitrary.** Tokens before components, components before screens, domain before UI, correctness before polish. Skipping ahead is how a design system becomes a pile of one-off styles.

Estimates assume agent-assisted implementation with you reviewing. Halve them if you know the stack cold; double them if this is your first Reanimated map.

---

## Phase 0 — Foundations (G0) · ~1.5 days

> ⛔ **Superseded by [`14-ignite-integration.md`](14-ignite-integration.md) §10**, which is the
> Ignite version of this phase. Run it with `/ignite-setup`. The summary below is kept so the
> phase table reads continuously; the acceptance criteria are the same.

| # | Task | Acceptance |
|---|---|---|
| 0.1 | `npx ignite-cli@latest new timespot --yes`; commit the untouched baseline | boots on iOS + Android |
| 0.2 | Expo Router conversion (`app/ → src/`, `src/app/` routes, `expo-router/entry`) | route tree renders; deep link resolves |
| 0.3 | **SDK 55 → 57 upgrade**, pin `expo@>=57.0.17` ⚠️ riskiest step | `expo-doctor` clean; boots on iOS, Android **and web** |
| 0.4 | ~~`storage.web.ts`~~ — not needed, MMKV 3.3.3 has its own web build | theme choice survives a web reload |
| 0.5 | Copy `design/ignite-theme/*` into `src/theme/`; wire `radius` into `theme.ts` + `types.ts` | sample screen in TimeSpot colours, both schemes |
| 0.6 | Font swap in `typography.ts` (keep the `light`/`bold` aliases) — ~~Geist~~ **Space Grotesk**, corrected 2026-09-25 (audit §6) | fonts load on all three platforms |
| 0.7 | Extend Ignite `Text` with display sizes + TimeSpot presets; `includeFontPadding: false` | `preset="hero"` is vertically centred on Android |
| 0.8 | Build `<Numeral>` — measured width + `tabular-nums`, no roll yet | `08:40 → 08:41` causes zero layout shift, **measured** |
| 0.9 | Add `@expo/ui`; build the `Sheet` adapter | sheet opens on iOS, Android and web |
| 0.10 | Zustand stores over Ignite's MMKV storage | survives relaunch on all three platforms |
| 0.11 | CI (`.github/workflows/ci.yml`): typecheck, lint, test | green on every push/PR. `/token-check` and a contrast checker are agent-driven and manual for now, not wired into this workflow |

**Gate G0:** a sample screen in TimeSpot's theme, both schemes, on all three platforms, with a stable clock rendering through `<Numeral>`. **Do not proceed until `/token-check` is green** — every later task assumes it.

---

## Phase 1 — Domain (pure TypeScript, no UI) · ~2.5 days

This is the highest-value phase and it needs no simulator. Everything here is unit-tested in plain Node.

| # | Task | Acceptance |
|---|---|---|
| 1.1 | `domain/time/capability.ts` — the `Intl` probe (`05-architecture.md` §4.3) | returns `'full'` on a real device; returns `'degraded'` when `Intl` is stubbed |
| 1.2 | `domain/time/zone.ts` — `getZonedTime`, `getOffsetMinutes`, `formatOffset` | all 17 fixture zones in `06-data-model.md` §5 pass |
| 1.3 | `@date-fns/tz` fallback path behind the probe | forcing `degraded` produces identical output for all fixtures |
| 1.4 | DST transition tests | LA, London, Sydney, Chatham, Santiago, Cairo, Tehran — correct on both sides of every 2026–2028 transition |
| 1.5 | `domain/time/diff.ts` — difference + working-hours overlap | `getDifference('Asia/Kolkata','Europe/London')` = `+5:30` in winter (GMT), `+4:30` in summer (BST) — **corrected 2026-09-24**, the draft numbers here had it backwards; verified against `Intl` directly, not memorized |
| 1.6 | `domain/sun/sun.ts` via `suncalc` | Tromsø polar night and midnight sun both return the right `kind`; day length matches a reference to ±1 min |
| 1.7 | `domain/sun/terminator.ts` → SVG path | snapshot at equinox and both solstices |
| 1.8 | `scripts/build-cities.ts` → `cities.min.json` + index | 5 000 cities, all slugs unique — **corrected 2026-09-24**: 373/418 canonical zones covered, not all 418. The 45 gaps are real and expected, not a bug: Antarctic research stations with no civilian population, deprecated tzdata aliases GeoNames no longer uses (`Asia/Calcutta`, `Europe/Kiev`, …), and a handful of islands/towns genuinely under ~1,000 people even in GeoNames' broadest population tier (`Australia/Eucla`, `Pacific/Midway`). See the coverage report `scripts/build-cities.ts` prints and `src/domain/cities/dataset.test.ts`. |
| 1.9 | `domain/cities/search.ts` | "tok"→Tokyo, "köln"→Koeln (fuzzy tier — GeoNames' own asciiName is "Koeln", not "Koln"), "berln"→Berlin; **< 30 ms**, asserted. ~~"nwyork"→New York~~ — **corrected 2026-09-24**: doesn't hold against the real GeoNames name "New York City" (three words) since a single unsplit query term can't fuzzy-match across uFuzzy's word-boundary splitting |
| 1.10 | `scripts/build-map.ts` — Natural Earth → simplified TopoJSON | ~~≤ 30 KB, 110 m~~ **≤ 240 KB, 50 m, land + countries in one topology** (corrected 2026-09-25: 30 KB looked low quality and misaligned the active country) |

**Gate:** `pnpm test src/domain` green, 100 % of the fixture matrix, sub-second run. If this phase is solid, the rest of the app cannot be wrong about time.

---

## Phase 2 — Components (G0.5) · ~1.5 days

| # | Task | Acceptance |
|---|---|---|
| 2.1 | `Pressable` — press spring, hitSlop, haptics, web focus ring | 44/48 pt hit area verified with the inspector |
| 2.2 | **`Card`** — TimeSpot's hairline version, replacing Ignite's elevated panel, + `selected` inverse context | a descendant `<Text>` auto-inverts inside a selected card |
| 2.3 | `Button` restyle (add a `pill` preset), `SegmentedPill` | pill thumb measures and slides between unequal segment widths |
| 2.4 | `Icon` — re-source Ignite's to the 20 SVG icons via `svgr` | `currentColor` works inside a selected card and in dark theme |
| 2.5 | `Avatar` + `AvatarStrip` on `expo-image` | grayscale → colour animates on focus; monogram fallback renders |
| 2.6 | Stories for every component, all states × both themes | `/visual-qa` produces a full contact sheet |

`Text`, `Numeral` and `Sheet` are already done in Phase 0 (`14` §10).

**Gate G0.5:** every story renders identically in structure on iOS, Android and web, in both themes.

---

## Phase 3 — Core loop (G1) · ~3 days

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Zustand stores + `StorageAdapter` (one MMKV instance for native + web, in-memory for tests) — done in Phase 0, task 0.10 | kill and relaunch — cities, order, focus and prefs all survive |
| 3.2 | `useClock()` — boundary-aligned, AppState/visibility resync, minute coalescing | one interval in the app (asserted in a test); background for 10 min → correct on resume |
| 3.3 | `CityRow` — memo'd, time as a prop | React DevTools profiler: **1 render per tick**, not N |
| 3.4 | **S1 List** — strip, title, FlashList, tab bar | matches `04-screen-specs.md` geometry within 2 pt |
| 3.5 | Focus behaviour + selected-row inversion + haptic | selection is global and persists across relaunch |
| 3.6 | Reorder (drag + a11y actions) and delete (swipe + undo toast) | reorder survives relaunch; undo restores position, not just the city |
| 3.7 | **S4 Search sheet** | type "tok" → Tokyo first, < 30 ms, keyboard-navigable on web |
| 3.8 | **S2 Clock** — hero, date, `SunBlock`, 12/24 pill | polar cases render; pill persists globally |
| 3.9 | First-launch seeding (device zone + 3 defaults) | fresh install in `Asia/Karachi` seeds Karachi focused, then NY/London/Tokyo |
| 3.10 | Empty, single-city, 40-city and long-name states | all four screenshot-tested |

**Gate G1:** you can add, reorder, delete and focus cities on all three platforms, and the times are correct.

---

## Phase 4 — Map (G2) · ~3 days

The hardest phase. Budget the most review time here.

| # | Task | Acceptance |
|---|---|---|
| 4.1 | `WorldMap` — SVG paths, ~~equirectangular~~ clipped Mercator with borders (corrected 2026-09-25) | first paint < 120 ms on a Pixel 6a |
| 4.2 | Night overlay — hatching clipped to land, inside `WorldMap`, recomputed per minute | visually correct at equinox and both solstices |
| 4.3 | ~~`MeridianLine` on a Reanimated shared value~~ `MeridianMap` point-anywhere pointer (corrected 2026-09-25) | drag is 60 fps with the map rendered |
| 4.4 | `UtcRuler` follows the pointed-at city's offset; settling it selects that zone's city | ruler and pointer never disagree; includes `+5:45`, `+12:45`, `+14` |
| 4.5 | Snap + haptic + `scheduleOnRN` (was `runOnJS`, deprecated in Reanimated 4) throttled to 60 ms | profiler shows no per-frame JS |
| 4.6 | `FloatingCityCard`, clamped to the gutter | at map edges the card stays fully on screen |
| 4.7 | Active-country fill for the focused city | Algeria fills black when UTC+1/Algiers is selected |
| 4.8 | a11y: `adjustable` role, keyboard arrows on web | VoiceOver swipe changes zone; the screen works with the map hidden |
| 4.9 | Raster fallback under a device-tier check | forced low-tier renders the raster and still drags at 60 fps |

**Gate G2:** 60 fps meridian drag on a mid-range Android, and the screen is fully usable with a screen reader.

---

## Phase 5 — Motion & polish (G3) · ~2 days

| # | Task | Acceptance |
|---|---|---|
| 5.1 | `Numeral animate="roll"` — the odometer | matches `08-motion-spec.md` §3; only the changing digit moves |
| 5.2 | Clock-jump guard | set the device clock forward an hour → cut, not a 3 600-frame roll |
| 5.3 | Row-select choreography with the 40 ms stagger | no frame where two rows look selected |
| 5.4 | Entrance choreography, post-first-paint | does not delay time-to-readable-clock (measured) |
| 5.5 | Reduced-motion variants for all 15 animations | every value still updates with the setting on |
| 5.6 | Dark theme audit across every screen and state | `/a11y-sweep` contrast pass in both themes |
| 5.7 | Error states: dataset load failure, degraded `Intl`, corrupt storage | each shows a real message and a recovery path |

**Gate G3:** `/a11y-sweep` and `/visual-qa` green in both themes.

---

## Phase 6 — Web (G4) · ~2.5 days

| # | Task | Acceptance |
|---|---|---|
| 6.1 | `output: 'static'`, route-level code splitting | initial route < 180 KB gz |
| 6.2 | Breakpoint layouts: card grid, header nav, inline hero | matches the web board at 1440 |
| 6.3 | `/time/[slug]` for the top 1 000 cities | `generateStaticParams` emits 1 000 HTML files |
| 6.4 | SEO: title, description, canonical, JSON-LD, sitemap, neighbour links | Lighthouse SEO = 100 |
| 6.5 | Hydration-safe clock | no mismatch warning, no visible flash of a stale time |
| 6.6 | OG images per city via `satori` | 1 000 PNGs generated at build |
| 6.7 | PWA: manifest, icons, service worker | installable; works offline |
| 6.8 | Keyboard shortcuts + `?` overlay | full table from `07` works; disabled inside inputs |
| 6.9 | Deploy to EAS Hosting with a custom domain | LCP < 1.2 s p75 on a throttled 4G profile |

**Gate G4:** Lighthouse 100 on accessibility, SEO and best practices; LCP under budget.

---

## Phase 7 — Ship (G5) · ~2 days

| # | Task | Acceptance |
|---|---|---|
| 7.1 | `eas.json` profiles: development, preview, production | all three build |
| 7.2 | EAS Workflow: build previews on PR, production on tag | green pipeline |
| 7.3 | App icons, splash, adaptive icon, maskable web icons | render correctly on both OSes |
| 7.4 | Store metadata, keywords, screenshots (6 per platform) | generated from the real app, not the mockups |
| 7.5 | `PrivacyInfo.xcprivacy` + Play Data Safety = "no data collected" | both submissions accepted |
| 7.6 | Sentry + `expo-insights`, PII-free | events carry no city names |
| 7.7 | `expo-updates` channel config for OTA hotfixes | a JS-only fix reaches a device without a store review |
| 7.8 | 72 h TestFlight + internal-track soak | zero P0 |

---

## Sequencing notes

- **Phases 1 and 2 are independent** — domain needs no UI, UI needs no domain. If you want a change of pace, alternate.
- **Phase 4 can slip past Phase 5** without blocking a release. A v1.0 without the map screen is still a complete product; a v1.0 with a janky map is not.
- **Phase 6 depends only on Phases 2–3.** If the web is the priority, do 0 → 1 → 2 → 3 → 6 and treat 4 as v1.1.

## Total

≈ **16 working days** to G5 for a focused solo developer with agent assistance — one day less than the bare-scaffold plan, because Ignite already provides storage, i18n, theming, `Screen` and the generators, which more than pays for the Expo Router conversion and the SDK upgrade. Realistically 4–6 calendar weeks at a sustainable pace.

## Definition of done, per task

1. Types pass (`tsc --noEmit`, strict).
2. Tests pass, including any new domain fixtures.
3. `/token-check` finds no literals.
4. Renders correctly on iOS, Android and web, in both themes.
5. Strings go through `tx`.
6. Has an `accessibilityLabel` or a documented reason it does not.
7. Nothing in `docs/` is now false — if the implementation diverged, the doc is updated in the same commit.
