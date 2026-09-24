import { geometryToSvgPath, projectLonLat } from "./projection"

describe("projectLonLat", () => {
  it("maps the four globe corners to the four viewport corners", () => {
    expect(projectLonLat(-180, 90, 360, 180)).toEqual({ x: 0, y: 0 })
    expect(projectLonLat(180, 90, 360, 180)).toEqual({ x: 360, y: 0 })
    expect(projectLonLat(-180, -90, 360, 180)).toEqual({ x: 0, y: 180 })
    expect(projectLonLat(180, -90, 360, 180)).toEqual({ x: 360, y: 180 })
  })

  it("maps 0,0 (the Gulf of Guinea) to the viewport centre", () => {
    expect(projectLonLat(0, 0, 360, 180)).toEqual({ x: 180, y: 90 })
  })

  it("is linear in longitude — equal degree steps are equal pixel steps", () => {
    const a = projectLonLat(-90, 0, 360, 180)
    const b = projectLonLat(0, 0, 360, 180)
    const c = projectLonLat(90, 0, 360, 180)
    expect(b.x - a.x).toBeCloseTo(c.x - b.x)
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
    expect(d).toBe("M150.00,170.00 L210.00,170.00 L210.00,10.00 L150.00,170.00 Z")
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

  it("breaks into a new subpath at an antimeridian crossing instead of drawing a line across the map", () => {
    // Russia-shaped: pokes past +180, re-enters near -180, then closes back
    // to its east-side start — a real coastline that crosses the
    // antimeridian and comes back necessarily crosses it twice (there and
    // back), so this ring produces two breaks (three subpaths; the third,
    // from the closing edge's own crossing, is a harmless zero-area point).
    // A naive line-to at either crossing would instead draw a spurious edge
    // straight across the map.
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
    expect(d.match(/M/g)).toHaveLength(3)
    // No L (line-to) command should jump more than half the map width from
    // the point before it — that's the signature of the bug this guards
    // against: a line connecting the map's right edge straight to its left.
    const points = [...d.matchAll(/([ML])(-?[\d.]+),(-?[\d.]+)/g)]
    for (let i = 1; i < points.length; i++) {
      const [command, xStr] = points[i]
      if (command !== "L") continue
      const x = Number(xStr)
      const prevX = Number(points[i - 1][2])
      expect(Math.abs(x - prevX)).toBeLessThan(180)
    }
  })

  it("throws on an unsupported geometry type rather than silently rendering nothing", () => {
    expect(() => geometryToSvgPath({ type: "Point", coordinates: [0, 0] }, 360, 180)).toThrow(
      /unsupported geometry type/i,
    )
  })
})
