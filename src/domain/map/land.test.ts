import { getLandSvgPath } from "./land"

/**
 * docs/10-implementation-plan.md task 4.1 acceptance: "first paint < 120 ms
 * on a Pixel 6a." That's a real-device number this environment can't
 * measure — what's checkable here is that resolving+projecting the whole
 * ~28 KB dataset is cheap in the first place, so a real device's budget is
 * plausible; an actual device/simulator profile is still owed (see the
 * project memory's standing verification-gap note).
 */
describe("getLandSvgPath", () => {
  it("returns a non-empty SVG path string built from M/L/Z commands", () => {
    const d = getLandSvgPath(360, 180)
    expect(d.length).toBeGreaterThan(100)
    expect(d).toMatch(/^M/)
    expect(d).toContain("Z")
  })

  it("scales with the requested viewport — doubling the size doubles the coordinates", () => {
    const small = getLandSvgPath(360, 180)
    const big = getLandSvgPath(720, 360)
    const firstSmall = /M(-?[\d.]+),(-?[\d.]+)/.exec(small)!
    const firstBig = /M(-?[\d.]+),(-?[\d.]+)/.exec(big)!
    expect(Number(firstBig[1])).toBeCloseTo(Number(firstSmall[1]) * 2, 1)
    expect(Number(firstBig[2])).toBeCloseTo(Number(firstSmall[2]) * 2, 1)
  })

  it("resolves and projects the whole dataset in well under a frame budget", () => {
    const start = performance.now()
    getLandSvgPath(1024, 512)
    expect(performance.now() - start).toBeLessThan(50)
  })
})
