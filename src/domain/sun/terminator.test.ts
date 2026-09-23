import { getPosition } from "suncalc"

import { getTerminatorPath } from "./terminator"

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
