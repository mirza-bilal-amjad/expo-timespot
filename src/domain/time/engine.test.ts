import tzOffsets from "../../assets/data/tz.offsets.json"
import { FIXTURE_ZONE_NAMES } from "../__fixtures__/zones"
import type { Prefs } from "../types"
import { probeTimeCapability } from "./capability"
import {
  configureTimeEngine,
  getTimeEngine,
  getZonedTime,
  intlOffsetMinutes,
  isInTableWindow,
  tableOffsetMinutes,
} from "./zone"

/**
 * docs/adr/0004: the degraded engine (bundled table) must give the same
 * answer as the primary (`Intl`) for every zone, at every instant in the
 * table's window — checked here against Node's full ICU, on both sides of
 * every transition the table records.
 */

const MINUTE = 60_000
const DAY = 86_400_000
const table = tzOffsets as { from: number; to: number; zones: Record<string, number[]> }
const zones = Object.keys(table.zones)

describe("the bundled offset table", () => {
  it("covers every zone, with a window reaching 2030", () => {
    expect(zones.length).toBeGreaterThan(400)
    expect(isInTableWindow(Date.UTC(2030, 11, 31))).toBe(true)
  })

  it.each(zones)("%s agrees with Intl around every transition and monthly", (zone) => {
    const entry = table.zones[zone]
    for (let i = 1; i < entry.length; i += 2) {
      const at = entry[i] * MINUTE
      expect(tableOffsetMinutes(at - MINUTE, zone)).toBe(intlOffsetMinutes(at - MINUTE, zone))
      expect(tableOffsetMinutes(at, zone)).toBe(intlOffsetMinutes(at, zone))
    }
    for (let at = table.from * MINUTE; at < table.to * MINUTE; at += 29 * DAY) {
      expect(tableOffsetMinutes(at, zone)).toBe(intlOffsetMinutes(at, zone))
    }
  })
})

describe("both engines produce identical ZonedTime", () => {
  const prefs: Prefs[] = [{ timeFormat: "24h" } as Prefs, { timeFormat: "12h" } as Prefs]
  const instants = [
    Date.UTC(2026, 2, 8, 6, 59, 59), // US spring-forward edge
    Date.UTC(2026, 2, 29, 1, 0, 0), // EU spring-forward
    Date.UTC(2026, 9, 4, 15, 30, 0), // AU/NZ spring-forward, Chatham
    Date.UTC(2027, 11, 31, 23, 59, 59), // year boundary
  ]

  afterEach(() => configureTimeEngine("full"))

  it.each(FIXTURE_ZONE_NAMES)("%s", (zone) => {
    for (const p of prefs) {
      for (const at of instants) {
        configureTimeEngine("full")
        const primary = getZonedTime(at, zone, p)
        configureTimeEngine("degraded")
        expect(getTimeEngine()).toBe("table")
        expect(getZonedTime(at, zone, p)).toEqual(primary)
      }
    }
  })
})

describe("forcing degraded end to end", () => {
  afterEach(() => configureTimeEngine("full"))

  it("a probe that sees timeZone ignored switches the app onto the table", () => {
    const capability = probeTimeCapability(() => "12")
    configureTimeEngine(capability)
    expect(getTimeEngine()).toBe("table")
    // Kathmandu +5:45 at 12:00 UTC is 17:45, straight from the table.
    const t = getZonedTime(Date.UTC(2026, 6, 1, 12), "Asia/Kathmandu", {
      timeFormat: "24h",
    } as Prefs)
    expect(t.display).toBe("17:45")
    expect(t.offsetLabel).toBe("UTC+5:45")
  })
})
