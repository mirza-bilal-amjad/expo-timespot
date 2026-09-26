import { getOffsetMinutes } from "./zone"

export type DstStatus = "none" | "standard" | "daylight"

export interface YearOffsets {
  /** The year's standard (lower) offset, in minutes. */
  standard: number
  /** The daylight (higher) offset, or null when the zone keeps one offset all year. */
  daylight: number | null
}

/**
 * `zone`'s two offsets in `now`'s year, from 1 January and 1 July, UTC: one
 * of them is summer in either hemisphere. Pure arithmetic from
 * `getOffsetMinutes`, so the degraded engine answers too.
 */
export function getYearOffsets(now: number, zone: string): YearOffsets {
  const year = new Date(now).getUTCFullYear()
  const january = getOffsetMinutes(Date.UTC(year, 0, 1), zone)
  const july = getOffsetMinutes(Date.UTC(year, 6, 1), zone)
  if (january === july) return { standard: january, daylight: null }
  return { standard: Math.min(january, july), daylight: Math.max(january, july) }
}

/**
 * docs/04-screen-specs.md S6 "DST status". Whether `zone` observes DST in
 * `now`'s year and, if so, which side of it `now` is on.
 */
export function getDstStatus(now: number, zone: string): DstStatus {
  const { daylight } = getYearOffsets(now, zone)
  if (daylight === null) return "none"
  return getOffsetMinutes(now, zone) === daylight ? "daylight" : "standard"
}
