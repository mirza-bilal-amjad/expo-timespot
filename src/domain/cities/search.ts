import uFuzzy from "@leeoniya/ufuzzy"

import { getOffsetMinutes } from "../time/zone"
import type { City } from "../types"
import { allCities, declaredRowCount } from "./dataset"

/**
 * docs/06-data-model.md §3 "Search index". Ranking, in priority order:
 *   1. exact prefix on asciiName  -> weight 100
 *   2. prefix on any altName      -> weight 70
 *   3. fuzzy (uFuzzy)             -> weight 40
 *   4. country name match         -> weight 20
 * final rank = weight * log10(population)
 *
 * The doc describes a separately prebuilt "cities.index.json". At 5,000 rows
 * that's unnecessary complexity — normalizing every city once costs well
 * under a millisecond.
 *
 * The search names (`asciiName`, `altNames` — a third of the dataset) are
 * not part of the boot data (task 6.1): `loadSearchNames()` fetches them
 * the first time search is used. Until they arrive, the same tiers run on
 * the display name, so a query typed in the first instant still finds
 * "Tokyo"; "Köln" → "Koeln" and alternate names start matching once they're
 * in.
 */

const typed = allCities

/** Every valid dataset row, population-sorted — the one typed view of the
 * dataset the rest of the domain should read. */
export function getAllCities(): readonly City[] {
  return typed
}

/** docs/10-implementation-plan.md task 5.7 "dataset load failure". */
export class DatasetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DatasetError"
  }
}

/** Throws a DatasetError when the bundled city data is unusable — called at
 * render time, where the route's error boundary turns it into a real
 * message and a retry. A few malformed rows only shrink the dataset. */
export function assertDatasetLoaded(): void {
  if (typed.length === 0) {
    throw new DatasetError(`City dataset unusable: 0 of ${declaredRowCount} rows are valid`)
  }
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

interface IndexedCity {
  city: City
  /** asciiName once the search names are in; the display name until then. */
  normPrimary: string
  normAlts: string[]
  normCountry: string
}

const index: IndexedCity[] = typed.map((city) => ({
  city,
  normPrimary: normalize(city.name),
  normAlts: [],
  normCountry: normalize(city.country),
}))

const cityById = new Map(typed.map((c) => [c.id, c]))

const fuzzyMatcher = new uFuzzy({ intraMode: 1 })
let fuzzyHaystack = index.map((e) => e.normPrimary)

let searchNames: Promise<void> | null = null
let searchNamesReady = false

interface SearchFile {
  asciiName: string[]
  altNames: string[][]
}

/** Folds the search names into the index. Rows are matched by position in
 * the packed file, so a file that doesn't line up is ignored (search keeps
 * working on display names) rather than mismatching names to cities. */
export function applySearchNames(file: unknown): boolean {
  const f = file as Partial<SearchFile> | null
  if (!f || !Array.isArray(f.asciiName) || !Array.isArray(f.altNames)) return false
  if (f.asciiName.length !== declaredRowCount || typed.length !== declaredRowCount) return false
  index.forEach((entry, i) => {
    const ascii = f.asciiName![i]
    const alts = f.altNames![i]
    if (typeof ascii === "string") entry.normPrimary = normalize(ascii)
    if (Array.isArray(alts))
      entry.normAlts = alts.filter((a) => typeof a === "string").map(normalize)
  })
  fuzzyHaystack = index.map((e) => e.normPrimary)
  searchNamesReady = true
  return true
}

/** Loads the search names once (a separate chunk on web). Safe to call on
 * every search-sheet open. */
export function loadSearchNames(): Promise<void> {
  if (!searchNames) {
    searchNames = import("../../assets/data/cities.search.json").then(
      (m) => {
        applySearchNames((m as { default?: unknown }).default ?? m)
      },
      () => {
        // Offline before the chunk was cached: stay on display names, and
        // let the next open try again.
        searchNames = null
      },
    )
  }
  return searchNames
}

export function hasSearchNames(): boolean {
  return searchNamesReady
}

const WEIGHT = { asciiPrefix: 100, altPrefix: 70, fuzzy: 40, country: 20 } as const

export function searchCities(query: string, limit = 20): City[] {
  const q = normalize(query.trim())
  if (!q) return []

  const weightById = new Map<string, number>()
  const setMax = (id: string, weight: number) => {
    if ((weightById.get(id) ?? 0) < weight) weightById.set(id, weight)
  }

  for (const entry of index) {
    if (entry.normPrimary.startsWith(q)) {
      setMax(entry.city.id, WEIGHT.asciiPrefix)
    } else if (entry.normAlts.some((a) => a.startsWith(q))) {
      setMax(entry.city.id, WEIGHT.altPrefix)
    } else if (entry.normCountry.startsWith(q)) {
      setMax(entry.city.id, WEIGHT.country)
    }
  }

  const [fuzzyIdxs] = fuzzyMatcher.search(fuzzyHaystack, q)
  if (fuzzyIdxs) {
    for (const i of fuzzyIdxs) setMax(index[i].city.id, WEIGHT.fuzzy)
  }

  return [...weightById.entries()]
    .map(([id, weight]) => {
      const city = cityById.get(id)!
      return { city, rank: weight * Math.log10(Math.max(city.population, 10)) }
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((r) => r.city)
}

/** Highest-population city on the given zone — the dataset is already population-sorted. */
export function getCityByZone(zone: string): City | undefined {
  return typed.find((c) => c.zone === zone)
}

export function getCityById(id: string): City | undefined {
  return cityById.get(id)
}

/** Top `limit` cities by population — the dataset is already sorted that
 * way, so this is a plain slice. docs/04-screen-specs.md S4's empty-query
 * "Popular cities" state. */
export function getPopularCities(limit = 12): City[] {
  return typed.slice(0, limit)
}

/**
 * The best-known city currently at a given UTC offset. Takes `now` (not in the
 * doc's original signature — offset-to-zone matching is DST-dependent, so it
 * can't be pure without it; same fix as getOverlap in diff.ts, same reason).
 */
export function getRepresentativeCity(offsetMinutes: number, now: number): City | undefined {
  return typed.find((c) => getOffsetMinutes(now, c.zone) === offsetMinutes)
}

/**
 * Like `getRepresentativeCity`, but never returns `undefined` — it finds the
 * *nearest* city instead of requiring an exact offset match. Task 4.6's
 * `<FloatingCityCard>` needs a live answer while the meridian is still
 * mid-drag, passing through offsets no real zone sits at exactly; the
 * meridian only lands on an exact match once task 4.5's snap has settled
 * (`domain/map/snap.ts`'s own target list is exactly the set of offsets this
 * function can return an exact — distance-0 — match for).
 *
 * `getOffsetMinutes` is memoized per zone rather than called once per city:
 * the dataset has 5,000 rows over only ~386 distinct IANA zones, and
 * this runs on the JS thread inside a 60ms-throttled callback during an
 * active drag, so avoiding ~4,600 redundant `Intl` computations per call
 * matters.
 */
export function getNearestRepresentativeCity(offsetMinutes: number, now: number): City {
  const offsetByZone = new Map<string, number>()
  const offsetFor = (zone: string): number => {
    let offset = offsetByZone.get(zone)
    if (offset === undefined) {
      offset = getOffsetMinutes(now, zone)
      offsetByZone.set(zone, offset)
    }
    return offset
  }

  let nearest = typed[0]
  let smallestDistance = Math.abs(offsetFor(nearest.zone) - offsetMinutes)
  for (let i = 1; i < typed.length; i++) {
    const candidate = typed[i]
    const distance = Math.abs(offsetFor(candidate.zone) - offsetMinutes)
    if (distance < smallestDistance) {
      nearest = candidate
      smallestDistance = distance
    }
  }
  return nearest
}
