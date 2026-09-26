import { getOffsetMinutes } from "../time/zone"
import type { City } from "../types"
import { getAllCities, getCityByZone } from "./search"

/**
 * docs/04-screen-specs.md S6, docs/adr/0006 — the public city pages.
 * Pure: which cities get a page, which neighbours each links to, and the
 * zones in its difference table.
 */

/** The top N cities by population get a static page — ADR-0006 caps it. */
export const SEO_CITY_COUNT = 1000

export function getSeoCities(limit = SEO_CITY_COUNT): readonly City[] {
  return getAllCities().slice(0, limit)
}

export function getSeoCityBySlug(slug: string): City | undefined {
  return getSeoCities().find((c) => c.slug === slug)
}

/**
 * The 8 cities a page links to, nearest by UTC offset at `now` — "what gets
 * the long tail crawled" (docs/07 §4). One city per zone, so a page about
 * Tokyo doesn't link to Yokohama, Osaka and six more Japanese cities; ties
 * go to the larger city. Only cities that have pages themselves.
 */
export function getNeighbours(city: City, now: number, count = 8): City[] {
  const own = getOffsetMinutes(now, city.zone)
  const seenZones = new Set([city.zone])
  const offsets = new Map<string, number>()
  const offsetOf = (zone: string) => {
    let o = offsets.get(zone)
    if (o === undefined) offsets.set(zone, (o = getOffsetMinutes(now, zone)))
    return o
  }
  const candidates: { city: City; distance: number; rank: number }[] = []
  getSeoCities().forEach((c, rank) => {
    if (seenZones.has(c.zone)) return
    seenZones.add(c.zone) // population-sorted: the first city seen is the zone's largest
    candidates.push({ city: c, distance: Math.abs(offsetOf(c.zone) - own), rank })
  })
  return candidates
    .sort((a, b) => a.distance - b.distance || a.rank - b.rank)
    .slice(0, count)
    .map((c) => c.city)
}

/** S6's difference table: six zones spread around the globe. */
export const REFERENCE_ZONES = [
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const

/** The table's cities, minus the page's own zone. */
export function getReferenceCities(city: City): City[] {
  return REFERENCE_ZONES.filter((z) => z !== city.zone)
    .map((z) => getCityByZone(z))
    .filter((c): c is City => !!c)
}
