import { formatSignedDuration, getOffsetMinutes } from "./zone"

/** docs/06-data-model.md §4. `a` relative to `b`: positive means `a` is ahead. */
export function getDifference(
  a: string,
  b: string,
  now: number,
): { minutes: number; label: string } {
  const minutes = getOffsetMinutes(now, a) - getOffsetMinutes(now, b)
  return { minutes, label: formatSignedDuration(minutes) }
}

const DAY_MIN = 1440

/** Splits a (possibly midnight-wrapping) interval into 1-2 non-wrapping segments on [0, 1440). */
function splitWrapping(startMin: number, endMin: number): [number, number][] {
  const length = endMin - startMin
  if (length <= 0) return []
  if (length >= DAY_MIN) return [[0, DAY_MIN]]
  const start = ((startMin % DAY_MIN) + DAY_MIN) % DAY_MIN
  const end = start + length
  return end <= DAY_MIN
    ? [[start, end]]
    : [
        [start, DAY_MIN],
        [0, end - DAY_MIN],
      ]
}

function intersectSegments(
  segmentsA: [number, number][],
  segmentsB: [number, number][],
): [number, number] | null {
  for (const [aStart, aEnd] of segmentsA) {
    for (const [bStart, bEnd] of segmentsB) {
      const start = Math.max(aStart, bStart)
      const end = Math.min(aEnd, bEnd)
      if (end > start) return [start, end]
    }
  }
  return null
}

/**
 * docs/06-data-model.md §4. The window, in zone `b`'s local minutes-from-midnight,
 * where both `a` and `b` are inside `workday` local hours. `now` is required (not
 * in the doc's original signature — an offset-dependent calculation can't be pure
 * without it; see docs/adr/0004 "the one rule").
 */
export function getOverlap(
  a: string,
  b: string,
  workday: [number, number],
  now: number,
): { start: number; end: number } | null {
  const [startHour, endHour] = workday
  const diffMinutes = getOffsetMinutes(now, a) - getOffsetMinutes(now, b)

  const windowB = splitWrapping(startHour * 60, endHour * 60)
  // b-local times where a's own local time falls inside its workday.
  const windowAOnB = splitWrapping(startHour * 60 - diffMinutes, endHour * 60 - diffMinutes)

  const overlap = intersectSegments(windowB, windowAOnB)
  if (!overlap) return null
  const [start, end] = overlap
  return { start, end }
}
