/**
 * Core domain types (docs/06-data-model.md §1). Pure TypeScript — no React,
 * no React Native, no Ignite imports allowed anywhere under src/domain/.
 */

/** A city in the bundled dataset. Immutable, ships with the app. */
export interface City {
  id: string // stable: geonames id, e.g. 'gn-1850147'
  slug: string // URL-safe, unique: 'tokyo', 'new-york', 'cordoba-ar'
  name: string // display: 'Tokyo'
  // asciiName / altNames: search-only, not part of City — they live in
  // cities.search.json, loaded on demand by domain/cities/search.ts.
  admin1?: string // 'California' — omitted where meaningless
  country: string // 'Japan'
  countryCode: string // 'JP' (ISO 3166-1 alpha-2)
  zone: string // ⭐ IANA: 'Asia/Tokyo' — the ONLY time fact stored
  lat: number
  lon: number
  population: number // search ranking
  photo?: string // asset key; undefined → monogram fallback
  blurhash?: string
}

/** A city as scripts/build-cities.ts emits it into `cities.min.json`: the
 * `City` plus its search-only names, which the app loads separately. */
export interface DatasetCity extends City {
  asciiName: string // search: 'Tokyo'
  altNames: string[] // search: ['東京','Tokio','Tokyo-to']
}

/** A city the user has saved. Persisted. */
export interface SavedCity {
  cityId: string
  addedAt: number // epoch ms
  order: number // user's manual ordering
  label?: string // optional rename: 'Mum'
}

/** A derived view-model. Computed every tick, never stored. */
export interface ZonedTime {
  iso: string // '2026-09-23T17:16:04+05:00'
  hours: string // '17'  — already formatted for the active 12/24h pref
  minutes: string // '16'
  seconds: string // '04'
  meridiem?: "AM" | "PM" // only in 12h mode
  display: string // '17:16'  — the memo key for CityRow
  offsetMinutes: number // 315
  offsetLabel: string // 'UTC+5:45'
  dateLabel: string // 'Wed, 23 Sep'
  weekday: number // 0-6
  isDay: boolean
  dayOffset: -1 | 0 | 1 // relative to the user's own calendar day
}

export interface SunTimes {
  sunrise: Date | null // null in polar night
  sunset: Date | null // null in midnight sun
  dayLengthMinutes: number
  kind: "normal" | "polar-night" | "midnight-sun"
}

export interface Prefs {
  timeFormat: "12h" | "24h"
  theme: "system" | "light" | "dark"
  showSecondsOnList: boolean
  dayNightStyle: "icon" | "tint"
}
