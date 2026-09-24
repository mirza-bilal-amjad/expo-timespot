import type { Geometry, Position } from "geojson"

/**
 * docs/04-screen-specs.md "S3 · Map" — "Equirectangular projection (plate
 * carrée) — mandatory, because it makes longitude linear, which is what
 * makes the meridian and the ruler agree." Longitude/latitude map linearly
 * onto the full [-180, 180] × [-90, 90] globe, never onto the land data's
 * own (slightly clipped) bbox — the meridian (task 4.3) and the UTC ruler
 * (task 4.4) are computed against that same full-globe domain, so the map
 * has to use it too or they'd disagree.
 */

export interface Point {
  x: number
  y: number
}

export function projectLonLat(lon: number, lat: number, width: number, height: number): Point {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  }
}

// A consecutive-point longitude jump this large is the ring crossing the
// antimeridian (±180°), not real adjacency — Russia, Antarctica and Fiji all
// do this in world.topo.json. Connecting them with a line would draw a
// spurious edge straight across the map at that latitude; breaking into a
// new subpath there instead avoids it, at the cost of a small unclipped
// notch right at the map's left/right edge, which reads as part of the
// silhouette rather than as a rendering bug.
const ANTIMERIDIAN_JUMP_DEGREES = 180

function ringToPath(ring: Position[], width: number, height: number): string {
  const subpaths: string[] = []
  let current: string[] = []

  ring.forEach(([lon, lat], i) => {
    const { x, y } = projectLonLat(lon, lat, width, height)
    const point = `${x.toFixed(2)},${y.toFixed(2)}`
    const prevLon = i > 0 ? ring[i - 1][0] : null
    if (prevLon !== null && Math.abs(lon - prevLon) > ANTIMERIDIAN_JUMP_DEGREES) {
      subpaths.push(`${current.join(" ")} Z`)
      current = [`M${point}`]
    } else {
      current.push(`${i === 0 ? "M" : "L"}${point}`)
    }
  })

  subpaths.push(`${current.join(" ")} Z`)
  return subpaths.join(" ")
}

/** One SVG path `d` string for the whole geometry — holes (a ring after the
 * first in a `Polygon`) rely on SVG's default nonzero fill rule to render as
 * holes, same as every other ring in the same subpath set. */
export function geometryToSvgPath(geometry: Geometry, width: number, height: number): string {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => ringToPath(ring, width, height)).join(" ")
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((polygon) => polygon.map((ring) => ringToPath(ring, width, height)).join(" "))
      .join(" ")
  }
  throw new Error(`geometryToSvgPath: unsupported geometry type "${geometry.type}"`)
}
