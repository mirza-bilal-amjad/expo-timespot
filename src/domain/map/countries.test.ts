import { getCountrySvgPath } from "./countries"

describe("getCountrySvgPath", () => {
  it("returns a non-empty SVG path for a large country present at 110m resolution", () => {
    const d = getCountrySvgPath("FR", 360, 180)
    expect(d).toBeDefined()
    expect(d!.length).toBeGreaterThan(20)
    expect(d).toMatch(/^M/)
    expect(d).toContain("Z")
  })

  it("scales with the requested viewport — doubling the size doubles the coordinates", () => {
    const small = getCountrySvgPath("FR", 360, 180)!
    const big = getCountrySvgPath("FR", 720, 360)!
    const firstSmall = /M(-?[\d.]+),(-?[\d.]+)/.exec(small)!
    const firstBig = /M(-?[\d.]+),(-?[\d.]+)/.exec(big)!
    expect(Number(firstBig[1])).toBeCloseTo(Number(firstSmall[1]) * 2, 1)
    expect(Number(firstBig[2])).toBeCloseTo(Number(firstSmall[2]) * 2, 1)
  })

  it("returns undefined for a country code absent from the 110m resolution (e.g. a micro-state)", () => {
    // Singapore is a real, valid ISO alpha-2 code and a real focusable city's
    // country — it's just too small to exist as its own shape at Natural
    // Earth's coarsest resolution. This is the expected, non-error case
    // WorldMap has to tolerate, not a bug in getCountrySvgPath.
    expect(getCountrySvgPath("SG", 360, 180)).toBeUndefined()
  })

  it("returns undefined for a code that was never a real country", () => {
    expect(getCountrySvgPath("ZZ", 360, 180)).toBeUndefined()
  })

  it("resolves and projects a country in well under a frame budget", () => {
    const start = performance.now()
    getCountrySvgPath("RU", 1024, 512)
    expect(performance.now() - start).toBeLessThan(50)
  })
})
