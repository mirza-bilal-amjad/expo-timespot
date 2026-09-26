import { SNAP_TARGETS_MINUTES, snapToNearestOffset, stepByHour, stepToAdjacentOffset } from "./snap"

describe("snapToNearestOffset", () => {
  it("snaps to the nearest whole-hour target with no velocity", () => {
    expect(snapToNearestOffset(0)).toBe(0)
    expect(snapToNearestOffset(20)).toBe(0)
    expect(snapToNearestOffset(40)).toBe(60)
  })

  it("reaches every 45-minute zone CLAUDE.md warns about — Kathmandu, Eucla, Chatham", () => {
    expect(snapToNearestOffset(340)).toBe(345) // Asia/Kathmandu +5:45
    expect(snapToNearestOffset(520)).toBe(525) // Australia/Eucla +8:45
    expect(snapToNearestOffset(760)).toBe(765) // Pacific/Chatham +12:45
  })

  it("reaches +14 (Kiritimati) and the 30-minute zones", () => {
    expect(snapToNearestOffset(835)).toBe(840) // Pacific/Kiritimati +14
    expect(snapToNearestOffset(325)).toBe(330) // Asia/Kolkata +5:30
    expect(snapToNearestOffset(-215)).toBe(-210) // America/St_Johns -3:30
  })

  it("is idempotent on an already-valid target", () => {
    for (const target of SNAP_TARGETS_MINUTES) {
      expect(snapToNearestOffset(target)).toBe(target)
    }
  })

  it("projects a fast flick past the nearest neighbour toward the next target", () => {
    // Released exactly at UTC+0 but flicking hard to the east — a slow
    // release would snap right back to 0; a fast one should carry past it.
    const fast = snapToNearestOffset(0, 3000)
    expect(fast).toBeGreaterThan(0)
  })

  it("with zero velocity, never lands anywhere but the nearest target", () => {
    expect(snapToNearestOffset(650)).toBe(660)
    expect(snapToNearestOffset(-655)).toBe(-660)
  })
})

describe("stepToAdjacentOffset", () => {
  it("steps to the next real target from an already-valid one", () => {
    expect(stepToAdjacentOffset(0, 1)).toBe(60)
    expect(stepToAdjacentOffset(0, -1)).toBe(-60)
  })

  it("steps to the *adjacent real zone*, not a raw ±60 minutes, from an uneven zone", () => {
    // +5:45 (Kathmandu) + a raw hour would be +6:45, which isn't real — the
    // adjacent real zone is +6:00.
    expect(stepToAdjacentOffset(345, 1)).toBe(360)
    expect(stepToAdjacentOffset(345, -1)).toBe(330) // +5:30 (Kolkata)
  })

  it("clamps at the ends of the range instead of wrapping or going out of bounds", () => {
    expect(stepToAdjacentOffset(840, 1)).toBe(840) // already at +14, the max
    expect(stepToAdjacentOffset(-720, -1)).toBe(-720) // already at -12, the min
  })

  it("from a non-snapped position, steps relative to the nearest target, not the raw value", () => {
    // 20 min past UTC+0 is nearest to 0 — stepping forward should land on
    // the next target after 0 (60), not after 20.
    expect(stepToAdjacentOffset(20, 1)).toBe(60)
  })
})

describe("stepByHour (web ← / →, task 6.8)", () => {
  it("moves a whole hour between whole-hour zones", () => {
    expect(stepByHour(540, 1)).toBe(600)
    expect(stepByHour(540, -1)).toBe(480)
    expect(stepByHour(0, -1)).toBe(-60)
  })

  it("lands on a real zone when the raw hour isn't one", () => {
    // +5:45 + 1h = +6:45 isn't real; +6:30 and +7 tie, the whole hour wins.
    expect(stepByHour(345, 1)).toBe(420)
    // −3:30 − 1h = −4:30 isn't real; −4 and −5 tie, the shorter move wins.
    expect(stepByHour(-210, -1)).toBe(-240)
  })

  it("always moves in the direction pressed", () => {
    for (const offset of SNAP_TARGETS_MINUTES.slice(0, -1)) {
      expect(stepByHour(offset, 1)).toBeGreaterThan(offset)
    }
    for (const offset of SNAP_TARGETS_MINUTES.slice(1)) {
      expect(stepByHour(offset, -1)).toBeLessThan(offset)
    }
  })

  it("stops at the ends of the ruler, UTC+14 included", () => {
    expect(stepByHour(840, 1)).toBe(840)
    expect(stepByHour(780, 1)).toBe(840)
    expect(stepByHour(-720, -1)).toBe(-720)
  })
})
