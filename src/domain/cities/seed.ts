import { getCityByZone } from "./search"
import type { City } from "../types"

/**
 * docs/06-data-model.md §2 "First launch". Pure: takes the already-resolved
 * device zone (see `getDeviceZone`) and returns what to seed — never touches
 * a store itself.
 */

const DEFAULT_ZONES = ["America/New_York", "Europe/London", "Asia/Tokyo"]

export interface SeedResult {
  /** null only if the dataset has no representative city for the device zone
   * or any default zone — should not happen given the dataset's coverage
   * guarantee, but this stays defensive rather than throwing. */
  focusCityId: string | null
  cities: City[]
}

/** Device city first (if the dataset has one for this zone), then New York,
 * London, Tokyo — skipping any that duplicate the device zone — so the list
 * is never empty on first launch. */
export function getSeedCities(deviceZone: string): SeedResult {
  const deviceCity = getCityByZone(deviceZone)
  const defaults = DEFAULT_ZONES.filter((zone) => zone !== deviceZone)
    .map(getCityByZone)
    .filter((city): city is City => city !== undefined)

  const cities = deviceCity ? [deviceCity, ...defaults] : defaults
  const focusCityId = (deviceCity ?? defaults[0])?.id ?? null

  return { focusCityId, cities }
}
