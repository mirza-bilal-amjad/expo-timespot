import { getPosition, getTimes } from "suncalc"

import { getOffsetMinutes } from "../time/zone"
import type { SunTimes } from "../types"

const DAY_MS = 86_400_000

/**
 * suncalc.getTimes buckets by the UTC calendar day containing `date` — not the
 * target zone's calendar day. Anchoring on that zone's local noon (converted to
 * the matching UTC instant) makes sure "today" means the city's today, not UTC's.
 */
function localNoonUtc(atMs: number, zone: string): Date {
  const offsetMs = getOffsetMinutes(atMs, zone) * 60_000
  const localMidnightUtc = Math.floor((atMs + offsetMs) / DAY_MS) * DAY_MS - offsetMs
  return new Date(localMidnightUtc + 12 * 60 * 60 * 1000)
}

/** docs/06-data-model.md §4. `date` only needs to fall on the calendar day of interest. */
export function getSunTimes(lat: number, lon: number, date: Date, zone: string): SunTimes {
  const times = getTimes(localNoonUtc(date.getTime(), zone), lat, lon)

  if (times.alwaysUp) {
    return { sunrise: null, sunset: null, dayLengthMinutes: 24 * 60, kind: "midnight-sun" }
  }
  if (times.alwaysDown || !times.sunrise || !times.sunset) {
    // suncalc only leaves sunrise/sunset null when alwaysDown or alwaysUp is
    // set; the null check is a defensive fallback, not an expected path.
    return { sunrise: null, sunset: null, dayLengthMinutes: 0, kind: "polar-night" }
  }

  const dayLengthMinutes = Math.round((times.sunset.getTime() - times.sunrise.getTime()) / 60_000)
  return { sunrise: times.sunrise, sunset: times.sunset, dayLengthMinutes, kind: "normal" }
}

/** True astronomical day/night at an instant — distinct from ZonedTime.isDay's cheap clock-hour heuristic. */
export function isDaylight(lat: number, lon: number, now: number): boolean {
  return getPosition(new Date(now), lat, lon).altitude > 0
}

/** '10h 05m' — docs/04-screen-specs.md S2's sun block. Always both units,
 * minutes zero-padded, matching the doc's own "10h 06m" example. */
export function formatDayLength(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${String(mins).padStart(2, "0")}m`
}

const MAX_SCAN_DAYS = 200

/** docs/04-screen-specs.md S2: polar night renders "the date the sun next
 * rises". Scans forward day by day — polar night doesn't last more than a
 * few months anywhere on Earth, so `MAX_SCAN_DAYS` is a generous ceiling,
 * not a real limit. Returns null only if something is astronomically wrong. */
export function getNextSunrise(
  lat: number,
  lon: number,
  fromMs: number,
  zone: string,
): Date | null {
  for (let i = 1; i <= MAX_SCAN_DAYS; i++) {
    const candidate = new Date(fromMs + i * DAY_MS)
    const times = getSunTimes(lat, lon, candidate, zone)
    if (times.kind === "normal" && times.sunrise) return times.sunrise
  }
  return null
}
