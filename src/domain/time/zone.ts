import type { Prefs, ZonedTime } from "../types"

/**
 * docs/06-data-model.md §4, §1 "The one rule". Every function here is pure: `now`
 * is always a parameter, never `Date.now()`, so the whole module is deterministic
 * and testable without mocking the clock.
 */

const MINUS = "−" // U+2212, never a hyphen, in every offset label.

const offsetFormatters = new Map<string, Intl.DateTimeFormat>()

function getOffsetFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
    offsetFormatters.set(zone, formatter)
  }
  return formatter
}

/** UTC offset in minutes, positive east of UTC — e.g. 345 for Asia/Kathmandu. */
export function getOffsetMinutes(now: number, zone: string): number {
  const parts = getOffsetFormatter(zone).formatToParts(now)
  const gmt = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT"
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(gmt)
  if (!match) return 0 // bare 'GMT' means UTC+0
  const sign = match[1] === "-" ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
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
  try {
    // eslint-disable-next-line no-new -- constructing is the validity check
    new Intl.DateTimeFormat("en-US", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

interface DateParts {
  year: number
  month: number // 1-12
  day: number
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function getDateFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    dateFormatters.set(zone, formatter)
  }
  return formatter
}

function getDateParts(now: number, zone: string): DateParts {
  const parts = getDateFormatter(zone).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { year: get("year"), month: get("month"), day: get("day") }
}

/** Whole calendar days between the target zone's date and the device's own, at `now`. */
function getDayOffset(now: number, zone: string): -1 | 0 | 1 {
  const target = getDateParts(now, zone)
  const device = {
    year: new Date(now).getFullYear(),
    month: new Date(now).getMonth() + 1,
    day: new Date(now).getDate(),
  }
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day)
  const deviceUtc = Date.UTC(device.year, device.month - 1, device.day)
  const days = Math.round((targetUtc - deviceUtc) / 86_400_000)
  return days < 0 ? -1 : days > 0 ? 1 : 0
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>()

function getTimeFormatter(zone: string, timeFormat: Prefs["timeFormat"]): Intl.DateTimeFormat {
  const key = `${zone}|${timeFormat}`
  let formatter = timeFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: timeFormat === "24h" ? "h23" : "h12",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    timeFormatters.set(key, formatter)
  }
  return formatter
}

const dateLabelFormatters = new Map<string, Intl.DateTimeFormat>()

function getDateLabelFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = dateLabelFormatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    dateLabelFormatters.set(zone, formatter)
  }
  return formatter
}

const DAY_START_HOUR = 6
const DAY_END_HOUR = 18

export function getZonedTime(now: number, zone: string, prefs: Prefs): ZonedTime {
  const offsetMinutes = getOffsetMinutes(now, zone)
  const parts = getTimeFormatter(zone, prefs.timeFormat).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""

  const hours = get("hour").padStart(2, "0")
  const minutes = get("minute").padStart(2, "0")
  const seconds = get("second").padStart(2, "0")
  const dayPeriod = get("dayPeriod").toUpperCase()
  const meridiem = prefs.timeFormat === "12h" ? (dayPeriod === "PM" ? "PM" : "AM") : undefined

  const hour24Parts = getTimeFormatter(zone, "24h").formatToParts(now)
  const hour24 = Number(hour24Parts.find((p) => p.type === "hour")?.value ?? 0)
  const isDay = hour24 >= DAY_START_HOUR && hour24 < DAY_END_HOUR

  const { year, month, day } = getDateParts(now, zone)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  return {
    iso: new Date(now).toISOString(),
    hours,
    minutes,
    seconds,
    meridiem,
    display: `${hours}:${minutes}`,
    offsetMinutes,
    offsetLabel: formatOffset(offsetMinutes),
    dateLabel: getDateLabelFormatter(zone).format(now),
    weekday,
    isDay,
    dayOffset: getDayOffset(now, zone),
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
