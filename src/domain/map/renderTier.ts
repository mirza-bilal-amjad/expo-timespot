/**
 * docs/04-screen-specs.md "S3 · Map": "Low-end devices (`expo-device` tier
 * check or `> 16 ms` first paint): swap to a pre-rendered raster at 2×."
 * docs/07-responsive-strategy.md's platform-exception table: "Map raster
 * fallback | device-tier check | never (browsers cope)" — the decision
 * itself is pure and platform-agnostic; it's the *caller* (`useMapRenderTier`)
 * that never even asks on web.
 *
 * Two independent signals, either one enough to fall back: a device old
 * enough to be flagged up front (no map render needed to find out), or —
 * for whatever a year-class check misses — a first paint that was actually
 * slow. `docs/10-implementation-plan.md` task 4.9's acceptance is "forced
 * low-tier renders the raster," which this makes directly testable: force
 * either input and assert `"raster"` comes back, no device or timer needed.
 */
export type MapRenderTier = "vector" | "raster"

export interface MapRenderTierInput {
  /** `expo-device`'s `Device.deviceYearClass` — roughly, hardware
   * contemporary with a phone released that year. `null` when the platform
   * can't report one (iOS doesn't; web never asks at all). */
  deviceYearClass: number | null
  /** Milliseconds from the vector map's first mount to its next paint, or
   * `null` before that's been measured. */
  firstPaintMs: number | null
}

// "Contemporary with a phone released that year" younger than this is
// treated as capable enough for the vector map; CLAUDE.md's own Pixel 6a
// (2022) 60fps budget is the target hardware, so the cutoff is generous
// rather than tuned to that exact device.
const LOW_END_YEAR_CLASS_THRESHOLD = 2017

const SLOW_FIRST_PAINT_MS = 16

export function decideMapRenderTier(input: MapRenderTierInput): MapRenderTier {
  if (input.deviceYearClass !== null && input.deviceYearClass < LOW_END_YEAR_CLASS_THRESHOLD) {
    return "raster"
  }
  if (input.firstPaintMs !== null && input.firstPaintMs > SLOW_FIRST_PAINT_MS) {
    return "raster"
  }
  return "vector"
}
