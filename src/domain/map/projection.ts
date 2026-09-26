import type { Geometry, Position } from "geojson"

/**
 * docs/04-screen-specs.md "S3 · Map". Web Mercator, clipped to
 * [LAT_MIN, LAT_MAX] — the board's own projection (Greenland reads large,
 * Europe tall). Any cylindrical projection keeps x linear in longitude,
 * which is the property the ruler and the meridian actually depend on;
 * ~~equirectangular — mandatory~~ was stronger than that requirement
 * (corrected 2026-09-25).
 *
 * Latitudes are clipped rather than projected to infinity: 84°N keeps
 * northern Greenland and Svalbard, 58°S keeps Ushuaia and Tierra del Fuego
 * and drops Antarctica, which has no civilian zone to point at.
 */

export const LAT_MAX = 84
export const LAT_MIN = -58

const DEG = Math.PI / 180

function mercatorY(lat: number): number {
  "worklet"
  const clamped = Math.min(Math.max(lat, LAT_MIN), LAT_MAX)
  return Math.log(Math.tan(Math.PI / 4 + (clamped * DEG) / 2))
}

const Y_TOP = mercatorY(LAT_MAX)
const Y_BOTTOM = mercatorY(LAT_MIN)

/** Height ÷ width of the whole projected world — the caller sizes the map
 * content from this, never from the viewport's own aspect. */
export const MAP_ASPECT = (Y_TOP - Y_BOTTOM) / (2 * Math.PI)

export interface Point {
  x: number
  y: number
}

export function projectLonLat(lon: number, lat: number, width: number, height: number): Point {
  "worklet"
  return {
    x: ((lon + 180) / 360) * width,
    y: ((Y_TOP - mercatorY(lat)) / (Y_TOP - Y_BOTTOM)) * height,
  }
}

/** Inverse of `projectLonLat` — where on Earth a point on the map is. */
export function unprojectPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): { lon: number; lat: number } {
  const lon = (x / width) * 360 - 180
  const my = Y_TOP - (y / height) * (Y_TOP - Y_BOTTOM)
  const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / DEG
  return { lon, lat: Math.min(Math.max(lat, LAT_MIN), LAT_MAX) }
}

// A consecutive-point longitude jump this large is the ring crossing the
// antimeridian (±180°), not real adjacency — Russia's Chukotka and Fiji do.
const ANTIMERIDIAN_JUMP_DEGREES = 180

/**
 * Makes a ring's longitudes continuous across the antimeridian (179 → 181
 * rather than 179 → −179), and returns the whole-world shifts at which it
 * must be drawn: itself, plus a copy one world-width over if it pokes past
 * either edge. The SVG viewport clips both copies, so each half appears on
 * its own side of the map, closed and correctly filled.
 *
 * ~~Break into a new subpath at the jump~~ — corrected 2026-09-25: an
 * unclosed break leaves SVG to close each half with a straight chord, which
 * drew a false wedge across all of Siberia once the map was zoomed in.
 */
function unwrap(points: Position[]): { coords: [number, number][]; shifts: number[] } {
  const coords: [number, number][] = []
  let shift = 0
  let min = Infinity
  let max = -Infinity
  points.forEach(([lon, lat], i) => {
    if (i > 0) {
      const delta = lon - points[i - 1][0]
      if (delta > ANTIMERIDIAN_JUMP_DEGREES) shift -= 360
      else if (delta < -ANTIMERIDIAN_JUMP_DEGREES) shift += 360
    }
    const unwrapped = lon + shift
    min = Math.min(min, unwrapped)
    max = Math.max(max, unwrapped)
    coords.push([unwrapped, lat])
  })
  const shifts = [0]
  if (max > 180) shifts.push(-360)
  if (min < -180) shifts.push(360)
  return { coords, shifts }
}

function toPath(
  coords: [number, number][],
  lonShift: number,
  close: boolean,
  width: number,
  height: number,
): string {
  let d = ""
  coords.forEach(([lon, lat], i) => {
    const { x, y } = projectLonLat(lon + lonShift, lat, width, height)
    d += `${i === 0 ? "M" : " L"}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return close ? `${d} Z` : d
}

function ringToPath(ring: Position[], width: number, height: number): string {
  const { coords, shifts } = unwrap(ring)
  return shifts.map((s) => toPath(coords, s, true, width, height)).join(" ")
}

function lineToPath(line: Position[], width: number, height: number): string {
  const { coords, shifts } = unwrap(line)
  return shifts.map((s) => toPath(coords, s, false, width, height)).join(" ")
}

/** One SVG path `d` string for the whole geometry. Polygon holes rely on
 * SVG's default nonzero fill rule. Line geometries (country borders from
 * `topojson.mesh`) become open subpaths, for stroking. */
export function geometryToSvgPath(geometry: Geometry, width: number, height: number): string {
  switch (geometry.type) {
    case "Polygon":
      return geometry.coordinates.map((ring) => ringToPath(ring, width, height)).join(" ")
    case "MultiPolygon":
      return geometry.coordinates
        .map((polygon) => polygon.map((ring) => ringToPath(ring, width, height)).join(" "))
        .join(" ")
    case "LineString":
      return lineToPath(geometry.coordinates, width, height)
    case "MultiLineString":
      return geometry.coordinates.map((line) => lineToPath(line, width, height)).join(" ")
    default:
      throw new Error(`geometryToSvgPath: unsupported geometry type "${geometry.type}"`)
  }
}
