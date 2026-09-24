import { SNAP_TARGETS_MINUTES, snapToNearestOffset } from "./snap"

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
