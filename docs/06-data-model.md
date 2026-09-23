# 06 — Data Model

Everything is local. No server, no account, no network dependency for any v1 feature.

---

## 1. Core types

```ts
// src/domain/types.ts

/** A city in the bundled dataset. Immutable, ships with the app. */
export interface City {
  id: string            // stable: geonames id, e.g. 'gn-1850147'
  slug: string          // URL-safe, unique: 'tokyo', 'new-york', 'cordoba-ar'
  name: string          // display: 'Tokyo'
  asciiName: string     // search: 'Tokyo'
  altNames: string[]    // search: ['東京','Tokio','Tokyo-to']
  admin1?: string       // 'California' — omitted where meaningless
  country: string       // 'Japan'
  countryCode: string   // 'JP' (ISO 3166-1 alpha-2)
  zone: string          // ⭐ IANA: 'Asia/Tokyo' — the ONLY time fact stored
  lat: number
  lon: number
  population: number    // search ranking
  photo?: string        // asset key; undefined → monogram fallback
  blurhash?: string
}

/** A city the user has saved. Persisted. */
export interface SavedCity {
  cityId: string
  addedAt: number       // epoch ms
  order: number         // user's manual ordering
  label?: string        // optional rename: 'Mum'
}

/** A derived view-model. Computed every tick, never stored. */
export interface ZonedTime {
  iso: string           // '2026-09-23T17:16:04+05:00'
  hours: string         // '17'  — already formatted for the active 12/24h pref
  minutes: string       // '16'
  seconds: string       // '04'
  meridiem?: 'AM'|'PM'  // only in 12h mode
  display: string       // '17:16'  — the memo key for CityRow
  offsetMinutes: number // 315
  offsetLabel: string   // 'UTC+5:45'
  dateLabel: string     // 'Wed, 23 Sep'
  weekday: number       // 0-6
  isDay: boolean
  dayOffset: -1 | 0 | 1 // relative to the user's own calendar day
}

export interface SunTimes {
  sunrise: Date | null      // null in polar night
  sunset: Date | null       // null in midnight sun
  dayLengthMinutes: number
  kind: 'normal' | 'polar-night' | 'midnight-sun'
}

export interface Prefs {
  timeFormat: '12h' | '24h'
  theme: 'system' | 'light' | 'dark'
  showSecondsOnList: boolean
  dayNightStyle: 'icon' | 'tint'
}
```

### The one rule

`City.zone` is an IANA identifier and it is **the only time-related field that is ever persisted**. `offsetMinutes`, `offsetLabel`, `isDay` and every other time value live on `ZonedTime`, which is recomputed on every tick and never written to disk.

This is the structural fix for audit §8.2. It is impossible to have a DST bug in data that does not exist.

---

## 2. Persisted state

Three Zustand stores, each with its own `persist` slice and its own schema version.

```ts
// store/cities.ts     key 'ts.cities.v1'
{ version: 1, cities: SavedCity[] }

// store/prefs.ts      key 'ts.prefs.v1'
{ version: 1, prefs: Prefs }

// store/focus.ts      key 'ts.focus.v1'
{ version: 1, focusedCityId: string | null }
```

Splitting them means a corrupt prefs blob cannot cost the user their city list, and each can migrate independently.

### Storage adapter

```ts
// src/store/storage.ts
export interface StorageAdapter {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}
```

`react-native-mmkv` (synchronous, ~30× faster than AsyncStorage, which matters because the city list is read during the first render) on every platform — v3.3.3 ships its own `localStorage`-backed web implementation, Metro-resolved automatically, so native and web share one adapter (`src/store/storage.ts`). Wrapped in try/catch for Safari private mode. Tests → an in-memory map.

### Migration

Every store declares `migrate(persisted, fromVersion)`. Never mutate a persisted shape in place; bump the version and write a migration, even in v1 development. Unknown/future versions reset to defaults rather than crashing, and the reset is logged.

### First launch

1. Resolve the device zone: `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to `expo-localization`'s `getCalendars()[0].timeZone`, falling back to `'UTC'`.
2. Match it to the nearest dataset city by zone (exact zone match, then highest population in that zone).
3. Seed that city, focus it, and seed three defaults so the empty state is never the first impression: New York, London, Tokyo — **skipping any that duplicate the device zone**.

---

## 3. City dataset

### Build

`scripts/build-cities.ts`, run at build time, not runtime.

| Step | Detail |
|---|---|
| Source | GeoNames `cities15000` + `timeZones.txt` + `admin1CodesASCII.txt` (**CC BY 4.0 — attribution required in About**) |
| Filter | population ≥ 15 000, plus a hand-curated allow-list of capitals and notable small cities (Reykjavík, Nuuk, Apia, Chatham Islands — the interesting-zone cases) |
| Cap | **5 000** cities, ranked by population, with a guarantee that **every one of the ~420 canonical IANA zones has at least one representative city** |
| Slug | `slugify(name)`, deduped with a country suffix: `cordoba` / `cordoba-ar` |
| Validate | every `zone` must be a canonical IANA id — links like `Asia/Calcutta` are normalised to `Asia/Kolkata` |
| Output | `src/assets/data/cities.min.json` (**actual: ~1.27 MB, ~334 KB gz** — corrected 2026-09-24, the ~380/110 KB estimate was well off once real GeoNames data replaced the placeholder assumption; `country`/`admin1` are stored as full names per the `City` type rather than interned codes, which is the main cost — see `scripts/build-cities.ts`) + `cities.index.json` (inverted index, task 1.9) |

Native bundles the JSON. Web **fetches** it after first paint so the initial route stays under budget; the search sheet shows a skeleton for the ~80 ms it takes on a warm cache.

### Search index

Prebuilt inverted index: lowercased, `NFD`-normalised, diacritics stripped, over `name + asciiName + altNames + country`. Query path:

1. exact prefix on `asciiName` → weight 100
2. prefix on any `altName` → 70
3. fuzzy (`uFuzzy`, distance ≤ 2) → 40
4. country name match → 20
5. final rank `weight × log10(population)`

Budget: **< 30 ms** for the whole result list over 5 000 cities. Asserted in a unit test with a hard timing bound.

---

## 4. Domain functions (pure, no React)

```ts
// src/domain/time/zone.ts
getZonedTime(now: number, zone: string, prefs: Prefs): ZonedTime
getOffsetMinutes(now: number, zone: string): number
formatOffset(offsetMinutes: number): string          // 'UTC+5:45'
getDeviceZone(): string
isValidZone(zone: string): boolean
getNextTransition(zone: string, from: number): { at: number; deltaMinutes: number } | null

// src/domain/time/diff.ts
getDifference(a: string, b: string, now: number): { minutes: number; label: string }
getOverlap(a: string, b: string, workday: [number, number], now: number): { start: number; end: number } | null

// src/domain/sun/sun.ts
getSunTimes(lat: number, lon: number, date: Date, zone: string): SunTimes
isDaylight(lat: number, lon: number, now: number): boolean

// src/domain/sun/terminator.ts
getTerminatorPath(now: number, width: number, height: number): string   // SVG 'd'

// src/domain/cities/search.ts
searchCities(query: string, limit?: number): City[]
getCityByZone(zone: string): City | undefined
getRepresentativeCity(offsetMinutes: number): City
```

Every one of these is a pure function of its arguments. Every one has a unit test. None of them import React.

`getOverlap`'s signature above adds `now` — **corrected 2026-09-24**. The original draft omitted it, which isn't possible to honor alongside "the one rule": an offset-dependent overlap window can't be pure without the instant it's computed for.

`getNextTransition` powers the public web page ("clocks go forward on 29 March") and is also what makes DST testable: assert the transition date for 40 zones against the tz database.

---

## 5. Test fixtures — the zones that break naïve code

Baked into `src/domain/__fixtures__/zones.ts` and exercised by the matrix in `11-testing-strategy.md`.

| Zone | Why it is in the fixture set |
|---|---|
| `Asia/Kathmandu` | UTC+5:45 — 45-minute offset |
| `Asia/Kolkata` | UTC+5:30 — half-hour, and a canonical-link rename |
| `Australia/Eucla` | UTC+8:45 |
| `Pacific/Chatham` | UTC+12:45 **and** DST |
| `Pacific/Kiritimati` | UTC+14 — the maximum; date is ahead of everywhere |
| `Pacific/Midway` | UTC−11 |
| `America/Los_Angeles` | Northern-hemisphere DST |
| `Australia/Sydney` | Southern-hemisphere DST (inverted) |
| `Europe/London` | DST transition differs from the US by 3 weeks — the exact case the mockup got wrong |
| `Asia/Tehran` | abolished DST in 2022 — stale-rule detector |
| `America/Santiago` | DST rules changed recently, southern hemisphere |
| `Africa/Cairo` | reinstated DST in 2023 |
| `Asia/Shanghai` | 5.2 M km², a single zone |
| `Antarctica/Troll` | UTC+0 / +2, a 2-hour DST jump |
| `Europe/Lisbon` vs `Europe/Madrid` | same longitude, different zones — catches geo-based guessing |
| `America/St_Johns` | UTC−3:30 |
| `Asia/Jerusalem` | DST dates set by legislation, not a fixed rule |

---

## 6. Privacy

- No PII is collected. No account, no email, no device ID.
- Analytics events carry an event name and a coarse bucket only — **never a city name, never a zone**, since the pair (home zone, saved zones) is close to identifying.
- The city dataset is bundled; no geocoding request ever leaves the device.
- Location permission is **never requested**. The device's own zone setting is enough, and it is already available with no permission.
- iOS privacy manifest (`PrivacyInfo.xcprivacy`) declares: no tracking, no data collection, `UserDefaults` API access reason `CA92.1`.
- Play Data Safety: "No data collected", "No data shared".
