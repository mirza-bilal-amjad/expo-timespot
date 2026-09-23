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

const typed = cities as City[]

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

/**
 * The best-known city currently at a given UTC offset. Takes `now` (not in the
 * doc's original signature — offset-to-zone matching is DST-dependent, so it
 * can't be pure without it; same fix as getOverlap in diff.ts, same reason).
 */
export function getRepresentativeCity(offsetMinutes: number, now: number): City | undefined {
  return typed.find((c) => getOffsetMinutes(now, c.zone) === offsetMinutes)
}
