import { MAX_OFFSET_MINUTES, MIN_OFFSET_MINUTES } from "./meridian"

/**
 * docs/04-screen-specs.md "S3 · Map" "Ruler", task 4.4. Unlike
 * `meridian.ts`'s x<->offset mapping (which is geographic and tops out at
 * ±12h), the ruler is its own uniform, non-geographic scale — 1h per tick,
 * evenly spaced, spanning the *real* UTC-12..+14 range including
 * Kiritimati's +14. This is what lets the ruler reach +14 when the map
 * geometrically cannot: "the ruler and the meridian are two views of one
 * shared value" means the shared value is the offset itself, and each view
 * (map x, ruler x) derives its own pixel position from it independently.
 */

const TICK_HOURS = 1

/** Every ruler tick's offset in minutes, UTC-12 through UTC+14 inclusive —
 * 27 whole-hour ticks. */
export function getRulerTicks(): number[] {
  const ticks: number[] = []
  for (let m = MIN_OFFSET_MINUTES; m <= MAX_OFFSET_MINUTES; m += TICK_HOURS * 60) {
    ticks.push(m)
  }
  return ticks
}

function clamp(value: number, min: number, max: number): number {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

/** UTC offset (minutes) -> x position along the ruler's own content, at
 * `tickWidth` pixels per hour. A worklet — read on the UI thread inside the
 * scroll handler and the sync reaction, no JS round-trip. */
export function offsetToRulerX(offsetMinutes: number, tickWidth: number): number {
  "worklet"
  const clamped = clamp(offsetMinutes, MIN_OFFSET_MINUTES, MAX_OFFSET_MINUTES)
  return ((clamped - MIN_OFFSET_MINUTES) / 60) * tickWidth
}

/** Inverse of `offsetToRulerX`. */
export function rulerXToOffset(x: number, tickWidth: number): number {
  "worklet"
  const hours = x / tickWidth
  return clamp(MIN_OFFSET_MINUTES + hours * 60, MIN_OFFSET_MINUTES, MAX_OFFSET_MINUTES)
}
