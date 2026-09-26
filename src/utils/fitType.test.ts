import {
  type CityMetrics,
  cityHeightAt,
  type ClockFitInput,
  fitClock,
  largestScale,
  lineCount,
} from "./fitType"

describe("lineCount", () => {
  it("wraps greedily, first fit", () => {
    // "aaa bb cccc" with a space of 1: aaa+bb = 6 fits in 7, cccc goes down.
    expect(lineCount([3, 2, 4], 1, 7)).toBe(2)
    expect(lineCount([3, 2, 4], 1, 11)).toBe(1)
    expect(lineCount([3, 2, 4], 1, 4)).toBe(3)
  })

  it("puts an over-long word on a line of its own rather than looping", () => {
    expect(lineCount([10, 2], 1, 5)).toBe(2)
  })

  it("is zero for no words", () => {
    expect(lineCount([], 1, 100)).toBe(0)
  })
})

describe("largestScale", () => {
  const bounds = { min: 0.5, max: 2 }

  it("finds the threshold of a monotone predicate", () => {
    expect(largestScale((s) => s <= 1.37, bounds)).toBeCloseTo(1.37, 4)
  })

  it("returns the bounds when everything, or nothing, fits", () => {
    expect(largestScale(() => true, bounds)).toBe(2)
    expect(largestScale(() => false, bounds)).toBeNull()
  })
})

// "Los Angeles, California, USA" at the design size, roughly.
const losAngeles: CityMetrics = { words: [84, 190, 240, 110], space: 14, lineHeight: 57 }

// Hours line: two 90-wide cells, a 16 gap and a 150-wide date — all linear
// except the gap, like the real hero. Two 124-high numeral rows.
const heroSize = (s: number) => ({ width: 180 * s + 16 + 150 * s, height: 248 * s })

const phone = (overrides: Partial<ClockFitInput> = {}): ClockFitInput => ({
  width: 345,
  height: 620,
  heroSize,
  heroMaxHeightShare: 0.62,
  fixedHeight: 80,
  city: losAngeles,
  wrapSafety: 0.96,
  heroBounds: { min: 0.6, max: 1.6 },
  cityBounds: { min: 0.75, max: 2 },
  ...overrides,
})

describe("fitClock", () => {
  it("fills the width with the hero", () => {
    const fit = fitClock(phone())
    expect(heroSize(fit.hero).width).toBeLessThanOrEqual(345)
    expect(heroSize(fit.hero).width).toBeGreaterThan(345 - 1)
  })

  it("grows the city into the remaining height without overflowing it", () => {
    const input = phone()
    const fit = fitClock(input)
    const room = input.height - heroSize(fit.hero).height - input.fixedHeight
    const width = input.width * input.wrapSafety
    expect(cityHeightAt(losAngeles, fit.city, width)).toBeLessThanOrEqual(room)
    // Bigger would either overflow or break a word.
    const bigger = fit.city * 1.01
    const widest = Math.max(...losAngeles.words)
    expect(cityHeightAt(losAngeles, bigger, width) > room || widest * bigger > width).toBe(true)
    expect(fit.cityLines).toBeGreaterThan(0)
  })

  it("caps the hero at its share of the height on a wide, short box", () => {
    const fit = fitClock(phone({ width: 2000, height: 500 }))
    expect(heroSize(fit.hero).height).toBeLessThanOrEqual(500 * 0.62 + 1e-6)
  })

  it("shrinks the hero when even the smallest city name can't fit below it", () => {
    const tall = fitClock(phone())
    const short = fitClock(phone({ height: 380 }))
    expect(short.hero).toBeLessThan(tall.hero)
    expect(short.city).toBe(0.75)
    const room = 380 - heroSize(short.hero).height - 80
    expect(cityHeightAt(losAngeles, 0.75, 345 * 0.96)).toBeLessThanOrEqual(room + 1e-6)
  })

  it("is deterministic — the same input always gives the same answer", () => {
    expect(fitClock(phone())).toEqual(fitClock(phone()))
  })
})
