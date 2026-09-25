import { getBordersSvgPath, getLandSvgPath } from "./land"

/**
 * docs/10-implementation-plan.md task 4.1 acceptance: "first paint < 120 ms
 * on a Pixel 6a" is a real-device number; what's checkable here is that
 * projecting the dataset at map size is cheap once the topology is decoded.
 */
describe("getLandSvgPath", () => {
  it("returns a non-empty SVG path string built from M/L/Z commands", () => {
    const d = getLandSvgPath(880, 590)
    expect(d.length).toBeGreaterThan(1000)
    expect(d).toMatch(/^M/)
    expect(d).toContain("Z")
  })

  it("scales with the requested viewport — doubling the size doubles the coordinates", () => {
    const small = getLandSvgPath(360, 240)
    const big = getLandSvgPath(720, 480)
    const firstSmall = /M(-?[\d.]+),(-?[\d.]+)/.exec(small)!
    const firstBig = /M(-?[\d.]+),(-?[\d.]+)/.exec(big)!
    expect(Number(firstBig[1])).toBeCloseTo(Number(firstSmall[1]) * 2, 0)
    expect(Number(firstBig[2])).toBeCloseTo(Number(firstSmall[2]) * 2, 0)
  })

  it("re-projects at a new size inside the map's first-paint budget once decoded", () => {
    // Runs once per map *size* (the caller memoizes), not per frame, so the
    // budget is docs/05-architecture.md's "map first paint < 120 ms". The
    // median of several runs, so one GC pause under a loaded CI runner
    // can't fail it (~30 ms measured in isolation).
    getLandSvgPath(100, 70)
    const runs = Array.from({ length: 7 }, (_, i) => {
      const start = performance.now()
      getLandSvgPath(880 + i, 590)
      return performance.now() - start
    }).sort((x, y) => x - y)
    expect(runs[3]).toBeLessThan(120)
  })
})

describe("getBordersSvgPath", () => {
  it("returns open, stroke-only subpaths — no Z, since borders are lines", () => {
    const d = getBordersSvgPath(880, 590)
    expect(d.length).toBeGreaterThan(1000)
    expect(d).toMatch(/^M/)
    expect(d).not.toContain("Z")
  })
})
