import type { City, ZonedTime } from "../types"

/**
 * docs/09-accessibility.md §1 "The clock — the thing most apps get wrong":
 * "Natural language, not the display string. '8:40 AM', not '08:40'." and
 * "'9 hours ahead of UTC', not 'UTC+9' — screen readers pronounce the
 * latter as 'utc plus nine' at best." Pure string formatting, no React —
 * shared by `CityRow`'s list-row label and the map's slider `accessibilityValue`
 * (task 4.8), which needs a related but not identical phrasing (see
 * `spokenOffsetValue` below).
 */

/** `time.hours` is always 2-digit ("01") for `<Numeral>`'s fixed-width cells
 * — strip the leading zero for speech, e.g. "1:40 AM" not "01:40 AM". */
export function spokenClock(time: ZonedTime): string {
  const hour = String(parseInt(time.hours, 10))
  return time.meridiem ? `${hour}:${time.minutes} ${time.meridiem}` : `${hour}:${time.minutes}`
}

/** "9 hours ahead of UTC", "3 hours 30 minutes behind UTC", "UTC" — a
 * descriptive sentence fragment, for `CityRow`'s row label. */
export function spokenOffsetPhrase(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC"
  const direction = offsetMinutes > 0 ? "ahead of" : "behind"
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  const parts = [
    hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
    minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : null,
  ].filter(Boolean)
  return `${parts.join(" ")} ${direction} UTC`
}

/** "UTC plus 1", "UTC minus 4", "UTC plus 5:45", "UTC" — a value-style
 * phrasing, docs/09-accessibility.md §2 "The map"'s own worked example for
 * the meridian slider's `accessibilityValue.text` ("UTC plus 1, Algiers,
 * 5:40 PM"). Deliberately not `spokenOffsetPhrase`: a slider value reads
 * like a number ("UTC plus 1"), a list row reads like a sentence ("9 hours
 * ahead of UTC") — same underlying number, different grammatical role. */
export function spokenOffsetValue(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC"
  const direction = offsetMinutes > 0 ? "plus" : "minus"
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  const suffix = minutes === 0 ? `${hours}` : `${hours}:${String(minutes).padStart(2, "0")}`
  return `UTC ${direction} ${suffix}`
}

/** "Tokyo, 1:40 AM, night-time, 9 hours ahead of UTC" —
 * docs/09-accessibility.md §1's own worked example, for `CityRow`'s
 * `accessibilityLabel`. */
export function citySpeechLabel(name: string, time: ZonedTime): string {
  const dayPart = time.isDay ? "day-time" : "night-time"
  return `${name}, ${spokenClock(time)}, ${dayPart}, ${spokenOffsetPhrase(time.offsetMinutes)}`
}

/** "UTC plus 1, Algiers, 5:40 PM" — docs/09-accessibility.md §2 "The map"'s
 * own worked example, verbatim order, for the meridian slider's
 * `accessibilityValue.text`. */
export function meridianValueText(city: City, time: ZonedTime): string {
  return `${spokenOffsetValue(time.offsetMinutes)}, ${city.name}, ${spokenClock(time)}`
}
