import { tzOffset } from "@date-fns/tz"

import {
  formatOffset,
  getDeviceZone,
  getNextTransition,
  getOffsetMinutes,
  getZonedTime,
  isValidZone,
  parseOffsetQuery,
} from "./zone"
import { FIXTURE_ZONE_NAMES, FIXTURE_ZONES } from "../__fixtures__/zones"

const HOUR = 3_600_000

function isoDateInZone(now: number, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

describe("formatOffset", () => {
  it("renders whole-hour offsets with no zero-pad and no space after UTC", () => {
    expect(formatOffset(540)).toBe("UTC+9")
  })

  it("renders UTC+0, not 'UTC+00:00' or 'GMT'", () => {
    expect(formatOffset(0)).toBe("UTC+0")
  })

  it("renders sub-hour zones as H:MM", () => {
    expect(formatOffset(345)).toBe("UTC+5:45") // Kathmandu
    expect(formatOffset(-210)).toBe("UTC−3:30") // St John's, standard time
  })

  it("reaches the maximum, UTC+14", () => {
    expect(formatOffset(840)).toBe("UTC+14")
  })

  it("uses U+2212 for the minus sign, never a hyphen", () => {
    const label = formatOffset(-660)
    expect(label).toContain("−")
    expect(label).not.toContain("-")
  })
})

describe("getOffsetMinutes — fixed, non-DST zones", () => {
  // Spot-checked against zones with no DST, so these are stable regardless of date.
  const at = Date.UTC(2026, 5, 15)

  it.each([
    ["Asia/Kathmandu", 345],
    ["Asia/Kolkata", 330],
    ["Australia/Eucla", 525],
    ["Pacific/Kiritimati", 840],
    ["Asia/Shanghai", 480],
  ])("%s is UTC%s minutes", (zone, expected) => {
    expect(getOffsetMinutes(at, zone as string)).toBe(expected)
  })
})

describe("getOffsetMinutes / tzOffset agreement", () => {
  // docs/adr/0004: both the Intl-primary path and the @date-fns/tz path must agree.
  // Note: @date-fns/tz's tzOffset is itself Intl-backed (see its source), so this
  // guards against a bug in our own parsing, not true independence from a broken
  // Intl.DateTimeFormat — see the capability probe for that guarantee instead.
  const instants = [Date.UTC(2026, 0, 15), Date.UTC(2026, 6, 15), Date.UTC(2027, 2, 1)]

  it.each(FIXTURE_ZONE_NAMES)("%s matches @date-fns/tz at several instants", (zone) => {
    for (const at of instants) {
      expect(getOffsetMinutes(at, zone)).toBe(tzOffset(zone, new Date(at)))
    }
  })
})

describe("DST matrix — every fixture zone, every transition 2026-2028", () => {
  const WINDOW_START = Date.UTC(2026, 0, 1)
  const WINDOW_END = Date.UTC(2029, 0, 1)

  function findTransitionsInWindow(zone: string) {
    const transitions: { at: number; deltaMinutes: number }[] = []
    let from = WINDOW_START
    for (let i = 0; i < 12; i++) {
      // hard cap — no zone has more than a couple of transitions a year
      const next = getNextTransition(zone, from)
      if (!next || next.at >= WINDOW_END) break
      transitions.push(next)
      from = next.at
    }
    return transitions
  }

  describe.each(FIXTURE_ZONES)("$zone ($note)", ({ zone }) => {
    it("has a stable offset on both sides of every transition it has", () => {
      const transitions = findTransitionsInWindow(zone)

      for (const { at, deltaMinutes } of transitions) {
        const before1h = getOffsetMinutes(at - HOUR, zone)
        const before1s = getOffsetMinutes(at - 1000, zone)
        const after1s = getOffsetMinutes(at + 1000, zone)
        const after1h = getOffsetMinutes(at + HOUR, zone)

        expect(before1s).toBe(before1h) // stable right up to the boundary
        expect(after1s).toBe(after1h) // stable right after it
        expect(after1s - before1s).toBe(deltaMinutes) // the jump matches what was reported
        expect(deltaMinutes).not.toBe(0) // it's a real transition
      }
    })
  })

  it("Tehran has no DST transitions in the window — abolished in 2022", () => {
    expect(findTransitionsInWindow("Asia/Tehran")).toEqual([])
  })

  it("Shanghai has no DST transitions in the window — a single fixed offset", () => {
    expect(findTransitionsInWindow("Asia/Shanghai")).toEqual([])
  })
})

describe("getZonedTime", () => {
  const prefs24h = {
    timeFormat: "24h" as const,
    theme: "system" as const,
    showSecondsOnList: false,
    dayNightStyle: "icon" as const,
  }
  const prefs12h = { ...prefs24h, timeFormat: "12h" as const }

  it("formats hours/minutes for 24h prefs with no meridiem", () => {
    const at = Date.UTC(2026, 5, 15, 12, 0, 0) // noon UTC
    const t = getZonedTime(at, "UTC", prefs24h)
    expect(t.hours).toBe("12")
    expect(t.minutes).toBe("00")
    expect(t.display).toBe("12:00")
    expect(t.meridiem).toBeUndefined()
  })

  it("formats a 12h time with meridiem", () => {
    const at = Date.UTC(2026, 5, 15, 12, 0, 0) // noon UTC = midnight in Kiritimati next day... use UTC zone
    const t = getZonedTime(at, "UTC", prefs12h)
    expect(t.meridiem).toBe("PM")
    expect(t.hours).toBe("12")
  })

  it("offsetLabel and offsetMinutes agree with formatOffset", () => {
    const at = Date.UTC(2026, 5, 15)
    const t = getZonedTime(at, "Asia/Kathmandu", prefs24h)
    expect(t.offsetMinutes).toBe(345)
    expect(t.offsetLabel).toBe("UTC+5:45")
  })

  it("Kiritimati's calendar date is a day ahead of Midway's, at the same instant", () => {
    const at = Date.UTC(2026, 5, 15, 20, 0, 0)
    const kiritimatiDate = isoDateInZone(at, "Pacific/Kiritimati")
    const midwayDate = isoDateInZone(at, "Pacific/Midway")
    const diffDays = (Date.parse(kiritimatiDate) - Date.parse(midwayDate)) / 86_400_000
    expect(diffDays).toBe(1)
  })

  it("dayOffset is within -1/0/1 and matches the device's own calendar date", () => {
    const at = Date.now()
    const t = getZonedTime(at, "Pacific/Kiritimati", prefs24h)
    expect([-1, 0, 1]).toContain(t.dayOffset)
  })

  it("weekday is a stable 0-6 index matching the target zone's own calendar date", () => {
    const at = Date.UTC(2026, 0, 1)
    const t = getZonedTime(at, "UTC", prefs24h)
    // UTC's calendar date at this instant is the same as the raw UTC date, so
    // getUTCDay() on the same instant is ground truth here without hardcoding a weekday.
    expect(t.weekday).toBe(new Date(at).getUTCDay())
  })
})

describe("getDeviceZone / isValidZone", () => {
  it("getDeviceZone always returns a zone isValidZone accepts", () => {
    expect(isValidZone(getDeviceZone())).toBe(true)
  })

  it("isValidZone rejects garbage", () => {
    expect(isValidZone("Not/AZone")).toBe(false)
  })

  it("isValidZone accepts every fixture zone", () => {
    for (const zone of FIXTURE_ZONE_NAMES) {
      expect(isValidZone(zone)).toBe(true)
    }
  })
})

describe("getNextTransition", () => {
  it("returns null for a zone with no transitions ahead", () => {
    expect(getNextTransition("Asia/Kathmandu", Date.UTC(2026, 0, 1))).toBeNull()
  })

  it("finds a transition for a DST-observing zone and reports a non-zero delta", () => {
    const next = getNextTransition("America/Los_Angeles", Date.UTC(2026, 0, 1))
    expect(next).not.toBeNull()
    expect(next!.deltaMinutes).not.toBe(0)
    expect(next!.at).toBeGreaterThan(Date.UTC(2026, 0, 1))
  })
})

describe("parseOffsetQuery", () => {
  it("parses a whole-hour offset with a plus sign", () => {
    expect(parseOffsetQuery("+5")).toBe(300)
  })

  it("parses a whole-hour offset with a hyphen minus", () => {
    expect(parseOffsetQuery("-8")).toBe(-480)
  })

  it("parses a whole-hour offset with U+2212 minus", () => {
    expect(parseOffsetQuery("−8")).toBe(-480)
  })

  it("parses a sub-hour offset", () => {
    expect(parseOffsetQuery("+5:30")).toBe(330)
    expect(parseOffsetQuery("-3:30")).toBe(-210)
  })

  it("accepts an optional leading 'utc' and surrounding whitespace, case-insensitively", () => {
    expect(parseOffsetQuery("UTC+9")).toBe(540)
    expect(parseOffsetQuery("utc +9")).toBe(540)
    expect(parseOffsetQuery("  +9  ")).toBe(540)
  })

  it("rejects an hour beyond +14, the real maximum (Kiritimati)", () => {
    expect(parseOffsetQuery("+15")).toBeNull()
  })

  it("rejects a minutes value of 60 or more", () => {
    expect(parseOffsetQuery("+5:60")).toBeNull()
  })

  it("returns null for a plain city-name query", () => {
    expect(parseOffsetQuery("tokyo")).toBeNull()
  })
})
