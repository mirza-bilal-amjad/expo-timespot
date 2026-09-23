import cities from "../../assets/data/cities.min.json"
import type { City } from "../types"

/**
 * docs/10-implementation-plan.md task 1.8. Guards the invariants
 * scripts/build-cities.ts promises, so a bad rebuild fails CI instead of
 * shipping a broken dataset.
 */
describe("cities.min.json", () => {
  const typed = cities as City[]

  it("has exactly 5,000 cities", () => {
    expect(typed.length).toBe(5000)
  })

  it("has a unique slug per city", () => {
    const slugs = new Set(typed.map((c) => c.slug))
    expect(slugs.size).toBe(typed.length)
  })

  it("has a unique id per city", () => {
    const ids = new Set(typed.map((c) => c.id))
    expect(ids.size).toBe(typed.length)
  })

  it("gives every city a resolvable IANA zone", () => {
    for (const city of typed) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: city.zone })).not.toThrow()
    }
  })

  it("keeps every lat/lon within range", () => {
    for (const city of typed) {
      expect(city.lat).toBeGreaterThanOrEqual(-90)
      expect(city.lat).toBeLessThanOrEqual(90)
      expect(city.lon).toBeGreaterThanOrEqual(-180)
      expect(city.lon).toBeLessThanOrEqual(180)
    }
  })

  it("gives every city a positive population", () => {
    for (const city of typed) {
      expect(city.population).toBeGreaterThan(0)
    }
  })

  it("covers the majority of canonical IANA zones", () => {
    const covered = new Set(typed.map((c) => c.zone))
    const canonical = Intl.supportedValuesOf("timeZone")
    const ratio = covered.size / canonical.length
    // Not 100%: a handful of canonical zones (Antarctic research stations,
    // deprecated tzdata aliases GeoNames no longer uses, a few near-uninhabited
    // islands) have no real settlement to represent them. See build-cities.ts.
    expect(ratio).toBeGreaterThan(0.85)
  })

  it("covers every one of this project's DST fixture zones", () => {
    const covered = new Set(typed.map((c) => c.zone))
    const fixtureZones = [
      "Asia/Kathmandu",
      "Asia/Kolkata",
      "Australia/Eucla",
      "Pacific/Chatham",
      "Pacific/Kiritimati",
      "Pacific/Midway",
      "America/Los_Angeles",
      "Australia/Sydney",
      "Europe/London",
      "Asia/Tehran",
      "America/Santiago",
      "Africa/Cairo",
      "Asia/Shanghai",
      "Antarctica/Troll",
      "Europe/Lisbon",
      "Europe/Madrid",
      "America/St_Johns",
      "Asia/Jerusalem",
    ]
    // Three are among the documented gaps (Eucla and Midway have no real
    // settlement over ~1,000 people; Troll is an Antarctic base) — assert
    // real coverage, not 100%.
    const missing = fixtureZones.filter((z) => !covered.has(z)).sort()
    expect(missing).toEqual(["Antarctica/Troll", "Australia/Eucla", "Pacific/Midway"].sort())
  })
})
