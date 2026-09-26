import uFuzzy from "@leeoniya/ufuzzy"

import cities from "../../assets/data/cities.min.json"
import { getOffsetMinutes } from "../time/zone"
import type { City } from "../types"

/**
 * docs/06-data-model.md §3 "Search index". Ranking, in priority order:
 *   1. exact prefix on asciiName  -> weight 100
 *   2. prefix on any altName      -> weight 70
 *   3. fuzzy (uFuzzy)             -> weight 40
 *   4. country name match         -> weight 20
 * final rank = weight * log10(population)
 *
 * The doc describes a separately prebuilt "cities.index.json". At 5,000 rows
 * that's unnecessary complexity — normalizing every city once at module load
 * (below) costs well under a millisecond and needs no extra build artifact or
 * file to keep in sync with cities.min.json.
 */

/** A row the rest of the app can rely on — checked once at load, so one
 * malformed row can't throw while the index below is built (a module-load
 * throw happens before any error boundary exists to catch it). */
function isCity(row: unknown): row is City {
  if (typeof row !== "object" || row === null) return false
  const c = row as Record<string, unknown>
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.asciiName === "string" &&
    typeof c.country === "string" &&
    typeof c.zone === "string" &&
    typeof c.lat === "number" &&
    typeof c.lon === "number" &&
    Array.isArray(c.altNames)
  )
}

const rows: unknown[] = Array.isArray(cities) ? (cities as unknown[]) : []
const typed: City[] = rows.filter(isCity)

/** Every valid dataset row, population-sorted — the one typed view of
 * cities.min.json the rest of the domain should read. */
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
    throw new DatasetError(`City dataset unusable: 0 of ${rows.length} rows are valid`)
  }
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

interface IndexedCity {
  city: City
  normAscii: string
  normAlts: string[]
  normCountry: string
}

const index: IndexedCity[] = typed.map((city) => ({
  city,
  normAscii: normalize(city.asciiName),
  normAlts: city.altNames.map(normalize),
  normCountry: normalize(city.country),
}))

const cityById = new Map(typed.map((c) => [c.id, c]))

const fuzzyMatcher = new uFuzzy({ intraMode: 1 })
const fuzzyHaystack = index.map((e) => e.normAscii)

const WEIGHT = { asciiPrefix: 100, altPrefix: 70, fuzzy: 40, country: 20 } as const

export function searchCities(query: string, limit = 20): City[] {
  const q = normalize(query.trim())
  if (!q) return []

  const weightById = new Map<string, number>()
  const setMax = (id: string, weight: number) => {
    if ((weightById.get(id) ?? 0) < weight) weightById.set(id, weight)
  }

  for (const entry of index) {
    if (entry.normAscii.startsWith(q)) {
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

/** Highest-population city on the given zone — cities.min.json is already population-sorted. */
export function getCityByZone(zone: string): City | undefined {
  return typed.find((c) => c.zone === zone)
}

export function getCityById(id: string): City | undefined {
  return cityById.get(id)
}

/** Top `limit` cities by population — cities.min.json is already sorted that
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
 * cities.min.json has 5,000 rows over only ~386 distinct IANA zones, and
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
