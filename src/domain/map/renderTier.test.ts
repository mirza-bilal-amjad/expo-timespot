import { decideMapRenderTier } from "./renderTier"

describe("decideMapRenderTier", () => {
  it("defaults to vector when nothing is known yet", () => {
    expect(decideMapRenderTier({ deviceYearClass: null, firstPaintMs: null })).toBe("vector")
  })

  it("stays vector on a modern device with no paint measurement yet", () => {
    expect(decideMapRenderTier({ deviceYearClass: 2023, firstPaintMs: null })).toBe("vector")
  })

  // docs/10-implementation-plan.md task 4.9's own acceptance: "forced
  // low-tier renders the raster."
  it("falls back to raster for an old device, forced", () => {
    expect(decideMapRenderTier({ deviceYearClass: 2012, firstPaintMs: null })).toBe("raster")
  })

  it("falls back to raster for a slow first paint even on an unknown/capable device", () => {
    expect(decideMapRenderTier({ deviceYearClass: null, firstPaintMs: 40 })).toBe("raster")
    expect(decideMapRenderTier({ deviceYearClass: 2023, firstPaintMs: 40 })).toBe("raster")
  })

  it("stays vector for a fast first paint", () => {
    expect(decideMapRenderTier({ deviceYearClass: null, firstPaintMs: 5 })).toBe("vector")
  })

  it("is at the boundary: exactly 16ms is not yet slow", () => {
    expect(decideMapRenderTier({ deviceYearClass: null, firstPaintMs: 16 })).toBe("vector")
    expect(decideMapRenderTier({ deviceYearClass: null, firstPaintMs: 17 })).toBe("raster")
  })

  it("either signal alone is enough — a fast paint doesn't rescue an old device", () => {
    expect(decideMapRenderTier({ deviceYearClass: 2010, firstPaintMs: 1 })).toBe("raster")
  })
})
