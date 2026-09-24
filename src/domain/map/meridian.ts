/**
 * docs/04-screen-specs.md "S3 · Map" "Meridian" / "Ruler" sections, task 4.3.
 * The meridian's on-screen x position and its "derived zone label" are two
 * views of the same underlying quantity — a UTC offset in minutes — related
 * by simple longitude linearity (15° of longitude per hour), the same
 * assumption `projection.ts`'s equirectangular projection already makes.
 *
 * This is deliberately a geographic approximation, not a real timezone
 * lookup: real UTC offsets follow political boundaries, not longitude (see
 * CLAUDE.md's "45-minute zones are real" / "UTC+14 exists" warnings). Which
 * *city* the meridian is nearest, at whatever offset it resolves to, is a
 * dataset lookup for a later task (4.6's floating card), not this one —
 * this module only converts between a pixel position and the offset that
 * position geographically implies.
 */

const MINUTES_PER_DEGREE_LONGITUDE = 4 // 60 minutes / 15 degrees-per-hour

// The ruler spans UTC-12 (Baker Island) to UTC+14 (Kiritimati) — the real
// range, not the ±12 a naive longitude-only reading would suggest.
export const MIN_OFFSET_MINUTES = -12 * 60
export const MAX_OFFSET_MINUTES = 14 * 60

function clamp(value: number, min: number, max: number): number {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

/** Pixel x (0..width, left-to-right across the equirectangular map) -> the
 * UTC offset in minutes that longitude geographically implies, clamped to
 * the real-world range. Runs on the UI thread inside the drag gesture, so
 * it's a worklet. */
export function xToOffsetMinutes(x: number, width: number): number {
  "worklet"
  const lon = (x / width) * 360 - 180
  return clamp(lon * MINUTES_PER_DEGREE_LONGITUDE, MIN_OFFSET_MINUTES, MAX_OFFSET_MINUTES)
}

/** Inverse of `xToOffsetMinutes` — used to place the meridian at a given
 * starting offset (e.g. the focused city's current UTC offset). Offsets
 * between +12h and +14h (only Kiritimati lives there) have no real
 * longitude to place a pixel at, so the result is clamped to the map's own
 * edge rather than overshooting off-canvas. */
export function offsetMinutesToX(offsetMinutes: number, width: number): number {
  "worklet"
  const clampedOffset = clamp(offsetMinutes, MIN_OFFSET_MINUTES, MAX_OFFSET_MINUTES)
  const lon = clampedOffset / MINUTES_PER_DEGREE_LONGITUDE
  const x = ((lon + 180) / 360) * width
  return clamp(x, 0, width)
}

/** `xToOffsetMinutes`'s own linear scale (1440 offset-minutes per full map
 * width), applied to a *velocity* rather than a position — used by task
 * 4.5's release-time snap to project a fast flick's landing point
 * (docs/08-motion-spec.md: "a fast flick can travel several zones"), the
 * same way `Gesture.Pan()`'s own `e.velocityX` is px/s. Not clamped: it
 * feeds `snapToNearestOffset`'s own nearest-neighbour search, which is
 * self-limiting regardless of how far the projection overshoots. */
export function pixelVelocityToOffsetVelocity(pixelsPerSecond: number, width: number): number {
  "worklet"
  return (pixelsPerSecond / width) * 360 * MINUTES_PER_DEGREE_LONGITUDE
}
