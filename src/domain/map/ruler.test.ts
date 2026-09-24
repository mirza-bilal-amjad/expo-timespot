import { MAX_OFFSET_MINUTES, MIN_OFFSET_MINUTES } from "./meridian"
import { getRulerTicks, offsetToRulerX, rulerXToOffset } from "./ruler"

const TICK_WIDTH = 64

describe("getRulerTicks", () => {
  it("spans UTC-12 to UTC+14 in 1h steps — 27 ticks, including the real range's edges", () => {
    const ticks = getRulerTicks()
    expect(ticks[0]).toBe(MIN_OFFSET_MINUTES)
    expect(ticks[ticks.length - 1]).toBe(MAX_OFFSET_MINUTES)
    expect(ticks).toHaveLength(27)
    expect(ticks).toContain(14 * 60) // Kiritimati
  })

  it("is evenly spaced by exactly 1 hour", () => {
    const ticks = getRulerTicks()
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i] - ticks[i - 1]).toBe(60)
    }
  })
})

describe("offsetToRulerX / rulerXToOffset", () => {
  it("reaches +14h (Kiritimati) — the map's own geographic mapping cannot", () => {
    const x = offsetToRulerX(MAX_OFFSET_MINUTES, TICK_WIDTH)
    expect(rulerXToOffset(x, TICK_WIDTH)).toBe(MAX_OFFSET_MINUTES)
  })

  it("round-trips exactly at the real 45-minute zones — Kathmandu (+5:45) and Chatham (+12:45)", () => {
    for (const offset of [5 * 60 + 45, 12 * 60 + 45]) {
      const x = offsetToRulerX(offset, TICK_WIDTH)
      expect(rulerXToOffset(x, TICK_WIDTH)).toBeCloseTo(offset, 6)
    }
  })

  it("places UTC-12 at x=0 and is linear (60min == one tickWidth)", () => {
    expect(offsetToRulerX(MIN_OFFSET_MINUTES, TICK_WIDTH)).toBe(0)
    expect(offsetToRulerX(MIN_OFFSET_MINUTES + 60, TICK_WIDTH)).toBe(TICK_WIDTH)
  })

  it("clamps offsets outside -12h..+14h to the ruler's own edges", () => {
    expect(rulerXToOffset(-1000, TICK_WIDTH)).toBe(MIN_OFFSET_MINUTES)
    expect(offsetToRulerX(MAX_OFFSET_MINUTES + 120, TICK_WIDTH)).toBe(
      offsetToRulerX(MAX_OFFSET_MINUTES, TICK_WIDTH),
    )
  })
})
