import { isSettled, nextCityScale, nextHeroScale } from "./fitType"

const bounds = { min: 0.6, max: 2 }

describe("nextHeroScale", () => {
  it("solves for the scale that fills the width", () => {
    expect(nextHeroScale(1, { width: 280, height: 250 }, 350, 1000, 0.6, bounds)).toBeCloseTo(1.25)
  })

  it("never lets the hero take more than its share of the height", () => {
    // Width alone would allow 2×, but 500 × 2 > 60 % of 1000.
    expect(nextHeroScale(1, { width: 150, height: 500 }, 300, 1000, 0.6, bounds)).toBeCloseTo(1.2)
  })

  it("stays inside its bounds", () => {
    expect(nextHeroScale(1, { width: 50, height: 50 }, 1000, 5000, 0.6, bounds)).toBe(2)
    expect(nextHeroScale(1, { width: 1000, height: 50 }, 100, 5000, 0.6, bounds)).toBe(0.6)
  })

  it("keeps the current scale until it has a real measurement", () => {
    expect(nextHeroScale(1.3, { width: 0, height: 0 }, 300, 900, 0.6, bounds)).toBe(1.3)
  })
})

describe("nextCityScale", () => {
  it("grows by the square-root step when there is room", () => {
    expect(nextCityScale(1, 100, 400, bounds)).toBeCloseTo(2)
    expect(nextCityScale(1, 100, 225, bounds)).toBeCloseTo(1.5)
  })

  it("shrinks by the full ratio when it overflows, so it lands back inside", () => {
    expect(nextCityScale(1.5, 300, 240, bounds)).toBeCloseTo(1.2)
  })

  it("converges on a quadratic height model without oscillating", () => {
    // Simulate height ∝ scale² and iterate as the screen would.
    const heightAt = (s: number) => 110 * s * s
    let s = 1
    for (let i = 0; i < 8; i++) {
      const next = nextCityScale(s, heightAt(s), 300, bounds)
      if (isSettled(s, next)) break
      s = next
    }
    expect(heightAt(s)).toBeLessThanOrEqual(300 * 1.03)
    expect(heightAt(s)).toBeGreaterThan(300 * 0.9)
  })
})
