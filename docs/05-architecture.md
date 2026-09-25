# 05 — Architecture

> ⚠️ **Partially superseded by [`14-ignite-integration.md`](14-ignite-integration.md).**
> The project builds on **Ignite** ([ADR-0007](adr/0007-ignite-boilerplate.md)), so §1's
> styling row and §2's folder structure are replaced by `14` §1 and §8, and NativeWind is
> not installed ([ADR-0008](adr/0008-ignite-theming-over-nativewind.md)). §3 (data flow),
> §4 (**the time engine**) and §6 (performance budget) are unchanged and remain
> authoritative — they do not depend on the boilerplate.

## 1. Stack

Verified against the Expo changelog and docs on 2026-09-23. **Do not pin from memory — run `npx expo install --fix` and let Expo resolve compatible versions.**

| Layer | Choice | Version | Why |
|---|---|---|---|
| Boilerplate | **Ignite** (Expo Router conversion) | latest | `ADR-0007`. Ships MMKV, i18n, theming, `Screen`, generators. Setup: `14` §2. |
| Framework | **Expo SDK 57** | `expo@>=57.0.17` | Latest stable (30 Jun 2026). RN 0.86, React 19.2. Ignite targets 55 — upgrade per `14` §2.3. |
| Runtime | React Native 0.86 / React 19.2 | via SDK | New Architecture only (Legacy dropped in SDK 55) |
| Router | **Expo Router** | `expo-router@~6` | File-based, typed routes, one route tree for native and web, static web export |
| Native UI | **`@expo/ui`** | `~57` | Universal components (Android/iOS/web) — used at the boundary in `03-component-library.md` |
| Styling | **Ignite `ThemedStyle`** | built in | `ADR-0008`. Typed, light/dark aware, already used by every Ignite component. **NativeWind is not installed.** |
| Animation | Reanimated 4.5 + Worklets 0.10 | via SDK | UI-thread meridian drag and numeral rolls |
| Gestures | `react-native-gesture-handler` 2.32 | via SDK | |
| Lists | `@shopify/flash-list` | via SDK | 40-city list, search results |
| SVG | `react-native-svg` | via SDK | icons + world map, identical on web |
| Images | `expo-image` | via SDK | blurhash, recycling, `contentFit` |
| State | **Zustand 5** + `persist` | latest | ~1 KB, no context re-render storms, trivially testable |
| Storage | `react-native-mmkv` (native) / `localStorage` (web) | latest | behind one `StorageAdapter` interface |
| Time | `Intl` + **`@date-fns/tz`** + `date-fns` v4 | latest | see §4 |
| Sun | `suncalc` | latest | 4 KB, MIT, deterministic, offline |
| Search | prebuilt inverted index + `uFuzzy` | latest | < 30 ms over 5 000 cities |
| Fonts | `expo-font` (Space Grotesk, 4 weights) | via SDK | |
| i18n | `i18next` + `expo-localization` | latest | strings externalised from day one |
| Testing | Jest + RNTL, Playwright, Maestro | latest | `11-testing-strategy.md` |
| CI/CD | EAS Build + EAS Workflows + EAS Hosting | — | `12-release-ops.md` |

**Agent skills to install before writing code:**

```bash
claude plugin install expo@claude-plugins-official     # Claude Code
# or: npx skills@latest add expo/skills --skill '*'
```

This gives the official `expo-router`, `expo-ui`, `expo-project-structure`, `expo-native-ui`, `eas-hosting` and `expo-upgrade` skills, plus the Expo MCP server for live docs and `npx expo install`. The project-local skills in `.claude/skills/` layer **on top** of these — they encode *this product's* rules, not Expo's.

---

## 2. Folder structure

> Superseded by [`14-ignite-integration.md`](14-ignite-integration.md) §8. Ignite + Expo Router
> puts **everything under `src/`**, with routes in `src/app/` and components **flat** in
> `src/components/`. The tiering below survives as a *dependency rule*, not a directory layout.

```
timespot/
├─ src/
│   ├─ app/                     ← Expo Router routes ONLY, thin shells
│   │   ├─ _layout.tsx
│   │   ├─ (tabs)/{_layout,index,clock,map}.tsx
│   │   ├─ search.tsx  settings.tsx  city/[id].tsx
│   │   ├─ time/[slug].tsx      web-only public page
│   │   └─ +not-found.tsx
│   ├─ screens/                 the real screen bodies, re-exported by src/app/*
│   ├─ components/              flat, Ignite-style — Ignite's + TimeSpot's
│   ├─ domain/                  ⚠ pure TypeScript — no React, no RN, no Ignite
│   │   ├─ time/                zone.ts  clock.ts  format.ts  capability.ts
│   │   ├─ sun/                 sun.ts   terminator.ts
│   │   ├─ cities/              search.ts  dataset.ts  slug.ts
│   │   └─ types.ts
│   ├─ store/                   cities.ts  prefs.ts  focus.ts  (Zustand over MMKV)
│   ├─ hooks/                   useClock useZonedTime useBreakpoint
│   ├─ theme/                   colors colorsDark spacing radius typography timing context
│   ├─ i18n/                    Ignite's — every string lives here
│   ├─ utils/                   Ignite's — storage/ (MMKV, works on every platform)
│   ├─ assets/                  fonts/  map/world.topo.json  data/cities.min.json
│   └─ stories/                 one file per component, all states × both themes
├─ design/                      tokens.json + ignite-theme/ (drop-in theme files)
├─ docs/                        this documentation set
├─ scripts/                     build-cities.ts  build-map.ts  og-images.ts
├─ .claude/                     skills/  commands/
├─ CLAUDE.md  AGENTS.md
├─ app.config.ts  eas.json  tsconfig.json
└─ package.json
```

**The `domain/` rule is load-bearing.** Everything in `src/domain/` is pure TypeScript with no React and no React Native imports. That means all the hard logic — zone resolution, DST, formatting, sun maths, search — is testable in milliseconds in plain Node, with no renderer, no mocks and no simulator. It is also the only code that can be wrong in a way users notice. Keep it pure.

---

## 3. Data flow

```
                    ┌──────────────┐
   one interval ───►│  useClock()  │  a single `now: number`, tick-aligned
                    └──────┬───────┘
                           │
   Zustand stores          ▼
   ┌────────┐     ┌──────────────────┐     ┌──────────────┐
   │ cities │────►│  selectZonedTime │────►│  <CityRow/>  │  memo'd, pure
   │ prefs  │     │  (domain, pure)  │     │  <HeroClock/>│
   │ focus  │     └──────────────────┘     └──────────────┘
   └────────┘
       │ persist
       ▼
   StorageAdapter  →  one MMKV instance (native + web — v3.3.3 has its own web build)
```

Rules:

1. **One clock.** `useClock()` owns the only interval in the app. Screens read it; components receive derived values as props.
2. **Selectors are pure domain functions**, not hooks. `getZonedTime(now, zone, prefs)` is testable without a renderer.
3. **Stores hold facts, not derivations.** `cities` holds `{id, zone, name, lat, lon}`. It never holds `offset` or `currentTime` — those are computed. (This is the structural fix for audit §8.2.)
4. **No context for high-frequency data.** The clock value never goes through React Context; it would re-render the whole tree every second.

---

## 4. The time engine — the part that must not be wrong

### 4.1 The rule

> **The only persisted time fact is an IANA zone ID.** Offsets, abbreviations and DST status are *derived at the moment of display*, never stored, never cached across a DST boundary.

A literal `-8`, `"UTC-8"` or `"PST"` anywhere in `src/` is a defect. `/tz-audit` greps for exactly this.

### 4.2 The engine

Primary path uses the platform's own tz database via `Intl`:

```ts
// src/domain/time/zone.ts
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: zone, hour12: false,
  year:'numeric', month:'2-digit', day:'2-digit',
  hour:'2-digit', minute:'2-digit', second:'2-digit',
  timeZoneName: 'shortOffset',
})
```

`Intl` is correct by construction — it consults the OS tz database, which is updated by OS updates, so DST rule changes (Chile, Iran, Lebanon, Mexico — all changed within the last few years) arrive without an app release.

### 4.3 The capability probe — the highest-risk item in the project

Hermes on some Android builds ships a reduced ICU. If `Intl.DateTimeFormat` ignores the `timeZone` option, every time in the app is silently wrong — the worst possible failure mode, because nothing throws.

At boot, before first render:

```ts
// src/domain/time/capability.ts
export function probeIntl(): 'full' | 'degraded' {
  const t = new Date('2025-07-01T12:00:00Z')
  const ny = new Intl.DateTimeFormat('en-US',
    { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(t)
  const tk = new Intl.DateTimeFormat('en-US',
    { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false }).format(t)
  // 1 Jul 2025: New York = 08 (EDT), Tokyo = 21
  return (ny === '08' && tk === '21') ? 'full' : 'degraded'
}
```

Two distinct zones, one of them mid-DST. If the probe returns `degraded`, the app switches to `@date-fns/tz`'s `TZDate` backed by a **bundled tzdata slice** (only the ~420 canonical zones, current + next 2 years of transitions, ≈ 60 KB) and reports a non-PII telemetry event so the fallback rate is visible.

The probe result is exposed as `useTimeEngine()` and is asserted in tests on every device tier in the matrix.

### 4.4 Formatting

```ts
formatOffset('Asia/Kathmandu', now)  // → 'UTC+5:45'
formatOffset('Europe/London', now)   // → 'UTC+0'   (winter)  /  'UTC+1' (BST)
formatOffset('America/Los_Angeles')  // → 'UTC−8' / 'UTC−7'
```

- Minus sign is **U+2212**, not `-`.
- Sub-hour zones render `H:MM`; whole hours render bare. Never zero-pad the hour.
- Zones that *do* exist and *will* break naïve code: `+5:45` Kathmandu, `+5:30` India, `+12:45` Chatham, `+8:45` Eucla, `+13`/`+14` Pacific, `−9:30` Marquesas. All are in the test fixtures.

### 4.5 The tick

```ts
// src/hooks/useClock.ts — the only interval in the app
function schedule(cb) {
  const now = Date.now()
  const delay = 1000 - (now % 1000) + 4   // +4 ms guard against firing early
  return setTimeout(cb, delay)
}
```

- Aligns to the wall-clock second boundary rather than drifting by the interval's own latency.
- Re-syncs on `AppState → 'active'` and on web `visibilitychange`; a backgrounded tab may not have fired for hours.
- Stops entirely when the app is not active — no battery cost, no wake locks.
- If `showSeconds` is off on the list, the tick coalesces to the **minute** boundary, so an idle list re-renders once a minute instead of 60 times.
- Guards against a wrong device clock: if `Date.now()` jumps by more than 5 s between ticks, treat it as a system clock change and recompute everything rather than animating a roll through 3 000 values.

---

## 5. Web specifics

- `app.config.ts` → `web.output: 'static'`. Expo Router statically generates every route at build time.
- `/time/[slug]` is generated for the top 1 000 cities via `generateStaticParams`. This is the SEO surface and the acquisition channel.
- **Hydration correctness:** the static HTML contains the build-time clock; the client corrects it on the first frame. To avoid a hydration mismatch warning and a visible flash, the clock node renders `suppressHydrationWarning` and the real value is set in a `useLayoutEffect`.
- Fonts: `woff2` subset, `font-display: block` on the clock face specifically (a swap mid-render on a 320 px numeral is far worse than 100 ms of nothing), `swap` everywhere else. Preload the one clock weight.
- PWA: `manifest.json`, maskable icons, `theme-color` per scheme, offline shell via a small service worker caching the app shell + city dataset.
- Deploy: EAS Hosting (first-party, has an agent skill) or any static host. Both are one command; EAS Hosting also covers Expo Router API routes if they are ever needed.

---

## 6. Performance budget

| Item | Budget | How it is met |
|---|---|---|
| Cold start → readable clock | < 900 ms p75 | fonts preloaded; city dataset lazily loaded *after* first paint; map code-split off the initial route |
| List re-render | 1 component per tick | `useClock` at the screen, memo'd rows, `showSeconds` off by default |
| Meridian drag | 60 fps | shared value on the UI thread; `runOnJS` throttled to 60 ms |
| Map first paint | < 120 ms | 30 KB simplified topology; raster fallback below a device tier |
| Web initial route | < 180 KB gz | map and search chunks lazy; dataset fetched, not bundled |
| Memory, 40 cities | < 120 MB | FlashList recycling, `expo-image` `recyclingKey` |

---

## 7. Decisions recorded as ADRs

| ADR | Decision |
|---|---|
| `adr/0001-expo-sdk-57-universal.md` | One Expo codebase for iOS, Android and web |
| `adr/0002-nativewind-over-unistyles.md` | ⛔ superseded by 0008 |
| `adr/0007-ignite-boilerplate.md` | Build on Ignite with Expo Router |
| `adr/0008-ignite-theming-over-nativewind.md` | Ignite's `ThemedStyle` as the styling layer |
| `adr/0003-expo-ui-boundary.md` | Where `@expo/ui` is used and where it is not |
| `adr/0004-intl-time-engine.md` | `Intl` primary, bundled tzdata fallback, boot probe |
| `adr/0005-zustand-local-first.md` | Zustand + MMKV, no accounts in v1 |
| `adr/0006-static-web-seo.md` | Static export with per-city routes as the acquisition channel |
