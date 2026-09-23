import { getDifference, getOverlap } from "./diff"
import { getOffsetMinutes } from "./zone"

describe("getDifference", () => {
  it("is the offset of a minus the offset of b", () => {
    const now = Date.UTC(2026, 5, 15)
    const expectedMinutes =
      getOffsetMinutes(now, "Asia/Kolkata") - getOffsetMinutes(now, "Europe/London")
    const result = getDifference("Asia/Kolkata", "Europe/London", now)
    expect(result.minutes).toBe(expectedMinutes)
    expect(result.label.startsWith("+")).toBe(expectedMinutes >= 0)
  })

  it("India-London: +5:30 in winter (GMT), +4:30 in summer (BST) — not what either doc draft guessed", () => {
    const winter = Date.UTC(2026, 0, 15)
    const summer = Date.UTC(2026, 6, 15)
    expect(getDifference("Asia/Kolkata", "Europe/London", winter)).toEqual({
      minutes: 330,
      label: "+5:30",
    })
    expect(getDifference("Asia/Kolkata", "Europe/London", summer)).toEqual({
      minutes: 270,
      label: "+4:30",
    })
  })

  it("is antisymmetric: swapping a and b negates the result", () => {
    const now = Date.UTC(2026, 5, 15)
    const forward = getDifference("Asia/Tokyo", "America/Los_Angeles", now)
    const backward = getDifference("America/Los_Angeles", "Asia/Tokyo", now)
    expect(backward.minutes).toBe(-forward.minutes)
  })

  it("is zero for the same zone", () => {
    const now = Date.UTC(2026, 5, 15)
    expect(getDifference("Europe/Paris", "Europe/Paris", now)).toEqual({ minutes: 0, label: "+0" })
  })
})

describe("getOverlap", () => {
  const WORKDAY: [number, number] = [9, 17]

  it("returns null for zero-overlap pairs (LA <-> Tokyo), not a negative range", () => {
    const now = Date.UTC(2026, 5, 15)
    expect(getOverlap("America/Los_Angeles", "Asia/Tokyo", WORKDAY, now)).toBeNull()
  })

  it("London <-> Paris (a stable 1h apart): 7h overlap, expressed in Paris's local minutes", () => {
    const now = Date.UTC(2026, 5, 15) // both on their respective DST, 1h apart either way
    const overlap = getOverlap("Europe/London", "Europe/Paris", WORKDAY, now)
    expect(overlap).not.toBeNull()
    const { start, end } = overlap!
    expect(end - start).toBe(7 * 60)
    // Paris is 1h ahead, so the overlap is the later half of Paris's own 9-5 window.
    expect(start).toBe(10 * 60)
    expect(end).toBe(17 * 60)
  })

  it("returns the full workday when both zones share the same offset", () => {
    const now = Date.UTC(2026, 5, 15)
    const overlap = getOverlap("Europe/Paris", "Europe/Berlin", WORKDAY, now)
    expect(overlap).toEqual({ start: 9 * 60, end: 17 * 60 })
  })

  it("never returns an inverted (negative-length) range", () => {
    const now = Date.UTC(2026, 5, 15)
    const pairs: [string, string][] = [
      ["Pacific/Kiritimati", "Pacific/Midway"],
      ["Asia/Tehran", "America/Santiago"],
      ["Antarctica/Troll", "Australia/Sydney"],
    ]
    for (const [a, b] of pairs) {
      const overlap = getOverlap(a, b, WORKDAY, now)
      if (overlap) expect(overlap.end).toBeGreaterThan(overlap.start)
    }
  })
})
