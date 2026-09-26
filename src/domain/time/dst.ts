import { getOffsetMinutes } from "./zone"

export type DstStatus = "none" | "standard" | "daylight"

/**
 * docs/04-screen-specs.md S6 "DST status". Whether `zone` observes DST in
 * `now`'s year and, if so, which side of it `now` is on — derived by
 * comparing the offset now with the year's two extremes (1 January and
 * 1 July, UTC: one of them is summer in either hemisphere). Pure
 * arithmetic from `getOffsetMinutes`, so the degraded engine answers too.
 */
export function getDstStatus(now: number, zone: string): DstStatus {
  const year = new Date(now).getUTCFullYear()
  const january = getOffsetMinutes(Date.UTC(year, 0, 1), zone)
  const july = getOffsetMinutes(Date.UTC(year, 6, 1), zone)
  if (january === july) return "none"
  return getOffsetMinutes(now, zone) === Math.max(january, july) ? "daylight" : "standard"
}
