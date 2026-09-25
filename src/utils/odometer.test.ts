import {
  JUMP_GUARD_THRESHOLD,
  planRoll,
  restIndex,
  settleIndex,
  STRIP_CELLS,
  wheelStep,
} from "./odometer"

describe("odometer index maths", () => {
  it("rests every digit inside the strip, showing that digit", () => {
    for (let d = 0; d <= 9; d++) {
      const i = restIndex(d)
      expect(i % 10).toBe(d)
      expect(i).toBeGreaterThanOrEqual(JUMP_GUARD_THRESHOLD)
      expect(i).toBeLessThan(STRIP_CELLS - JUMP_GUARD_THRESHOLD)
    }
  })

  it("steps the short way round the wheel, forward on a tick", () => {
    expect(wheelStep(3, 4)).toBe(1)
    expect(wheelStep(9, 0)).toBe(1)
    expect(wheelStep(4, 3)).toBe(-1)
    expect(wheelStep(0, 9)).toBe(-1)
    expect(wheelStep(0, 5)).toBe(5) // half-turn tie goes forward
  })

  it("rolls every ordinary tick forward onto the right glyph", () => {
    for (let d = 0; d <= 9; d++) {
      const next = (d + 1) % 10
      const plan = planRoll(restIndex(d), d, next)
      expect(plan.animate).toBe(true)
      expect(plan.target).toBe(restIndex(d) + 1) // up, never back round
      expect(plan.target % 10).toBe(next)
    }
  })

  it("rolls 9 → 0 forward into the next 0, then settles on an identical glyph", () => {
    const plan = planRoll(restIndex(9), 9, 0)
    expect(plan.target).toBe(restIndex(9) + 1)
    const settled = settleIndex(plan.target)
    expect(settled % 10).toBe(0)
    expect(settled).toBe(restIndex(0))
  })

  it("cuts, never rolls, on a clock jump", () => {
    const plan = planRoll(restIndex(1), 1, 8)
    expect(plan.animate).toBe(false)
    expect(plan.target).toBe(restIndex(8))
  })

  it("keeps up with ticks that interrupt an unfinished roll", () => {
    // Five ticks, none of whose rolls finish: each plans from the last target.
    let index = restIndex(3)
    let digit = 3
    for (let i = 0; i < 5; i++) {
      const next = (digit + 1) % 10
      const plan = planRoll(index, digit, next)
      expect(plan.target % 10).toBe(next)
      index = plan.target
      digit = next
    }
  })

  it("falls back to a cut rather than run off the strip", () => {
    const plan = planRoll(STRIP_CELLS - 1, 9, 0)
    expect(plan.animate).toBe(false)
    expect(plan.target).toBe(restIndex(0))
  })
})
