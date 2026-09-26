import tzOffsets from "../../assets/data/tz.offsets.json"
import type { Prefs, ZonedTime } from "../types"
import type { TimeCapability } from "./capability"

/**
 * docs/06-data-model.md §4, §1 "The one rule". Every function here is pure: `now`
 * is always a parameter, never `Date.now()`, so the whole module is deterministic
 * and testable without mocking the clock.
 *
 * docs/adr/0004 — two engines, one answer. The only thing that differs is
 * where a zone's UTC offset comes from: `Intl` (the OS tz database — the
 * primary, and the only one that picks up rule changes without a release)
 * or, when the boot probe finds `Intl` ignoring `timeZone`, the bundled
 * table from `scripts/build-tzdata.ts`. Every displayed value — hours,
 * minutes, seconds, AM/PM, the date label, day/night, the day offset — is
 * plain arithmetic from that offset, so the engines agree by construction.
 * ~~Each value read off its own zone-aware `Intl` formatter~~ — corrected
 * 2026-09-26: that made every display value depend on the one capability
 * the degraded path lacks, and cost four `formatToParts` per row per tick.
 */

const MINUS = "−" // U+2212, never a hyphen, in every offset label.
const MINUTE_MS = 60_000

export type TimeEngine = "intl" | "table"

let engine: TimeEngine = "intl"

/** Chosen once at boot from the capability probe. */
export function configureTimeEngine(capability: TimeCapability): void {
  engine = capability === "full" ? "intl" : "table"
}

export function getTimeEngine(): TimeEngine {
  return engine
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>()

function getOffsetFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
    offsetFormatters.set(zone, formatter)
  }
  return formatter
}

/** The primary engine: the offset as the OS tz database has it. */
export function intlOffsetMinutes(now: number, zone: string): number {
  const parts = getOffsetFormatter(zone).formatToParts(now)
  const gmt = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT"
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(gmt)
  if (!match) return 0 // bare 'GMT' means UTC+0
  const sign = match[1] === "-" ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

interface OffsetTable {
  from: number
  to: number
  zones: Record<string, number[]>
}

const table = tzOffsets as OffsetTable

/** True when the bundled table covers `now` exactly (outside it, the nearest
 * known offset is used — still right for any zone without DST). */
export function isInTableWindow(now: number): boolean {
  const minute = now / MINUTE_MS
  return minute >= table.from && minute < table.to
}

/**
 * The degraded engine: the offset from the bundled table —
 * `[offset0, t1, offset1, t2, offset2, …]`, `tN` in epoch minutes. A zone
 * missing from the table (an alias newer than the build) falls back to
 * `Intl`, the only other source there is.
 */
export function tableOffsetMinutes(now: number, zone: string): number {
  const entry = table.zones[zone]
  if (!entry) return intlOffsetMinutes(now, zone)
  const minute = now / MINUTE_MS
  let offset = entry[0]
  for (let i = 1; i < entry.length && entry[i] <= minute; i += 2) offset = entry[i + 1]
  return offset
}

/** UTC offset in minutes, positive east of UTC — e.g. 345 for Asia/Kathmandu. */
export function getOffsetMinutes(now: number, zone: string): number {
  return engine === "table" ? tableOffsetMinutes(now, zone) : intlOffsetMinutes(now, zone)
}

/** '+9', '+5:45', '+0', '−3:30' — never a hyphen for the minus sign. Shared by
 * formatOffset (prefixed 'UTC') and diff.ts's getDifference label (unprefixed). */
export function formatSignedDuration(minutes: number): string {
  const sign = minutes < 0 ? MINUS : "+"
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  const suffix = mins === 0 ? `${hours}` : `${hours}:${String(mins).padStart(2, "0")}`
  return `${sign}${suffix}`
}

/** 'UTC+9', 'UTC+5:45', 'UTC+0', 'UTC−3:30' — never a hyphen for the minus sign. */
export function formatOffset(offsetMinutes: number): string {
  return `UTC${formatSignedDuration(offsetMinutes)}`
}

export function getDeviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export function isValidZone(zone: string): boolean {
  if (zone in table.zones) return true
  try {
    // eslint-disable-next-line no-new -- constructing is the validity check
    new Intl.DateTimeFormat("en-US", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const DAY_START_HOUR = 6
const DAY_END_HOUR = 18

const pad2 = (n: number) => String(n).padStart(2, "0")

/** Whole calendar days between the zone's wall date and the device's own, at `now`. */
function getDayOffset(now: number, wall: Date): -1 | 0 | 1 {
  const device = new Date(now)
  const targetUtc = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate())
  const deviceUtc = Date.UTC(device.getFullYear(), device.getMonth(), device.getDate())
  const days = Math.round((targetUtc - deviceUtc) / 86_400_000)
  return days < 0 ? -1 : days > 0 ? 1 : 0
}

export function getZonedTime(now: number, zone: string, prefs: Prefs): ZonedTime {
  const offsetMinutes = getOffsetMinutes(now, zone)
  // The zone's wall clock, read through the UTC getters — no zone-aware
  // formatting anywhere below this line.
  const wall = new Date(now + offsetMinutes * MINUTE_MS)
  const hour24 = wall.getUTCHours()
  const twelveHour = prefs.timeFormat === "12h"
  const hours = pad2(twelveHour ? hour24 % 12 || 12 : hour24)
  const minutes = pad2(wall.getUTCMinutes())
  const seconds = pad2(wall.getUTCSeconds())
  const weekday = wall.getUTCDay()

  return {
    iso: new Date(now).toISOString(),
    hours,
    minutes,
    seconds,
    meridiem: twelveHour ? (hour24 >= 12 ? "PM" : "AM") : undefined,
    display: `${hours}:${minutes}`,
    offsetMinutes,
    offsetLabel: formatOffset(offsetMinutes),
    dateLabel: `${WEEKDAYS[weekday]}, ${MONTHS[wall.getUTCMonth()]} ${wall.getUTCDate()}`,
    weekday,
    isDay: hour24 >= DAY_START_HOUR && hour24 < DAY_END_HOUR,
    dayOffset: getDayOffset(now, wall),
  }
}

/**
 * Scans forward day-by-day from `from` for the next instant the UTC offset
 * changes, then binary-searches down to the exact millisecond (to within 1s).
 * Returns null if no transition is found within two years (most zones have
 * none — `Asia/Shanghai` for one).
 */
export function getNextTransition(
  zone: string,
  from: number,
): { at: number; deltaMinutes: number } | null {
  const startOffset = getOffsetMinutes(from, zone)
  const DAY_MS = 86_400_000
  const MAX_DAYS = 366 * 2

  let prev = from
  for (let i = 1; i <= MAX_DAYS; i++) {
    const t = from + i * DAY_MS
    const offset = getOffsetMinutes(t, zone)
    if (offset !== startOffset) {
      let lo = prev
      let hi = t
      while (hi - lo > 1000) {
        const mid = Math.floor((lo + hi) / 2)
        if (getOffsetMinutes(mid, zone) === startOffset) lo = mid
        else hi = mid
      }
      return { at: hi, deltaMinutes: offset - startOffset }
    }
    prev = t
  }
  return null
}

/**
 * docs/04-screen-specs.md S4's "no results" fallback: "Search by UTC offset
 * instead". "+5", "-8:30", "utc+5", "UTC−3:30" -> offset minutes, or null.
 * Minus can be a hyphen (typed) or U+2212 (pasted from a label elsewhere).
 */
export function parseOffsetQuery(query: string): number | null {
  const match = /^(?:utc)?\s*([+−-])\s*(\d{1,2})(?::(\d{2}))?$/i.exec(query.trim())
  if (!match) return null
  const sign = match[1] === "+" ? 1 : -1
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? 0)
  if (hours > 14 || minutes >= 60) return null
  return sign * (hours * 60 + minutes)
}
