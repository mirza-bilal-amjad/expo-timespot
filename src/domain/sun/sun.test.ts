import { getPosition } from "suncalc"

import { getSunTimes, isDaylight } from "./sun"

const TROMSO = { lat: 69.6496, lon: 18.956 }
const EQUATOR = { lat: 0, lon: 30 }

describe("getSunTimes", () => {
  it("returns 'polar-night' with null sunrise/sunset and zero day length", () => {
    const t = getSunTimes(TROMSO.lat, TROMSO.lon, new Date("2026-12-15T12:00:00Z"), "Europe/Oslo")
    expect(t.kind).toBe("polar-night")
    expect(t.sunrise).toBeNull()
    expect(t.sunset).toBeNull()
    expect(t.dayLengthMinutes).toBe(0)
  })

  it("returns 'midnight-sun' with null sunrise/sunset and a full 24h day length", () => {
    const t = getSunTimes(TROMSO.lat, TROMSO.lon, new Date("2026-06-15T12:00:00Z"), "Europe/Oslo")
    expect(t.kind).toBe("midnight-sun")
    expect(t.sunrise).toBeNull()
    expect(t.sunset).toBeNull()
    expect(t.dayLengthMinutes).toBe(24 * 60)
  })

  it("gives the equator a 'normal' day close to 12h year-round", () => {
    for (const dateStr of [
      "2026-01-15T12:00:00Z",
      "2026-04-15T12:00:00Z",
      "2026-09-15T12:00:00Z",
    ]) {
      const t = getSunTimes(EQUATOR.lat, EQUATOR.lon, new Date(dateStr), "UTC")
      expect(t.kind).toBe("normal")
      expect(t.dayLengthMinutes).toBeGreaterThan(11 * 60 + 45)
      expect(t.dayLengthMinutes).toBeLessThan(12 * 60 + 15)
    }
  })

  it("sunrise precedes sunset, and dayLengthMinutes matches their gap exactly", () => {
    const t = getSunTimes(51.5, -0.12, new Date("2026-03-20T12:00:00Z"), "Europe/London")
    expect(t.kind).toBe("normal")
    expect(t.sunrise!.getTime()).toBeLessThan(t.sunset!.getTime())
    const minutes = Math.round((t.sunset!.getTime() - t.sunrise!.getTime()) / 60_000)
    expect(t.dayLengthMinutes).toBe(minutes)
  })

  it("anchors on the target zone's local calendar day, not UTC's", () => {
    // Kiritimati is UTC+14, so its local midnight falls at 10:00 UTC on the
    // previous UTC calendar day. These two instants sit on the SAME UTC day
    // (14 June) but on either side of that rollover, i.e. different Kiritimati
    // local days (14 vs 15 June) — a UTC-anchored implementation would wrongly
    // return the same day's sun times for both; a zone-anchored one won't.
    const beforeLocalMidnight = getSunTimes(
      1.87,
      -157.4,
      new Date("2026-06-14T09:00:00Z"), // 23:00 Kiritimati local, 14 June
      "Pacific/Kiritimati",
    )
    const afterLocalMidnight = getSunTimes(
      1.87,
      -157.4,
      new Date("2026-06-14T11:00:00Z"), // 01:00 Kiritimati local, 15 June
      "Pacific/Kiritimati",
    )
    expect(beforeLocalMidnight.sunrise!.toISOString().slice(0, 10)).not.toBe(
      afterLocalMidnight.sunrise!.toISOString().slice(0, 10),
    )
  })
})

describe("isDaylight", () => {
  it("agrees with suncalc's own altitude sign", () => {
    const at = Date.UTC(2026, 5, 15, 8, 0, 0)
    const alt = getPosition(new Date(at), 48.85, 2.35).altitude
    expect(isDaylight(48.85, 2.35, at)).toBe(alt > 0)
  })

  it("is true at local noon and false at local midnight, at the equator", () => {
    const noonUtc = Date.UTC(2026, 5, 15, 12, 0, 0) // lon=0, so UTC noon = local noon
    const midnightUtc = Date.UTC(2026, 5, 15, 0, 0, 0)
    expect(isDaylight(0, 0, noonUtc)).toBe(true)
    expect(isDaylight(0, 0, midnightUtc)).toBe(false)
  })
})
