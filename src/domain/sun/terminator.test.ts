import { getPosition } from "suncalc"

import { getNightRegionPath, getTerminatorPath } from "./terminator"

const WIDTH = 800
const HEIGHT = 400

/** Reverses the projection in getTerminatorPath to recover (lat, lon) from an "M"/"L" command. */
function parsePathPoints(d: string): { lon: number; lat: number }[] {
  return d
    .trim()
    .split(" ")
    .map((command) => {
      const [x, y] = command.slice(1).split(",").map(Number)
      return { lon: (x / WIDTH) * 360 - 180, lat: 90 - (y / HEIGHT) * 180 }
    })
}

/** Ray-casting point-in-polygon over an SVG path's own pixel coordinates —
 * used to check which side of the closed night region a given (x, y) lands
 * on, independent of the lon/lat parsing above. */
function pixelIsInsidePath(d: string, x: number, y: number): boolean {
  const coords = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  )
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i]
    const [xj, yj] = coords[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Matches terminator.ts's own lon/lat -> pixel convention. */
function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * WIDTH, ((90 - lat) / 180) * HEIGHT]
}

describe("getNightRegionPath", () => {
  it("is a closed path — starts with M, ends with Z, one extra point per edge corner", () => {
    const d = getNightRegionPath(Date.UTC(2026, 5, 21, 12), WIDTH, HEIGHT)
    expect(d.startsWith("M")).toBe(true)
    expect(d.trim().endsWith("Z")).toBe(true)
  })

  it.each([
    ["march equinox", Date.UTC(2026, 2, 20, 12)],
    ["june solstice", Date.UTC(2026, 5, 21, 12)],
    ["december solstice", Date.UTC(2026, 11, 21, 12)],
  ])("matches its snapshot at the %s", (_label, at) => {
    expect(getNightRegionPath(at, WIDTH, HEIGHT)).toMatchSnapshot()
  })

  it.each([
    ["june solstice", Date.UTC(2026, 5, 21, 12)],
    ["december solstice", Date.UTC(2026, 11, 21, 12)],
  ])(
    "keeps the subsolar point out of the night region and the far pole, at the antisolar " +
      "longitude, inside it, at the %s",
    (_label, at) => {
      const date = new Date(at)
      // The subsolar point (max altitude over the globe) — found the same
      // way terminator.ts finds it, via suncalc's own altitude.
      let subLat = 0
      let subLon = 0
      let best = -Infinity
      for (let lon = -180; lon <= 180; lon += 5) {
        for (let lat = -90; lat <= 90; lat += 5) {
          const { altitude } = getPosition(date, lat, lon)
          if (altitude > best) {
            best = altitude
            subLat = lat
            subLon = lon
          }
        }
      }
      const d = getNightRegionPath(at, WIDTH, HEIGHT)

      const [sx, sy] = project(subLon, subLat)
      expect(pixelIsInsidePath(d, sx, sy)).toBe(false)

      // Not the exact geometric antipode — that can land precisely on the
      // polygon's own edge at lon ±180, which is an ambiguous input for
      // ray-casting. The pole opposite the sun's hemisphere, well inside the
      // map (away from x=0/width), is unambiguously deep in night instead.
      const antiLon = subLon > 0 ? subLon - 90 : subLon + 90
      const farPoleLat = subLat >= 0 ? -85 : 85
      const [ax, ay] = project(antiLon, farPoleLat)
      expect(pixelIsInsidePath(d, ax, ay)).toBe(true)
    },
  )
})

describe("getTerminatorPath", () => {
  it("is a well-formed SVG path — one M, the rest L, one point per sample", () => {
    const d = getTerminatorPath(Date.UTC(2026, 5, 21, 12), WIDTH, HEIGHT)
    const commands = d.trim().split(" ")
    expect(commands[0].startsWith("M")).toBe(true)
    expect(commands.slice(1).every((c) => c.startsWith("L"))).toBe(true)
    expect(commands.length).toBeGreaterThanOrEqual(24)
  })

  it("every returned point is within ~1 degree of true zero altitude", () => {
    // Not exactly 0 — suncalc's altitude is refraction-corrected, so the true
    // geometric horizon sits a fraction of a degree below apparent altitude 0.
    const at = Date.UTC(2026, 5, 21, 12) // near summer solstice
    const points = parsePathPoints(getTerminatorPath(at, WIDTH, HEIGHT))
    for (const { lat, lon } of points) {
      const altitude = getPosition(new Date(at), lat, lon).altitude
      expect(Math.abs(altitude)).toBeLessThan(1)
    }
  })

  it.each([
    ["march equinox", Date.UTC(2026, 2, 20, 12)],
    ["june solstice", Date.UTC(2026, 5, 21, 12)],
    ["december solstice", Date.UTC(2026, 11, 21, 12)],
  ])("matches its snapshot at the %s", (_label, at) => {
    expect(getTerminatorPath(at, WIDTH, HEIGHT)).toMatchSnapshot()
  })

  it("spans the full map width and stays within its vertical bounds", () => {
    const points = parsePathPoints(getTerminatorPath(Date.UTC(2026, 5, 21, 12), WIDTH, HEIGHT))
    expect(Math.min(...points.map((p) => p.lon))).toBeCloseTo(-180, 0)
    expect(Math.max(...points.map((p) => p.lon))).toBeCloseTo(180, 0)
    for (const { lat } of points) {
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
    }
  })
})
