import type { City, ZonedTime } from "../types"
import {
  citySpeechLabel,
  meridianValueText,
  spokenClock,
  spokenOffsetPhrase,
  spokenOffsetValue,
} from "./speech"

function makeTime(overrides: Partial<ZonedTime> = {}): ZonedTime {
  return {
    iso: "2026-06-15T01:40:00+09:00",
    hours: "01",
    minutes: "40",
    seconds: "00",
    meridiem: "AM",
    display: "01:40",
    offsetMinutes: 540,
    offsetLabel: "UTC+9",
    dateLabel: "Mon, 15 Jun",
    weekday: 1,
    isDay: false,
    dayOffset: 0,
    ...overrides,
  }
}

describe("spokenClock", () => {
  it("strips the leading zero and keeps the meridiem", () => {
    expect(spokenClock(makeTime({ hours: "01", minutes: "40", meridiem: "AM" }))).toBe("1:40 AM")
  })

  it("has no meridiem in 24h mode", () => {
    expect(spokenClock(makeTime({ hours: "13", minutes: "05", meridiem: undefined }))).toBe("13:05")
  })
})

describe("spokenOffsetPhrase", () => {
  it("is just 'UTC' at zero offset", () => {
    expect(spokenOffsetPhrase(0)).toBe("UTC")
  })

  it("says whole hours ahead/behind", () => {
    expect(spokenOffsetPhrase(540)).toBe("9 hours ahead of UTC")
    expect(spokenOffsetPhrase(-480)).toBe("8 hours behind UTC")
  })

  it("singularises a one-hour offset and includes minutes for sub-hour zones", () => {
    expect(spokenOffsetPhrase(60)).toBe("1 hour ahead of UTC")
    expect(spokenOffsetPhrase(345)).toBe("5 hours 45 minutes ahead of UTC") // Kathmandu
  })
})

describe("spokenOffsetValue", () => {
  it("is just 'UTC' at zero offset", () => {
    expect(spokenOffsetValue(0)).toBe("UTC")
  })

  it("matches docs/09-accessibility.md's own worked example", () => {
    expect(spokenOffsetValue(60)).toBe("UTC plus 1")
  })

  it("says minus for negative offsets", () => {
    expect(spokenOffsetValue(-240)).toBe("UTC minus 4")
  })

  it("renders sub-hour zones as h:mm", () => {
    expect(spokenOffsetValue(345)).toBe("UTC plus 5:45") // Kathmandu
    expect(spokenOffsetValue(-210)).toBe("UTC minus 3:30") // St Johns
  })
})

describe("citySpeechLabel", () => {
  it("matches docs/09-accessibility.md §1's own worked example", () => {
    const time = makeTime({ hours: "01", minutes: "40", meridiem: "AM", isDay: false })
    expect(citySpeechLabel("Tokyo", time)).toBe("Tokyo, 1:40 AM, night-time, 9 hours ahead of UTC")
  })
})

describe("meridianValueText", () => {
  it("matches docs/09-accessibility.md §2's own worked example, verbatim order", () => {
    const algiers: City = {
      id: "gn-2507480",
      slug: "algiers",
      name: "Algiers",
      country: "Algeria",
      countryCode: "DZ",
      zone: "Africa/Algiers",
      lat: 36.75,
      lon: 3.06,
      population: 2854000,
    }
    const time = makeTime({
      hours: "05",
      minutes: "40",
      meridiem: "PM",
      offsetMinutes: 60,
      offsetLabel: "UTC+1",
    })
    expect(meridianValueText(algiers, time)).toBe("UTC plus 1, Algiers, 5:40 PM")
  })
})
