import { renderHook } from "@testing-library/react-native"

import { useMapRenderTier } from "./useMapRenderTier"

let mockDeviceYearClass: number | null = null

jest.mock("expo-device", () => ({
  get deviceYearClass() {
    return mockDeviceYearClass
  },
}))

/**
 * The paint-timing half isn't meaningfully testable under jest — real
 * elapsed milliseconds in a test environment are exactly the kind of
 * non-deterministic signal `domain/map/renderTier.test.ts` already covers
 * with injected values instead. This only pins down the one thing that is
 * deterministic here: a device already flagged by `deviceYearClass` decides
 * the tier before a single frame renders, matching task 4.9's "forced
 * low-tier renders the raster" acceptance.
 */
describe("useMapRenderTier", () => {
  afterEach(() => {
    mockDeviceYearClass = null
  })

  it("is vector immediately on a modern/unknown device", () => {
    mockDeviceYearClass = 2023
    const { result } = renderHook(() => useMapRenderTier())
    expect(result.current).toBe("vector")
  })

  it("is raster immediately when deviceYearClass already flags an old device — no paint measurement needed", () => {
    mockDeviceYearClass = 2012
    const { result } = renderHook(() => useMapRenderTier())
    expect(result.current).toBe("raster")
  })
})
