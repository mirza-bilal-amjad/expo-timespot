import {
  MAX_OFFSET_MINUTES,
  MIN_OFFSET_MINUTES,
  offsetMinutesToX,
  pixelVelocityToOffsetVelocity,
  xToOffsetMinutes,
} from "./meridian"

const WIDTH = 720

describe("xToOffsetMinutes", () => {
  it("maps the map's centre (lon 0) to UTC+0", () => {
    expect(xToOffsetMinutes(WIDTH / 2, WIDTH)).toBe(0)
  })

  it("maps the map's left/right edges (lon ∓180°) to ∓12h — geographic longitude's own limit", () => {
    expect(xToOffsetMinutes(0, WIDTH)).toBe(MIN_OFFSET_MINUTES)
    expect(xToOffsetMinutes(WIDTH, WIDTH)).toBe(12 * 60)
  })

  // Longitude tops out at 180°/+12h, unlike the real UTC ruler (Kiritimati's
  // +14) — exactly why the ruler (task 4.4) needs its own, non-geographic
  // mapping to reach +14, not this one.
  it("can never geographically produce +13h or +14h", () => {
    expect(xToOffsetMinutes(WIDTH, WIDTH)).toBeLessThan(MAX_OFFSET_MINUTES)
  })

  it("is linear in x — equal pixel steps are equal offset steps", () => {
    const a = xToOffsetMinutes(WIDTH * 0.25, WIDTH)
    const b = xToOffsetMinutes(WIDTH * 0.5, WIDTH)
    const c = xToOffsetMinutes(WIDTH * 0.75, WIDTH)
    expect(b - a).toBeCloseTo(c - b)
  })

  it("clamps out-of-range x instead of returning an offset outside ±14/-12h", () => {
    expect(xToOffsetMinutes(-100, WIDTH)).toBe(MIN_OFFSET_MINUTES)
    expect(xToOffsetMinutes(WIDTH + 100, WIDTH)).toBe(MAX_OFFSET_MINUTES)
  })
})

describe("offsetMinutesToX", () => {
  it("is the inverse of xToOffsetMinutes for offsets inside longitude's own ±12h range", () => {
    for (const offset of [-720, -480, -60, 0, 60, 330, 720]) {
      const x = offsetMinutesToX(offset, WIDTH)
      expect(xToOffsetMinutes(x, WIDTH)).toBeCloseTo(offset, 5)
    }
  })

  it("clamps an offset beyond ±12h (e.g. Kiritimati's +14) to the map's own edge", () => {
    expect(offsetMinutesToX(MAX_OFFSET_MINUTES, WIDTH)).toBe(WIDTH)
    expect(offsetMinutesToX(15 * 60, WIDTH)).toBe(WIDTH)
  })
})

describe("pixelVelocityToOffsetVelocity", () => {
  it("is the same scale as xToOffsetMinutes — a full-width flick in one second covers the full 360° range", () => {
    expect(pixelVelocityToOffsetVelocity(WIDTH, WIDTH)).toBeCloseTo(24 * 60, 5)
  })

  it("is linear and sign-preserving", () => {
    expect(pixelVelocityToOffsetVelocity(-WIDTH, WIDTH)).toBeCloseTo(-24 * 60, 5)
    expect(pixelVelocityToOffsetVelocity(0, WIDTH)).toBe(0)
  })
})
