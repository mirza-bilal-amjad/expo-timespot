import {
  geometryToSvgPath,
  LAT_MAX,
  LAT_MIN,
  MAP_ASPECT,
  projectLonLat,
  unprojectPoint,
} from "./projection"

const W = 1000
const H = W * MAP_ASPECT

describe("projectLonLat (clipped Mercator)", () => {
  it("maps the clip corners to the four viewport corners", () => {
    expect(projectLonLat(-180, LAT_MAX, W, H).x).toBeCloseTo(0)
    expect(projectLonLat(-180, LAT_MAX, W, H).y).toBeCloseTo(0)
    expect(projectLonLat(180, LAT_MIN, W, H).x).toBeCloseTo(W)
    expect(projectLonLat(180, LAT_MIN, W, H).y).toBeCloseTo(H)
  })

  it("clamps latitudes beyond the clip to the edge instead of running off to infinity", () => {
    expect(projectLonLat(0, 90, W, H).y).toBeCloseTo(0)
    expect(projectLonLat(0, -90, W, H).y).toBeCloseTo(H)
  })

  it("is linear in longitude — what keeps the meridian and the ruler in step", () => {
    const a = projectLonLat(-90, 10, W, H)
    const b = projectLonLat(0, 10, W, H)
    const c = projectLonLat(90, 10, W, H)
    expect(b.x - a.x).toBeCloseTo(c.x - b.x)
  })

  it("stretches high latitudes like the board does — 60-70°N is taller than 0-10°N", () => {
    const equatorBand = projectLonLat(0, 0, W, H).y - projectLonLat(0, 10, W, H).y
    const arcticBand = projectLonLat(0, 60, W, H).y - projectLonLat(0, 70, W, H).y
    expect(arcticBand).toBeGreaterThan(equatorBand * 2)
  })
})

describe("unprojectPoint", () => {
  it("round-trips real cities to within a hair", () => {
    for (const [lon, lat] of [
      [3.04, 36.75], // Algiers
      [-46.63, -23.55], // São Paulo
      [139.69, 35.69], // Tokyo
      [18.96, 69.65], // Tromsø
    ]) {
      const { x, y } = projectLonLat(lon, lat, W, H)
      const back = unprojectPoint(x, y, W, H)
      expect(back.lon).toBeCloseTo(lon, 6)
      expect(back.lat).toBeCloseTo(lat, 6)
    }
  })
})

describe("geometryToSvgPath", () => {
  it("builds a closed M/L/Z path for a single-ring Polygon", () => {
    // Nowhere near ±180 — the crossing-detection test below covers that case
    // on its own, deliberately.
    const d = geometryToSvgPath(
      {
        type: "Polygon",
        coordinates: [
          [
            [-30, -80],
            [30, -80],
            [30, 80],
            [-30, -80],
          ],
        ],
      },
      360,
      180,
    )
    expect(d).toMatch(/^M150\.0,[\d.]+ L210\.0,[\d.]+ L210\.0,[\d.]+ L150\.0,[\d.]+ Z$/)
  })

  it("concatenates one subpath per polygon for a MultiPolygon", () => {
    const d = geometryToSvgPath(
      {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 0],
            ],
          ],
          [
            [
              [20, 20],
              [30, 20],
              [30, 30],
              [20, 20],
            ],
          ],
        ],
      },
      360,
      180,
    )
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
  })

  it("emits a second ring (a hole) as its own M/L/Z subpath within the same Polygon", () => {
    const d = geometryToSvgPath(
      {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [20, 0],
            [20, 20],
            [0, 0],
          ],
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 5],
          ],
        ],
      },
      360,
      180,
    )
    expect(d.match(/M/g)).toHaveLength(2)
  })

  it("draws an antimeridian-crossing ring as two closed copies, never a chord across the map", () => {
    // Russia-shaped: pokes past +180 and re-enters near −180. Unwrapped it's
    // one continuous ring extending past the right edge; a second copy one
    // world-width left supplies the part that shows at the left edge.
    const d = geometryToSvgPath(
      {
        type: "Polygon",
        coordinates: [
          [
            [170, 60],
            [179, 65],
            [-179, 66],
            [-170, 60],
            [170, 60],
          ],
        ],
      },
      360,
      180,
    )
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
    const xs = [...d.matchAll(/[ML](-?[\d.]+),/g)].map((m) => Number(m[1]))
    expect(Math.max(...xs)).toBeGreaterThan(360) // right copy runs off the right edge
    expect(Math.min(...xs)).toBeLessThan(0) // left copy runs off the left edge
    // No segment jumps anywhere near a full map width — the bug's signature.
    const points = [...d.matchAll(/([ML])(-?[\d.]+),/g)]
    for (let i = 1; i < points.length; i++) {
      if (points[i][1] !== "L") continue
      expect(Math.abs(Number(points[i][2]) - Number(points[i - 1][2]))).toBeLessThan(180)
    }
  })

  it("renders a MultiLineString (country borders) as open subpaths, never closed", () => {
    const d = geometryToSvgPath(
      {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [10, 10],
          ],
          [
            [20, 20],
            [30, 30],
          ],
        ],
      },
      360,
      180,
    )
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d).not.toContain("Z")
  })

  it("throws on an unsupported geometry type rather than silently rendering nothing", () => {
    expect(() => geometryToSvgPath({ type: "Point", coordinates: [0, 0] }, 360, 180)).toThrow(
      /unsupported geometry type/i,
    )
  })
})
