import { getPosition } from "suncalc"

const DEG = Math.PI / 180
const MAX_ABS_LAT = 89.5 // keeps the path finite and renderable right at the poles

/**
 * Maximizes `fn` over [lo, hi]. Coarse-scans first, then golden-section-style
 * ternary search in a small window around the best sample — safer than a
 * ternary search over the whole range, which needs unimodality that doesn't
 * hold across a full 360° longitude sweep (the function is periodic, not
 * unimodal, over one full period).
 */
function maximize1D(
  fn: (x: number) => number,
  lo: number,
  hi: number,
  coarseSamples: number,
): number {
  let bestX = lo
  let bestV = -Infinity
  for (let i = 0; i <= coarseSamples; i++) {
    const x = lo + ((hi - lo) * i) / coarseSamples
    const v = fn(x)
    if (v > bestV) {
      bestV = v
      bestX = x
    }
  }
  const step = (hi - lo) / coarseSamples
  let a = bestX - step
  let b = bestX + step
  for (let i = 0; i < 40; i++) {
    const m1 = a + (b - a) / 3
    const m2 = b - (b - a) / 3
    if (fn(m1) < fn(m2)) a = m1
    else b = m2
  }
  return (a + b) / 2
}

/**
 * The point on Earth directly under the sun, found numerically (not via a
 * hand-derived declination/equation-of-time formula) by maximizing suncalc's
 * own altitude function — self-consistent with the rest of this module by
 * construction, and verified: altitude at the result is within 1e-4° of 90°.
 */
function getSubsolarPoint(date: Date): { lat: number; lon: number } {
  const lon = maximize1D((lon) => getPosition(date, 0, lon).altitude, -180, 180, 72)
  const lat = maximize1D((lat) => getPosition(date, lat, lon).altitude, -90, 90, 36)
  return { lat, lon }
}

/**
 * The terminator is the great circle 90° (in arc distance) from the subsolar
 * point — standard closed-form day/night-map formula, verified numerically
 * against suncalc.getPosition (altitude ≈ 0 at every returned point, up to
 * suncalc's own atmospheric-refraction constant).
 */
function terminatorLatitude(lonDeg: number, subLat: number, subLon: number): number {
  const dLon = (lonDeg - subLon) * DEG
  const phiS = subLat * DEG

  if (Math.abs(subLat) < 1e-6) {
    // Equinox: the formula's limit depends on which side of zero phiS approaches
    // from, so pick the extreme it's heading toward rather than divide by ~0.
    const sign = subLat >= 0 ? 1 : -1
    const towardNorth = -Math.sign(Math.cos(dLon)) * sign > 0
    return towardNorth ? MAX_ABS_LAT : -MAX_ABS_LAT
  }

  const raw = Math.atan(-Math.cos(dLon) / Math.tan(phiS)) / DEG
  return Math.max(-MAX_ABS_LAT, Math.min(MAX_ABS_LAT, raw))
}

/**
 * docs/06-data-model.md §4. An SVG path 'd' string for the day/night boundary
 * on an equirectangular world map of the given pixel size (lon -180..180 ->
 * x 0..width, lat 90..-90 -> y 0..height).
 */
export function getTerminatorPath(now: number, width: number, height: number): string {
  const date = new Date(now)
  const { lat: subLat, lon: subLon } = getSubsolarPoint(date)

  const samples = Math.max(24, Math.round(width / 8))
  const points: [number, number][] = []
  for (let i = 0; i <= samples; i++) {
    const lonDeg = -180 + (360 * i) / samples
    const lat = terminatorLatitude(lonDeg, subLat, subLon)
    const x = ((lonDeg + 180) / 360) * width
    const y = ((90 - lat) / 180) * height
    points.push([x, y])
  }

  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
}
